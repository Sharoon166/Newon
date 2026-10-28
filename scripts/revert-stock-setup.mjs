/**
 * Reverse the effects of setting the stock tracking start date.
 *
 * `initializeStockTracking` (Stock page -> "Set starting counts") does four
 * things to the database:
 *   1. purchases      - every purchase missing `receivedQuantity` gets
 *                       receivedQuantity = quantity (auto-received)
 *   2. invoices       - every type:"invoice" item missing `deliveredQuantity`
 *                       gets deliveredQuantity = quantity (auto-delivered)
 *   3. products       - every variant's inShop is set to the baseline count
 *                       (equals Available on the start date)
 *   4. stocktrackings - the tracking doc is marked initialized
 *   ... and one "opening" movement per variant is recorded in stockmovements.
 *
 * This script undoes ALL of that, returning the database to the
 * "stock tracking has never been set up" state:
 *   - unsets receivedQuantity on every purchase
 *   - unsets deliveredQuantity on every invoice item (type:"invoice" only)
 *   - zeroes every variant's inShop
 *   - deletes every kind:"opening" movement
 *   - resets the tracking doc to initialized:false, epoch 0
 *
 * THE HISTORY/audit entries and the tracking doc's own `history` array are
 * KEPT (that is why re-initializing can still be audited). Receive / deliver /
 * quick-count slips are never touched.
 *
 * SAFETY LOCK:
 * If any operational movement (receive / deliver / adjustment / reversal) has
 * been recorded since tracking was set up, plain inventory numbers can no
 * longer be derived from the backfill alone - undoing the setup would erase
 * that work from the stock state (the slips would remain in History but the
 * quantities they changed would reset). In that state the script REFUSES to
 * run unless you pass --force.
 *
 * Usage:
 *   pnpm db:revert-stock-setup              (asks for confirmation)
 *   pnpm db:revert-stock-setup -- --dry-run (read-only preview)
 *   pnpm db:revert-stock-setup -- --yes     (no confirmation prompt)
 *   ... append --force to override the "operational movements exist" guard.
 *
 * Reads MONGODB_URI from .env.local / .env, same as src/lib/db.ts.
 * Safe to run repeatedly. NOT safe to run while staff are working:
 * run revalidate-free steps in order, reload the Stock page at the end.
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

for (const path of ['.env.local', '.env']) {
  if (existsSync(path)) {
    config({ path, quiet: true });
    break;
  }
}

const yes = process.argv.includes('--yes');
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory';

console.log(`\nDatabase: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}\n`);

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection.db;
const existing = new Set((await db.listCollections().toArray()).map(c => c.name));

const purchases = db.collection('purchases');
const invoices = db.collection('invoices');
const products = db.collection('products');
const movements = db.collection('stockmovements');
const tracking = db.collection('stocktrackings');

// ---------------------------------------------------------------------------
// 1. Inspect the current state
// ---------------------------------------------------------------------------
const trackingDoc = await tracking.findOne({});
const initialized = trackingDoc?.initialized === true;

if (!existing.has('stocktrackings') || !trackingDoc) {
  console.log('No stock tracking document found - nothing was ever set up. Aborted.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log('Current tracking state:');
console.log(`  initialized : ${trackingDoc.initialized}`);
console.log(`  startedAt   : ${trackingDoc.startedAt instanceof Date ? trackingDoc.startedAt.toISOString() : trackingDoc.startedAt}`);
console.log(`  epoch       : ${trackingDoc.currentEpoch ?? 0}\n`);

if (!initialized) {
  console.log('Stock tracking is NOT initialized - there is nothing to revert. Aborted.');
  await mongoose.disconnect();
  process.exit(0);
}

const [purchasesToUnset, invoicesToUnset, openingMovements, operationalMovements] = await Promise.all([
  purchases.countDocuments({ receivedQuantity: { $exists: true } }),
  invoices.countDocuments({ type: 'invoice', 'items.deliveredQuantity': { $exists: true } }),
  movements.countDocuments({ kind: 'opening' }),
  movements.countDocuments({ kind: { $in: ['receive', 'deliver', 'adjustment', 'reversal'] } })
]);

console.log('Preview of what would be reverted:');
console.log(`  purchases with receivedQuantity ........ ${purchasesToUnset}`);
console.log(`  invoices with deliveredQuantity ........ ${invoicesToUnset}`);
console.log(`  "opening" movements to delete .......... ${openingMovements}`);
console.log(`  inShop counts would reset to 0 ......... yes (all variants)`);
console.log(`  tracking doc would reset to initialized:false, epoch 0\n`);

if (dryRun) {
  console.log('Dry run - nothing was modified.');
  await mongoose.disconnect();
  process.exit(0);
}

if (operationalMovements > 0 && !force) {
  console.log(
    `REFUSING TO RUN: ${operationalMovements} operational movement(s) (receive / deliver / adjustment / reversal)\n` +
      'were recorded in History. Reverting the start date would reset every quantity they\n' +
      'changed, so the slips in History would no longer match reality.\n\n' +
      'If you understand that and still want to proceed, re-run with --force.\n' +
      'After a forced revert, use the Quick Count tab to re-establish "In shop".'
  );
  await mongoose.disconnect();
  process.exit(1);
}

if (!yes) {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Type REVERT to undo the starting counts: ');
  rl.close();
  if (answer.trim() !== 'REVERT') {
    console.log('Aborted.');
    await mongoose.disconnect();
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// 2. Revert, in the same field areas the setup touched
// ---------------------------------------------------------------------------

// 2a. Purchases -> "everything auto-received".
const purchasesResult = await purchases.updateMany(
  { receivedQuantity: { $exists: true } },
  { $unset: { receivedQuantity: '' } }
);

// 2b. Invoices -> "everything auto-delivered". The positional-all operator
// `$[]` removes the field from every item of each invoice document.
const invoicesResult = await invoices.updateMany(
  { type: 'invoice', 'items.deliveredQuantity': { $exists: true } },
  { $unset: { 'items.$[].deliveredQuantity': '' } }
);

// 2c. Products -> "In shop" goes back to its pre-tracking value (0). The
// schema defaults the field to 0, and the uninitialized UI treats it as 0.
const productsResult = await products.updateMany(
  { 'variants.inShop': { $exists: true, $ne: 0 } },
  { $set: { 'variants.$[].inShop': 0 } }
);

// 2d. Opening movements are baseline artifacts - the app itself deletes all
// of them when re-running setup, so this matches its own reinit contract.
const movementsResult = await movements.deleteMany({ kind: 'opening' });

// 2e. Tracking doc -> back to "never initialized". `history` (the audit of
// when start dates were set) is deliberately kept.
await tracking.updateOne(
  { _id: trackingDoc._id },
  {
    $set: { initialized: false, currentEpoch: 0, startedAt: new Date(), status: 'idle' },
    $unset: { initializedBy: '', initializedByName: '' }
  }
);

console.log('\nResult:');
console.log(`  purchases : unset receivedQuantity on ${purchasesResult.modifiedCount} document(s)`);
console.log(`  invoices  : unset deliveredQuantity on items of ${invoicesResult.modifiedCount} document(s)`);
console.log(`  products  : reset inShop to 0 on ${productsResult.modifiedCount} document(s)`);
console.log(`  movements : deleted ${movementsResult.deletedCount} "opening" slip(s)`);
console.log('  tracking  : initialized -> false, epoch -> 0 (start-date history kept)');

// ---------------------------------------------------------------------------
// 3. Verify the end state
// ---------------------------------------------------------------------------
const [checkTracking, checkPurchases, checkInvoices, checkOpening] = await Promise.all([
  tracking.findOne({}),
  purchases.countDocuments({ receivedQuantity: { $exists: true } }),
  invoices.countDocuments({ type: 'invoice', 'items.deliveredQuantity': { $exists: true } }),
  movements.countDocuments({ kind: 'opening' })
]);

console.log('\nVerification:');
console.log(`  tracking.initialized ... ${checkTracking.initialized}`);
console.log(`  purchases w/ recvQty ... ${checkPurchases}`);
console.log(`  invoices w/ delivQty ... ${checkInvoices}`);
console.log(`  opening movements ...... ${checkOpening}`);

const ok = checkTracking.initialized === false && checkPurchases === 0 && checkInvoices === 0 && checkOpening === 0;
console.log(ok ? '\nAll checks passed - stock tracking is back to "not initialized".' : '\nWARNING: some checks did NOT pass - inspect the numbers above.');

await mongoose.disconnect();
if (!ok) process.exit(1);
console.log('\nDone.\n');
