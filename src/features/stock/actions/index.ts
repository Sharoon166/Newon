'use server';

import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import InvoiceModel from '@/models/Invoice';
import ProductModel from '@/models/Product';
import StockMovementModel from '@/models/StockMovement';
import StockTrackingModel from '@/models/StockTracking';
import { generateId } from '@/models/Counter';
import { assertPermission } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import {
  deliverableItemMongoExpr,
  isDeliverableItem,
  isVirtualItem
} from '@/features/invoices/utils/deliverable-items';
import type { InvoiceItem } from '@/features/invoices/types';
import type {
  AwaitingArrivalItem,
  AwaitingDeliveryComponent,
  AwaitingDeliveryItem,
  DeliverInvoiceInput,
  InShopRow,
  PaginatedStock,
  QuickCountInput,
  ReceivePurchaseInput,
  StockActionResult,
  StockChallanData,
  StockChallanKind,
  StockChallanLine,
  StockMovement,
  StockMovementKind,
  StockTrackingStatus,
  StockWorkCounts,
  AwaitingDeliveryItemLine
} from '../types';

// ---------------------------------------------------------------------------
// Lean shapes
// ---------------------------------------------------------------------------

/**
 * The mongoose lean results for Product don't reliably expose `name`/`variants`
 * (the inferred type is a `FlattenMaps<any>` intersection / array union), so
 * the stock actions cast through `unknown` to this explicit shape instead of
 * fighting the inferred type at every access site.
 */
interface LeanProductVariant {
  id: string;
  sku?: string;
  inShop?: number;
  attributes?: Record<string, string>;
  disabled?: boolean;
}

interface LeanProduct {
  name: string;
  variants?: LeanProductVariant[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_STOCK_PATHS = ['/stock'];

function revalidateStock(paths: string[] = ALL_STOCK_PATHS) {
  paths.forEach(p => revalidatePath(p));
  revalidatePath('/purchases');
  revalidatePath('/invoices');
  revalidatePath('/inventory');
}

function serializeMovement(doc: any): StockMovement {
  return {
    id: String(doc._id),
    movementId: doc.movementId,
    kind: doc.kind,
    productId: doc.productId,
    variantId: doc.variantId,
    productName: doc.productName,
    sku: doc.sku,
    quantity: doc.quantity,
    inShopBefore: doc.inShopBefore ?? 0,
    inShopAfter: doc.inShopAfter ?? 0,
    purchaseId: doc.purchaseId,
    purchaseNumber: doc.purchaseNumber,
    invoiceId: doc.invoiceId,
    invoiceNumber: doc.invoiceNumber,
    customerName: doc.customerName,
    lines: doc.lines ?? [],
    note: doc.note ?? '',
    userId: doc.userId,
    userName: doc.userName,
    reversalOf: doc.reversalOf,
    reversedByMovementId: doc.reversedByMovementId,
    reversed: doc.reversed ?? false,
    epoch: doc.epoch ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt)
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000;
}

async function getTrackingDoc() {
  await dbConnect();
  const doc = await StockTrackingModel.findOne({}).sort({ _id: 1 }).lean();
  return doc as {
    initialized?: boolean;
    startedAt?: Date;
    currentEpoch?: number;
    status?: string;
    history?: Array<{ epoch: number; date: Date; changedAt: Date; changedBy?: string; changedByName?: string }>;
  } | null;
}

async function buildSearchText(parts: Array<string | undefined>): Promise<string> {
  return parts
    .filter((p): p is string => !!p)
    .join(' ')
    .toLowerCase();
}

/**
 * Mongo `$expr` that sums `quantity - deliveredQuantity` over the invoice's
 * deliverable lines only: custom lines carry no stock and never leave the shop,
 * so counting them would leave an invoice permanently "awaiting delivery".
 *
 * Shared by `getStockWorkCounts` (the tab badge) and `getAwaitingDelivery`
 * (the tab itself) so the two can never disagree.
 */
function pendingDeliverySumExpr(): Record<string, unknown> {
  return {
    $sum: {
      $map: {
        input: { $ifNull: ['$items', []] },
        as: 'i',
        in: {
          $cond: [
            deliverableItemMongoExpr('$$i'),
            { $subtract: [{ $ifNull: ['$$i.quantity', 0] }, { $ifNull: ['$$i.deliveredQuantity', 0] }] },
            0
          ]
        }
      }
    }
  };
}

/**
 * A failure that has to unwind through a rollback but whose message is written
 * for the user (a stock shortage is the only one). The surrounding `catch`
 * recognises it and returns the wording verbatim; anything else is a genuine
 * fault and gets logged server-side instead of forwarded.
 *
 * Only needed where an error must travel *out* of a `try` that has cleanup to
 * do. Everywhere else the action returns `{ success: false }` directly at the
 * point the problem is detected.
 */
class ExpectedStockError extends Error {}

/**
 * Turn a caught error into a failure result the client can safely display.
 *
 * Server-side error text must never reach the browser - production builds
 * redact it anyway, and what survives is a stack-less string with no meaning
 * to the person waiting on the toast. So only errors we authored ourselves are
 * passed through; everything else is logged here and replaced by `fallback`.
 */
function toFailure(error: unknown, fallback: string): StockActionResult {
  if (error instanceof ExpectedStockError) {
    return { success: false, error: error.message };
  }
  console.error('[stock]', error);
  return { success: false, error: fallback };
}

/**
 * The single place that decides whether an invoice line can become a stock
 * movement, and - when it cannot - the sentence the user should read.
 *
 * A movement document requires `productId`, `productName`, `sku` and `variantId`.
 * A virtual product is the one legitimate exception to `variantId`, because its
 * units are its components rather than a variant of its own. Anything else here
 * is a malformed row, and both failure modes are worse than refusing: the schema
 * rejects the save (visible only as a generic error), or - in the missing
 * breakdown case - the line is recorded while *nothing* leaves stock and the
 * user is told the delivery succeeded.
 *
 * Returns `null` when the line can be delivered.
 */
function undeliverableReason(item: InvoiceItem): string | null {
  const name = item.productName || 'This invoice line';

  if (!item.productId) {
    return `'${name}' has no product on this invoice, so there is no stock behind it.`;
  }
  if (!item.variantSKU) {
    return `'${name}' has no SKU on this invoice, so it cannot be recorded as a stock movement.`;
  }

  if (isVirtualItem(item)) {
    return item.componentBreakdown?.length
      ? null
      : `'${name}' has no component breakdown on this invoice, so there is no stock to take for it.`;
  }

  return item.variantId
    ? null
    : `'${name}' has no stock variant on this invoice, so there is no stock to take for it.`;
}

// ---------------------------------------------------------------------------
// Status / initialization
// ---------------------------------------------------------------------------

export async function getStockTrackingStatus(): Promise<StockTrackingStatus> {
  const doc = await getTrackingDoc();
  return {
    initialized: !!doc?.initialized,
    startedAt: doc?.startedAt ? new Date(doc.startedAt).toISOString() : undefined,
    currentEpoch: doc?.currentEpoch ?? 0
  };
}

/**
 * Lightweight counts for the tab badges. Reuses the exact pending-item
 * queries the "Awaiting arrival" / "Awaiting delivery" tabs paginate
 * against, without the populate/mapping overhead.
 */
export async function getStockWorkCounts(): Promise<StockWorkCounts> {
  await dbConnect();

  const arrivalQuery = {
    $expr: { $gt: [{ $subtract: ['$quantity', { $ifNull: ['$receivedQuantity', '$quantity'] }] }, 0] }
  };
  const deliveryQuery = {
    type: 'invoice',
    status: { $ne: 'cancelled' },
    $expr: {
      $gt: [pendingDeliverySumExpr(), 0]
    }
  };

  const [arrival, delivery] = await Promise.all([
    PurchaseModel.countDocuments(arrivalQuery),
    InvoiceModel.countDocuments(deliveryQuery)
  ]);

  return { arrival, delivery };
}

/**
 * Set (or re-set) the start date. On the chosen date "In shop" is set equal to
 * the current Available numbers, every existing purchase is marked as received
 * and every existing invoice as delivered (that is the world as the old system
 * saw it). Afterwards the staff can correct any product with a quick count and
 * new purchases/invoices start pending.
 *
 * Safe to run repeatedly: if tracking is already live, the previous baseline is
 * closed out first - its opening movements are deleted and `currentEpoch` is
 * incremented - then a fresh baseline is written. Receive/deliver/quick-count
 * history and the purchase/invoice records themselves are never touched.
 * A `status` lock stops two admins running it at the same time.
 */
export async function initializeStockTracking(startedAtISO?: string): Promise<StockActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  if (session.user?.role !== 'admin') {
    return { success: false, error: 'Only an admin can set the starting counts.' };
  }

  const startedAt = startedAtISO ? new Date(startedAtISO) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    return { success: false, error: 'Invalid start date.' };
  }

  // Ensure the single tracking doc exists, then acquire the re-set lock.
  await StockTrackingModel.updateOne(
    {},
    { $setOnInsert: { initialized: false, startedAt, currentEpoch: 0, status: 'idle', history: [] } },
    { upsert: true }
  );

  const locked = (await StockTrackingModel.findOneAndUpdate(
    { status: { $ne: 'reinitializing' } },
    { $set: { status: 'reinitializing' } },
    { new: true }
  ).lean()) as {
    initialized?: boolean;
    currentEpoch?: number;
    startedAt?: Date;
    history?: Array<{ epoch: number; date: Date; changedAt: Date; changedBy?: string; changedByName?: string }>;
  } | null;

  if (!locked) {
    return { success: false, error: 'Starting counts are already being set. Wait a moment and try again.' };
  }

  const isReSet = !!locked.initialized;
  const epoch = isReSet ? (locked.currentEpoch ?? 0) + 1 : 0;

  try {
    // Re-set: close the previous epoch. Openings are baseline artifacts and are
    // removed so History doesn't accumulate stale starting counts. Operational
    // movements (receive / deliver / quick count) are deliberately kept.
    if (isReSet) {
      await StockMovementModel.deleteMany({ kind: 'opening' });
    }

    // 1. Backfill purchases that predate tracking: everything is fully received.
    await PurchaseModel.updateMany({ receivedQuantity: { $exists: false } }, [
      { $set: { receivedQuantity: '$quantity' } }
    ]);

    // 2. Backfill invoices that predate tracking: everything is fully delivered.
    await InvoiceModel.updateMany({ type: 'invoice' }, [
      {
        $set: {
          items: {
            $map: {
              input: { $ifNull: ['$items', []] },
              as: 'i',
              in: {
                $mergeObjects: ['$$i', { deliveredQuantity: { $ifNull: ['$$i.deliveredQuantity', '$$i.quantity'] } }]
              }
            }
          }
        }
      }
    ]);

    // 3. Compute current Available per variant (= sum of purchase.remaining).
    const availableAgg = await PurchaseModel.aggregate([
      {
        $group: {
          _id: { productId: '$productId', variantId: '$variantId' },
          available: { $sum: { $ifNull: ['$remaining', 0] } }
        }
      }
    ]);
    const availableMap = new Map<string, number>();
    availableAgg.forEach(entry => {
      availableMap.set(`${String(entry._id.productId)}|${entry._id.variantId}`, entry.available);
    });

    // 4. Set variants[].inShop = Available on the start date.
    const products = await ProductModel.find({}).select('_id name variants').lean();
    const openingMovements: Array<Record<string, unknown>> = [];
    for (const product of products) {
      const productName = (product as unknown as LeanProduct).name;
      const variants = (product as { variants?: Array<any> }).variants ?? [];
      if (variants.length === 0) continue;
      const updatedVariants = variants.map(v => {
        const baseline = availableMap.get(`${String(product._id)}|${v.id}`) ?? 0;
        openingMovements.push({
          movementId: `OPEN-${Math.random().toString(36).slice(2, 10)}`,
          kind: 'opening',
          epoch,
          productId: String(product._id),
          variantId: v.id,
          productName,
          sku: v.sku ?? '',
          quantity: baseline,
          inShopBefore: 0,
          inShopAfter: baseline,
          note: 'Starting count (equals Available on start date)',
          searchText: `${productName} ${v.sku ?? ''} starting count opening`.toLowerCase()
        });
        return { ...v, inShop: baseline };
      });
      await ProductModel.updateOne({ _id: product._id }, { $set: { variants: updatedVariants } });
    }

    // 5. Persist opening movements (audit trail of the baseline).
    if (openingMovements.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < openingMovements.length; i += chunkSize) {
        await StockMovementModel.insertMany(openingMovements.slice(i, i + chunkSize), { ordered: false });
      }
    }

    // 6. Persist the baseline, record it in history and release the lock.
    const history = [
      ...(locked.history ?? []),
      {
        epoch,
        date: startedAt,
        changedAt: new Date(),
        changedBy: session.user?.id,
        changedByName: session.user?.name
      }
    ];

    await StockTrackingModel.updateOne(
      {},
      {
        $set: {
          initialized: true,
          startedAt,
          currentEpoch: epoch,
          status: 'idle',
          initializedBy: session.user?.id,
          initializedByName: session.user?.name,
          history
        }
      }
    );
  } catch (error) {
    // Never leave the lock stuck if a step fails partway through.
    await StockTrackingModel.updateOne({}, { $set: { status: 'idle' } });
    return toFailure(error, 'Failed to set starting counts.');
  }

  revalidateStock();
  return { success: true, data: {} };
}

// ---------------------------------------------------------------------------
// In shop snapshot
// ---------------------------------------------------------------------------

export async function getInShopRows(search?: string): Promise<InShopRow[]> {
  await dbConnect();

  const productQuery: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    productQuery.$or = [{ name: regex }, { 'variants.sku': regex }];
  }

  const products = await ProductModel.find(productQuery).select('name variants').lean();

  const [availableAgg, arriveAgg] = await Promise.all([
    PurchaseModel.aggregate([
      {
        $group: {
          _id: { productId: '$productId', variantId: '$variantId' },
          available: { $sum: { $ifNull: ['$remaining', 0] } }
        }
      }
    ]),
    PurchaseModel.aggregate([
      {
        $group: {
          _id: { productId: '$productId', variantId: '$variantId' },
          toArrive: {
            $sum: {
              $subtract: ['$quantity', { $ifNull: ['$receivedQuantity', '$quantity'] }]
            }
          }
        }
      }
    ])
  ]);

  const availableMap = new Map<string, number>();
  availableAgg.forEach(e => availableMap.set(`${String(e._id.productId)}|${e._id.variantId}`, e.available));
  const arriveMap = new Map<string, number>();
  arriveAgg.forEach(e => arriveMap.set(`${String(e._id.productId)}|${e._id.variantId}`, e.toArrive));

  const rows: InShopRow[] = [];
  for (const product of products) {
    const productName = (product as unknown as LeanProduct).name;
    const variants = (product as { variants?: Array<any> }).variants ?? [];
    for (const v of variants) {
      const key = `${String(product._id)}|${v.id}`;
      rows.push({
        productId: String(product._id),
        variantId: v.id,
        productName,
        sku: v.sku ?? '',
        attributes: v.attributes ?? {},
        disabled: v.disabled ?? false,
        available: availableMap.get(key) ?? 0,
        inShop: v.inShop ?? 0,
        toArrive: arriveMap.get(key) ?? 0
      });
    }
  }

  return rows;
}

export async function getAwaitingArrival(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedStock<AwaitingArrivalItem>> {
  await dbConnect();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 15));

  const query: Record<string, unknown> = {
    $expr: {
      $gt: [{ $subtract: ['$quantity', { $ifNull: ['$receivedQuantity', '$quantity'] }] }, 0]
    }
  };
  if (input.search) {
    const regex = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const or: Record<string, unknown>[] = [{ purchaseId: regex }, { supplier: regex }];

    // Product name lives on the Product document, not on the purchase, so
    // resolve the matching products first and search purchases by their ids
    // (indexed on productId) instead of joining at query time.
    const matchingProducts = await ProductModel.find({ name: regex }).select('_id').lean();
    if (matchingProducts.length > 0) {
      or.push({ productId: { $in: matchingProducts.map(product => product._id) } });
    }

    query.$or = or;
  }

  const [docs, total] = await Promise.all([
    PurchaseModel.find(query)
      .sort({ purchaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'productId', select: 'name variants' })
      .lean(),
    PurchaseModel.countDocuments(query)
  ]);

  const items: AwaitingArrivalItem[] = docs.map((doc: any) => {
    const variant = doc.productId?.variants?.find((v: any) => v.id === doc.variantId);
    const received = doc.receivedQuantity ?? doc.quantity;
    return {
      id: String(doc._id),
      purchaseId: doc.purchaseId || 'N/A',
      productName: doc.productId?.name || 'Unknown',
      sku: variant?.sku || doc.variantId,
      supplier: doc.supplier || '',
      purchaseDate: doc.purchaseDate?.toISOString?.() || String(doc.purchaseDate),
      ordered: doc.quantity,
      received,
      pending: Math.max(0, doc.quantity - received)
    };
  });

  return { docs: items, total, page, limit };
}

/**
 * Map one raw invoice item onto an awaiting-delivery line, or `null` when the
 * line is not deliverable (custom/hand-typed entries - there is no stock behind
 * them, so they never appear in the tab, the badge or the delivery card).
 *
 * Virtual products are expanded into their components: those are the physical
 * units that leave the shop, each tagged with the purchase batch it was
 * allocated from, so the reader can see exactly what has to go out.
 */
function buildDeliveryLine(item: any, index: number): AwaitingDeliveryItemLine | null {
  if (!isDeliverableItem(item)) return null;

  const quantity = item.quantity ?? 0;
  const delivered = Math.min(quantity, item.deliveredQuantity ?? 0);
  const pending = Math.max(0, quantity - delivered);

  const line: AwaitingDeliveryItemLine = {
    index,
    productName: item.productName || 'Unknown',
    sku: item.variantSKU,
    unit: item.unit || 'pcs',
    quantity,
    delivered,
    pending
  };

  if (isVirtualItem(item) && Array.isArray(item.componentBreakdown) && item.componentBreakdown.length > 0) {
    // The breakdown is stored for the whole line, so the part still to ship is
    // the same proportion of each batch as the line's own pending ratio.
    const shippedRatio = quantity > 0 ? delivered / quantity : 0;
    line.components = item.componentBreakdown.map((comp: any): AwaitingDeliveryComponent => {
      const reserved = comp.quantity ?? 0;
      const alreadyShipped = Math.min(reserved, Math.round(reserved * shippedRatio));
      return {
        productId: comp.productId,
        variantId: comp.variantId,
        productName: comp.productName || 'Unknown',
        sku: comp.sku,
        reserved,
        pending: Math.max(0, reserved - alreadyShipped),
        purchaseId: comp.purchaseId
      };
    });
  }

  return line;
}

export async function getAwaitingDelivery(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedStock<AwaitingDeliveryItem>> {
  await dbConnect();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 15));

  const query: Record<string, unknown> = {
    type: 'invoice',
    status: { $ne: 'cancelled' },
    $expr: {
      $gt: [pendingDeliverySumExpr(), 0]
    }
  };
  if (input.search) {
    const regex = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ invoiceNumber: regex }, { customerName: regex }, { customerCompany: regex }];
  }

  const [docs, total] = await Promise.all([
    InvoiceModel.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InvoiceModel.countDocuments(query)
  ]);

  const items: AwaitingDeliveryItem[] = [];
  for (const doc of docs as any[]) {
    const rawItems: any[] = doc.items ?? [];
    const lines: AwaitingDeliveryItemLine[] = rawItems
      .map((item, index) => buildDeliveryLine(item, index))
      .filter((line): line is AwaitingDeliveryItemLine => line !== null && line.pending > 0);

    if (lines.length === 0) continue;

    items.push({
      id: String(doc._id),
      invoiceNumber: doc.invoiceNumber || 'N/A',
      customerName: doc.customerName || '',
      customerCompany: doc.customerCompany,
      date: doc.date instanceof Date ? doc.date.toISOString() : String(doc.date),
      status: doc.status,
      lines,
      totalInvoiced: lines.reduce((s, l) => s + l.quantity, 0),
      totalDelivered: lines.reduce((s, l) => s + l.delivered, 0),
      totalPending: lines.reduce((s, l) => s + l.pending, 0)
    });
  }

  return { docs: items, total, page, limit };
}

/**
 * Delivery state for a single invoice - unlike `getAwaitingDelivery` this also
 * returns lines that are already fully delivered, so a detail page can show the
 * complete picture ("3 of 5 delivered") instead of only what is outstanding.
 */
export async function getInvoiceDeliveryState(invoiceId: string): Promise<AwaitingDeliveryItem | null> {
  await dbConnect();
  const invoice = (await InvoiceModel.findById(invoiceId).lean()) as any;
  if (!invoice) return null;

  // Fully delivered lines are kept (this is the "complete picture" view), but
  // custom lines are dropped - same rule as the tab, so the card, the badge and
  // the Stock page always tell the same story.
  const lines: AwaitingDeliveryItemLine[] = ((invoice.items ?? []) as any[])
    .map((item, index) => buildDeliveryLine(item, index))
    .filter((line): line is AwaitingDeliveryItemLine => line !== null);

  return {
    id: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber || 'N/A',
    customerName: invoice.customerName || '',
    customerCompany: invoice.customerCompany,
    date: invoice.date instanceof Date ? invoice.date.toISOString() : String(invoice.date ?? ''),
    status: invoice.status,
    lines,
    totalInvoiced: lines.reduce((s, l) => s + l.quantity, 0),
    totalDelivered: lines.reduce((s, l) => s + l.delivered, 0),
    totalPending: lines.reduce((s, l) => s + l.pending, 0)
  };
}

export async function getStockMovements(input: {
  page?: number;
  limit?: number;
  search?: string;
  kind?: StockMovementKind | 'all';
  ids?: string[];
}): Promise<PaginatedStock<StockMovement>> {
  await dbConnect();
  const page = Math.max(1, input.page ?? 1);
  // The print page asks for the whole history in one go, so the cap is generous;
  // the paginated tabs always request far less than this.
  const limit = Math.min(1000, Math.max(1, input.limit ?? 15));

  const query: Record<string, unknown> = {};
  if (input.kind && input.kind !== 'all') query.kind = input.kind;
  if (input.ids?.length) {
    query._id = { $in: input.ids };
  }
  if (input.search) {
    const regex = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { movementId: regex },
      { productName: regex },
      { sku: regex },
      { searchText: regex },
      { invoiceNumber: regex },
      { purchaseNumber: regex },
      { userName: regex }
    ];
  }

  const [docs, total] = await Promise.all([
    StockMovementModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StockMovementModel.countDocuments(query)
  ]);

  return {
    docs: docs.map(doc => serializeMovement(doc)),
    total,
    page,
    limit
  };
}

// ---------------------------------------------------------------------------
// Challans (stock in / stock out / adjustment / batched starting counts)
// ---------------------------------------------------------------------------

/** Only the fields the printable challan renders - keeps the payload small. */
const CHALLAN_MOVEMENT_FIELDS =
  'movementId kind productName sku quantity inShopBefore inShopAfter purchaseId purchaseNumber invoiceId invoiceNumber customerName lines note reversalOf epoch createdAt';

const CHALLAN_TITLE: Record<string, string> = {
  receive: 'STOCK IN CHALLAN',
  deliver: 'STOCK OUT CHALLAN',
  adjustment: 'ADJUSTMENT CHALLAN',
  opening: 'STARTING COUNT CHALLAN',
  reversal: 'REVERSAL CHALLAN'
};

const CHALLAN_KIND: Record<string, StockChallanKind> = {
  receive: 'in',
  deliver: 'out',
  adjustment: 'adjustment',
  opening: 'opening',
  reversal: 'reversal'
};

/**
 * Data for the printable challan of a single History slip.
 *
 * Deliberately cheap: one projected lookup for the slip plus at most two
 * parallel projected lookups for party/rate context (the linked purchase
 * and/or invoice, so Rate + Amount can be filled in) and - for starting
 * counts - one query that returns the whole batch instead of one challan per
 * product.
 */
export async function getStockChallan(input: { movementId: string }): Promise<StockChallanData | null> {
  await dbConnect();

  const movement = (await StockMovementModel.findOne({ movementId: input.movementId })
    .select(CHALLAN_MOVEMENT_FIELDS)
    .lean()) as any;
  if (!movement) return null;

  const kind = CHALLAN_KIND[movement.kind];
  if (!kind) return null;

  // Party + rate context: only when the slip points at a purchase / invoice,
  // both issued together so the dialog waits on a single round trip.
  const purchaseQuery =
    movement.purchaseId && (kind === 'in' || kind === 'reversal')
      ? (PurchaseModel.findById(movement.purchaseId).select('supplier unitPrice').lean() as Promise<any>)
      : Promise.resolve(null);
  const invoiceQuery =
    movement.invoiceId && (kind === 'out' || kind === 'reversal')
      ? (InvoiceModel.findById(movement.invoiceId)
          .select(
            'market customerName customerCompany customerAddress customerCity customerPhone items.unitPrice items.purchaseId'
          )
          .lean() as Promise<any>)
      : Promise.resolve(null);

  const [purchase, invoice] = await Promise.all([purchaseQuery, invoiceQuery]);

  const createdAt = movement.createdAt instanceof Date ? movement.createdAt.toISOString() : String(movement.createdAt);
  const invoiceItems: any[] = invoice?.items ?? [];
  const totalQty = (lines: StockChallanLine[]) => lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const client = {
    name: movement.customerName || invoice?.customerName || purchase?.supplier || '',
    company: invoice?.customerCompany,
    address: invoice ? [invoice.customerAddress, invoice.customerCity].filter(Boolean).join(', ') : undefined,
    phone: invoice?.customerPhone || ''
  };

  // Rates: the invoice item first (stock out / reversal of a delivery),
  // otherwise the purchase unit price (stock in / reversal of a receipt).
  const rateFor = (line: any): number | undefined => {
    const item = line?.itemIndex !== undefined ? invoiceItems[line.itemIndex] : undefined;
    if (item?.unitPrice !== undefined) return item.unitPrice;
    if (!invoice && purchase?.unitPrice !== undefined) return purchase.unitPrice;
    return undefined;
  };

  const buildLines = (): StockChallanLine[] => {
    const raw: any[] = movement.lines?.length
      ? movement.lines
      : [{ productName: movement.productName, sku: movement.sku, quantity: movement.quantity }];
    return raw.map(line => {
      // Invoice lines are stored per batch, so the same product can appear
      // several times - name the purchase each row came out of.
      const item = line?.itemIndex !== undefined ? invoiceItems[line.itemIndex] : undefined;
      return {
        description: line.productName,
        note: [
          line.sku,
          item?.purchaseId ? `Purchase No. ${item.purchaseId}` : '',
          line.components?.length
            ? `= ${line.components.map((c: any) => `${c.quantity} × ${c.productName}`).join(', ')}`
            : ''
        ]
          .filter(Boolean)
          .join('  '),
        quantity: line.quantity,
        rate: rateFor(line)
      };
    });
  };

  if (kind === 'opening') {
    // Batched: every starting count of this epoch on one challan.
    const epoch = movement.epoch ?? 0;
    const batch = (await StockMovementModel.find({ kind: 'opening', epoch })
      .select('productName sku quantity')
      .sort({ productName: 1, sku: 1 })
      .lean()) as any[];

    return {
      kind,
      title: CHALLAN_TITLE.opening,
      challanNumber: `OPENING-${epoch}`,
      date: createdAt,
      reference: { label: 'Entries', value: `${batch.length} product${batch.length === 1 ? '' : 's'}` },
      market: 'newon',
      client: { name: '' },
      lines: batch.map(doc => ({ description: doc.productName, note: doc.sku, quantity: doc.quantity ?? 0 })),
      totalQuantity: batch.reduce((sum, doc) => sum + (doc.quantity ?? 0), 0),
      showContact: false,
      note: movement.note,
      batchCount: batch.length
    };
  }

  if (kind === 'adjustment') {
    return {
      kind,
      title: CHALLAN_TITLE.adjustment,
      challanNumber: movement.movementId,
      date: createdAt,
      market: 'newon',
      client: { name: '' },
      lines: [
        {
          description: movement.productName,
          note: `${movement.sku}  ·  in shop ${movement.inShopBefore} → ${movement.inShopAfter}`,
          quantity: movement.quantity
        }
      ],
      showContact: false,
      note: movement.note
    };
  }

  if (kind === 'in') {
    const lines = buildLines();
    return {
      kind,
      title: CHALLAN_TITLE.receive,
      challanNumber: movement.movementId,
      date: createdAt,
      reference: movement.purchaseNumber ? { label: 'Purchase No.', value: movement.purchaseNumber } : undefined,
      market: 'newon',
      client: { name: purchase?.supplier ?? '' },
      lines,
      totalQuantity: totalQty(lines),
      // Stock in carries no party address / phone block on the form.
      showContact: false,
      note: movement.note
    };
  }

  if (kind === 'reversal') {
    const lines = buildLines();
    const hasDoc = !!(movement.invoiceNumber || movement.purchaseNumber);
    return {
      kind,
      title: CHALLAN_TITLE.reversal,
      challanNumber: movement.movementId,
      date: createdAt,
      reference: movement.invoiceNumber
        ? { label: 'Inv. No.', value: movement.invoiceNumber }
        : movement.purchaseNumber
          ? { label: 'Purchase No.', value: movement.purchaseNumber }
          : { label: 'Reversal of', value: movement.reversalOf ?? movement.movementId },
      market: invoice?.market ?? 'newon',
      client,
      lines,
      totalQuantity: totalQty(lines),
      showContact: !!invoice,
      // Skip the note when the reference field already names the original slip.
      note: hasDoc ? movement.note : undefined
    };
  }

  // Stock out (a delivery slip with no invoice linked - invoice-backed
  // deliveries keep their own stock out challan, printed from the invoice).
  const lines = buildLines();
  return {
    kind: 'out',
    title: CHALLAN_TITLE.deliver,
    challanNumber: movement.movementId,
    date: createdAt,
    reference: movement.invoiceNumber ? { label: 'Inv. No.', value: movement.invoiceNumber } : undefined,
    market: invoice?.market ?? 'newon',
    client,
    lines,
    totalQuantity: totalQty(lines),
    showContact: !!invoice,
    note: movement.note
  };
}

// ---------------------------------------------------------------------------
// Receive (partial receiving on purchases)
// ---------------------------------------------------------------------------

export async function receivePurchase(input: ReceivePurchaseInput): Promise<StockActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  const quantity = Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { success: false, error: 'Enter a positive quantity to receive.' };
  }

  const purchase = await PurchaseModel.findById(input.purchaseId).lean();
  if (!purchase) return { success: false, error: 'Purchase not found.' };

  const received = (purchase as any).receivedQuantity ?? 0;
  const pending = Math.max(0, purchase.quantity - received);
  if (quantity > pending) {
    return { success: false, error: `Cannot receive ${quantity}: only ${formatQty(pending)} still to come.` };
  }

  // Compare-and-swap: only ever receive up to the ordered quantity, atomically.
  const updated = await PurchaseModel.findOneAndUpdate(
    { _id: input.purchaseId, receivedQuantity: { $lte: purchase.quantity - quantity } },
    { $inc: { receivedQuantity: quantity } },
    { new: true }
  );

  if (!updated) {
    const fresh = await PurchaseModel.findById(input.purchaseId).lean();
    const freshReceived = (fresh as any)?.receivedQuantity ?? 0;
    const freshPending = Math.max(0, (fresh as any)?.quantity - freshReceived);
    return {
      success: false,
      error: `Cannot receive ${quantity}: only ${formatQty(freshPending)} still to come.`
    };
  }

  // Physical counter + store product name/sku for the movement record.
  const product = await ProductModel.findOneAndUpdate(
    { _id: purchase.productId, 'variants.id': purchase.variantId },
    { $inc: { 'variants.$.inShop': quantity } },
    { new: true }
  );

  if (!product) {
    await PurchaseModel.updateOne({ _id: input.purchaseId }, { $inc: { receivedQuantity: -quantity } });
    return { success: false, error: 'The linked product was not found. Nothing was changed.' };
  }

  const variant = product.variants?.find((v: any) => v.id === purchase.variantId);
  const inShopAfter = variant?.inShop ?? 0;

  const movementId = await generateId('SM');

  try {
    await StockMovementModel.create({
      movementId,
      kind: 'receive',
      productId: String(purchase.productId),
      variantId: purchase.variantId,
      productName: product.name,
      sku: variant?.sku ?? purchase.variantId,
      quantity,
      inShopBefore: inShopAfter - quantity,
      inShopAfter,
      purchaseId: String(purchase._id),
      purchaseNumber: purchase.purchaseId,
      userId: session.user?.id,
      userName: session.user?.name,
      clientRef: input.clientRef,
      searchText: await buildSearchText([
        product.name,
        variant?.sku,
        purchase.purchaseId,
        'received',
        session.user?.name
      ])
    });
  } catch (error) {
    if (input.clientRef && isDuplicateKeyError(error)) {
      // Idempotent retry - undo this request's side effects, report success.
      await PurchaseModel.updateOne({ _id: input.purchaseId }, { $inc: { receivedQuantity: -quantity } });
      await ProductModel.updateOne(
        { _id: purchase.productId, 'variants.id': purchase.variantId },
        { $inc: { 'variants.$.inShop': -quantity } }
      );
      return { success: true, data: { idempotent: true } };
    }
    await PurchaseModel.updateOne({ _id: input.purchaseId }, { $inc: { receivedQuantity: -quantity } });
    await ProductModel.updateOne(
      { _id: purchase.productId, 'variants.id': purchase.variantId },
      { $inc: { 'variants.$.inShop': -quantity } }
    );
    return toFailure(error, 'Failed to receive stock.');
  }

  revalidateStock();
  return { success: true, data: { receivedQuantity: inShopAfter } };
}

// ---------------------------------------------------------------------------
// Deliver (partial delivery on invoices)
// ---------------------------------------------------------------------------

export async function deliverInvoice(input: DeliverInvoiceInput): Promise<StockActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  if (!input.lines || input.lines.length === 0) {
    return { success: false, error: 'Nothing to deliver.' };
  }

  const invoice = await InvoiceModel.findById(input.invoiceId).lean();
  if (!invoice) return { success: false, error: 'Invoice not found.' };
  if (invoice.type !== 'invoice') return { success: false, error: 'Quotations are not delivered.' };
  if (invoice.status === 'cancelled') return { success: false, error: 'This invoice is cancelled.' };

  // Validate every line against the invoiced quantity.
  const items = ((invoice as any).items ?? []) as InvoiceItem[];
  const requested: Array<{ itemIndex: number; quantity: number; item: InvoiceItem }> = [];
  for (const line of input.lines) {
    const itemIndex = Number(line.itemIndex);
    const item = items[itemIndex];
    if (!item) return { success: false, error: `Invoice line ${itemIndex} no longer exists.` };
    // Custom lines carry no stock, so there is nothing to hand over for them.
    if (!isDeliverableItem(item)) continue;
    // Refuse anything that could not become a stock movement, before a single
    // write happens - the reason is exact and nothing needs rolling back.
    const reason = undeliverableReason(item);
    if (reason) return { success: false, error: reason };
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: `Quantity for '${item.productName}' must be positive.` };
    }
    const delivered = item.deliveredQuantity ?? 0;
    const pending = Math.max(0, item.quantity - delivered);
    if (quantity > pending) {
      return {
        success: false,
        error: `Cannot deliver ${formatQty(quantity)} of '${item.productName}': only ${formatQty(pending)} still to deliver.`
      };
    }
    requested.push({ itemIndex, quantity, item });
  }

  if (requested.length === 0) {
    return { success: false, error: 'Nothing to deliver.' };
  }

  // Atomically record delivered quantities on the invoice items (CAS bounds).
  const inc: Record<string, number> = {};
  const filters: Array<Record<string, unknown>> = [];
  requested.forEach(({ itemIndex, quantity, item }) => {
    inc[`items.${itemIndex}.deliveredQuantity`] = quantity;
    filters.push({ [`items.${itemIndex}.deliveredQuantity`]: { $lte: item.quantity - quantity } });
  });

  const cas = await InvoiceModel.updateOne({ _id: input.invoiceId, $and: filters }, { $inc: inc });

  if (cas.matchedCount === 0) {
    // Someone else delivered concurrently - report the exact current shortfall.
    const fresh = await InvoiceModel.findById(input.invoiceId).lean();
    const freshItems = (fresh as any)?.items ?? [];
    for (const { itemIndex, quantity, item } of requested) {
      const freshItem = freshItems[itemIndex];
      const freshPending = Math.max(0, (freshItem?.quantity ?? item.quantity) - (freshItem?.deliveredQuantity ?? 0));
      if (quantity > freshPending) {
        return {
          success: false,
          error: `Cannot deliver ${formatQty(quantity)} of '${freshItem?.productName ?? item.productName}': only ${formatQty(freshPending)} still to deliver.`
        };
      }
    }
    return { success: false, error: 'Delivery was not recorded. Please try again.' };
  }

  // Decrement "In shop" for each physical line, refusing when there isn't enough.
  const appliedDecrements: Array<{ productId: string; variantId: string; quantity: number }> = [];
  const movementLines: StockMovement['lines'] = [];
  let primary: { productId: string; variantId: string; productName: string; sku: string } | null = null;
  let totalDelivered = 0;

  try {
    for (const { itemIndex, quantity, item } of requested) {
      totalDelivered += quantity;
      if (!primary) {
        primary = {
          productId: item.productId,
          variantId: item.variantId ?? '',
          productName: item.productName,
          sku: item.variantSKU ?? ''
        };
      }

      const line: NonNullable<StockMovement['lines']>[number] = {
        productId: item.productId,
        variantId: item.variantId ?? '',
        productName: item.productName,
        sku: item.variantSKU ?? '',
        quantity,
        itemIndex
      };

      if (isVirtualItem(item) && item.componentBreakdown?.length) {
        // Physical units leaving are the components. The breakdown stores each
        // batch's share for the *whole* line, so it is prorated by how much of
        // the line is going out now - rounding off the cumulative totals so a
        // sequence of partial deliveries can never drift from the reservation.
        const components: NonNullable<typeof line.components> = [];
        const lineQty = item.quantity > 0 ? item.quantity : 1;
        const shippedBefore = item.deliveredQuantity ?? 0;
        for (const comp of item.componentBreakdown) {
          const reserved = comp.quantity ?? 0;
          const alreadyShipped = Math.round((reserved * shippedBefore) / lineQty);
          const willShip = Math.round((reserved * (shippedBefore + quantity)) / lineQty);
          const compQty = Math.max(0, willShip - alreadyShipped);

          if (compQty > 0) {
            const res = await ProductModel.updateOne(
              {
                _id: comp.productId,
                'variants.id': comp.variantId,
                'variants.inShop': { $gte: compQty }
              },
              { $inc: { 'variants.$.inShop': -compQty } }
            );
            if (res.matchedCount === 0) {
              const err = await buildShortageError(comp.productId, comp.variantId, comp.productName, compQty);
              throw err;
            }
            appliedDecrements.push({ productId: comp.productId, variantId: comp.variantId, quantity: compQty });
          }

          components.push({
            productId: comp.productId,
            variantId: comp.variantId,
            productName: comp.productName,
            sku: comp.sku,
            quantity: compQty
          });
        }
        if (components.length > 0) line.components = components;
      } else if (!isVirtualItem(item) && item.variantId) {
        const res = await ProductModel.updateOne(
          {
            _id: item.productId,
            'variants.id': item.variantId,
            'variants.inShop': { $gte: quantity }
          },
          { $inc: { 'variants.$.inShop': -quantity } }
        );
        if (res.matchedCount === 0) {
          const err = await buildShortageError(item.productId, item.variantId, item.productName, quantity);
          throw err;
        }
        appliedDecrements.push({ productId: item.productId, variantId: item.variantId, quantity });
      } else {
        // Unreachable: `undeliverableReason` refuses such lines before anything
        // is written. Guard it anyway - recording the line here would credit the
        // delivery while no stock leaves the shop.
        throw new ExpectedStockError(undeliverableReason(item) ?? `'${item.productName}' cannot be delivered.`);
      }

      movementLines.push(line);
    }
  } catch (error) {
    // Roll everything back so nothing is half-recorded.
    const rollbackInc: Record<string, number> = {};
    requested.forEach(({ itemIndex, quantity }) => {
      rollbackInc[`items.${itemIndex}.deliveredQuantity`] = -quantity;
    });
    await InvoiceModel.updateOne({ _id: input.invoiceId }, { $inc: rollbackInc });
    for (const dec of appliedDecrements) {
      await ProductModel.updateOne(
        { _id: dec.productId, 'variants.id': dec.variantId },
        { $inc: { 'variants.$.inShop': dec.quantity } }
      );
    }
    return toFailure(error, 'Failed to record delivery.');
  }

  // Record "In shop" before/after for the slip as a whole and for every line
  // (and component) it moved, so History/print show real numbers per product
  // instead of only for the headline one. Each variant is walked backwards from
  // its current count: right after this slip = current, right before it =
  // current + everything this slip took, and the lines in between chain from
  // there in the order they were delivered.
  const decrementedKeys = new Set<string>();
  appliedDecrements.forEach(({ productId, variantId }) => decrementedKeys.add(`${productId}|${variantId}`));

  interface InShopTake {
    qty: number;
    apply: (before: number, after: number) => void;
  }
  const takeGroups = new Map<string, { productId: string; variantId: string; takes: InShopTake[] }>();
  const addTake = (productId: string, variantId: string, qty: number, apply: InShopTake['apply']) => {
    const key = `${productId}|${variantId}`;
    const group = takeGroups.get(key) ?? { productId, variantId, takes: [] };
    group.takes.push({ qty, apply });
    takeGroups.set(key, group);
  };

  movementLines.forEach(line => {
    if (line.components?.length) {
      // Virtual item: the components carry the numbers.
      line.components.forEach(comp =>
        addTake(comp.productId, comp.variantId, comp.quantity, (before, after) => {
          comp.inShopBefore = before;
          comp.inShopAfter = after;
        })
      );
    } else if (line.variantId && decrementedKeys.has(`${line.productId}|${line.variantId}`)) {
      addTake(line.productId, line.variantId, line.quantity, (before, after) => {
        line.inShopBefore = before;
        line.inShopAfter = after;
      });
    }
  });

  // The headline variant (what the slip and the Product column show) carries
  // the row's numbers; virtual/service lines fall back to the first component
  // that actually left the shop.
  const stockTarget =
    (primary && takeGroups.has(`${primary.productId}|${primary.variantId}`)
      ? { productId: primary.productId, variantId: primary.variantId }
      : null) ??
    takeGroups.values().next().value ??
    null;

  let inShopBefore = 0;
  let inShopAfter = 0;
  for (const group of takeGroups.values()) {
    const doc = await ProductModel.findOne({ _id: group.productId, 'variants.id': group.variantId })
      .select('variants')
      .lean();
    const variant = (doc as { variants?: Array<{ id: string; inShop?: number }> } | null)?.variants?.find(
      v => v.id === group.variantId
    );
    const current = variant?.inShop ?? 0;
    const totalTaken = group.takes.reduce((sum, take) => sum + take.qty, 0);
    let running = current + totalTaken;
    for (const take of group.takes) {
      const before = running;
      running -= take.qty;
      take.apply(before, running);
    }
    if (stockTarget && group.productId === stockTarget.productId && group.variantId === stockTarget.variantId) {
      inShopBefore = current + totalTaken;
      inShopAfter = current;
    }
  }

  const base = primary ?? { productId: invoice.customerId, variantId: '', productName: '', sku: '' };
  const movementId = await generateId('SM');

  try {
    await StockMovementModel.create({
      movementId,
      kind: 'deliver',
      productId: base.productId,
      variantId: base.variantId,
      productName: base.productName,
      sku: base.sku,
      quantity: totalDelivered,
      inShopBefore,
      inShopAfter,
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      lines: movementLines,
      note: input.note ?? '',
      userId: session.user?.id,
      userName: session.user?.name,
      clientRef: input.clientRef,
      searchText: await buildSearchText([
        invoice.invoiceNumber,
        invoice.customerName,
        ...movementLines.map(l => l.productName),
        'delivered',
        session.user?.name
      ])
    });
  } catch (error) {
    const rollbackInc: Record<string, number> = {};
    requested.forEach(({ itemIndex, quantity }) => {
      rollbackInc[`items.${itemIndex}.deliveredQuantity`] = -quantity;
    });
    await InvoiceModel.updateOne({ _id: input.invoiceId }, { $inc: rollbackInc });
    for (const dec of appliedDecrements) {
      await ProductModel.updateOne(
        { _id: dec.productId, 'variants.id': dec.variantId },
        { $inc: { 'variants.$.inShop': dec.quantity } }
      );
    }
    if (input.clientRef && isDuplicateKeyError(error)) {
      return { success: true, data: { idempotent: true } };
    }
    return toFailure(error, 'Failed to record delivery.');
  }

  revalidateStock();
  return { success: true, data: { deliveredQuantity: totalDelivered } };
}

async function buildShortageError(
  productId: string,
  variantId: string,
  productName: string,
  requestedQty: number
): Promise<Error> {
  const product = (await ProductModel.findOne({ _id: productId, 'variants.id': variantId }).lean()) as unknown as
    | LeanProduct
    | null;
  const available = product?.variants?.find(v => v.id === variantId)?.inShop ?? 0;
  return new ExpectedStockError(
    `Cannot deliver ${formatQty(requestedQty)} of '${productName}': only ${formatQty(available)} unit(s) are physically in the shop.`
  );
}

// ---------------------------------------------------------------------------
// Quick count
// ---------------------------------------------------------------------------

export async function quickCount(input: QuickCountInput): Promise<StockActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  const count = Number(input.count);
  if (!Number.isFinite(count) || count < 0) {
    return { success: false, error: 'Enter a valid count (0 or more).' };
  }

  const product = (await ProductModel.findOne({ _id: input.productId, 'variants.id': input.variantId }).lean()) as
    unknown as LeanProduct | null;
  if (!product) return { success: false, error: 'Product not found.' };
  const variant = product.variants?.find(v => v.id === input.variantId);
  const before = variant?.inShop ?? 0;
  const delta = Math.round(count) - before;
  const finalCount = Math.round(count);

  await ProductModel.updateOne(
    { _id: input.productId, 'variants.id': input.variantId },
    { $set: { 'variants.$.inShop': finalCount } }
  );

  const movementId = await generateId('SM');

  try {
    await StockMovementModel.create({
      movementId,
      kind: 'adjustment',
      productId: String(input.productId),
      variantId: input.variantId,
      productName: product.name,
      sku: variant?.sku ?? input.variantId,
      quantity: delta,
      inShopBefore: before,
      inShopAfter: finalCount,
      note: 'Quick count',
      userId: session.user?.id,
      userName: session.user?.name,
      clientRef: input.clientRef,
      searchText: await buildSearchText([product.name, variant?.sku, 'quick count', session.user?.name])
    });
  } catch (error) {
    if (input.clientRef && isDuplicateKeyError(error)) {
      return { success: true, data: { idempotent: true } };
    }
    await ProductModel.updateOne(
      { _id: input.productId, 'variants.id': input.variantId },
      { $set: { 'variants.$.inShop': before } }
    );
    return toFailure(error, 'Failed to update count.');
  }

  revalidateStock();
  return { success: true, data: {} };
}

// ---------------------------------------------------------------------------
// Reversal - mistakes are fixed by reversing, never by editing history
// ---------------------------------------------------------------------------

export async function reverseMovement(movementId: string): Promise<StockActionResult> {
  const session = await assertPermission('reverse:stock');
  await dbConnect();

  const movement = await StockMovementModel.findOne({ movementId }).lean();
  if (!movement) return { success: false, error: 'Movement not found.' };
  if (movement.kind === 'opening') {
    return { success: false, error: 'Starting counts cannot be reversed - use a quick count instead.' };
  }
  if (movement.reversed) return { success: false, error: 'This movement has already been reversed.' };

  if (movement.kind === 'receive') {
    // Pull the units back out of the shop and undo the received quantity.
    const res = await ProductModel.updateOne(
      { _id: movement.productId, 'variants.id': movement.variantId, 'variants.inShop': { $gte: movement.quantity } },
      { $inc: { 'variants.$.inShop': -movement.quantity } }
    );
    if (res.matchedCount === 0) {
      const product = (await ProductModel.findOne({
        _id: movement.productId,
        'variants.id': movement.variantId
      }).lean()) as unknown as LeanProduct | null;
      const available = product?.variants?.find(v => v.id === movement.variantId)?.inShop ?? 0;
      return {
        success: false,
        error: `Cannot reverse: only ${formatQty(available)} unit(s) of '${movement.productName}' are physically in the shop.`
      };
    }
    if (movement.purchaseId) {
      await PurchaseModel.updateOne(
        { _id: movement.purchaseId, receivedQuantity: { $gte: movement.quantity } },
        { $inc: { receivedQuantity: -movement.quantity } }
      );
    }
    await recordReversal(movement, session, 'out');
  } else if (movement.kind === 'deliver') {
    // Put the units back into the shop and undo the delivered quantity.
    const lines = (movement.lines ?? []) as Array<any>;
    const applied: Array<{ productId: string; variantId: string; quantity: number }> = [];
    try {
      for (const line of lines) {
        if (line.components?.length) {
          for (const comp of line.components) {
            await ProductModel.updateOne(
              { _id: comp.productId, 'variants.id': comp.variantId },
              { $inc: { 'variants.$.inShop': comp.quantity } }
            );
            applied.push({ productId: comp.productId, variantId: comp.variantId, quantity: comp.quantity });
          }
        } else if (line.variantId) {
          await ProductModel.updateOne(
            { _id: line.productId, 'variants.id': line.variantId },
            { $inc: { 'variants.$.inShop': line.quantity } }
          );
          applied.push({ productId: line.productId, variantId: line.variantId, quantity: line.quantity });
        }
      }
    } catch (error) {
      for (const add of applied) {
        await ProductModel.updateOne(
          { _id: add.productId, 'variants.id': add.variantId },
          { $inc: { 'variants.$.inShop': -add.quantity } }
        );
      }
      return toFailure(error, 'Failed to reverse movement.');
    }

    if (movement.invoiceId) {
      const inc: Record<string, number> = {};
      const filters: Array<Record<string, unknown>> = [];
      for (const line of lines) {
        if (line.itemIndex === undefined) continue;
        inc[`items.${line.itemIndex}.deliveredQuantity`] = -line.quantity;
        filters.push({ [`items.${line.itemIndex}.deliveredQuantity`]: { $gte: line.quantity } });
      }
      const res = await InvoiceModel.updateOne({ _id: movement.invoiceId, $and: filters }, { $inc: inc });
      if (Object.keys(inc).length > 0 && res.matchedCount === 0) {
        for (const add of applied) {
          await ProductModel.updateOne(
            { _id: add.productId, 'variants.id': add.variantId },
            { $inc: { 'variants.$.inShop': -add.quantity } }
          );
        }
        return {
          success: false,
          error: `Cannot reverse: the delivery record on invoice ${movement.invoiceNumber || ''} no longer matches (the invoice was edited after delivery).`
        };
      }
    }

    await recordReversal(movement, session, 'in');
  } else if (movement.kind === 'adjustment') {
    // Undo the signed delta (restore "In shop" to the value before the count).
    const target = movement.inShopBefore;
    const current = movement.inShopAfter;
    const res = await ProductModel.updateOne(
      { _id: movement.productId, 'variants.id': movement.variantId },
      { $set: { 'variants.$.inShop': target } }
    );
    if (res.matchedCount === 0) {
      return { success: false, error: 'The product for this movement no longer exists.' };
    }
    await StockMovementModel.create({
      movementId: await generateId('SM'),
      kind: 'reversal',
      productId: movement.productId,
      variantId: movement.variantId,
      productName: movement.productName,
      sku: movement.sku,
      quantity: current - target,
      inShopBefore: current,
      inShopAfter: target,
      reversalOf: movement.movementId,
      note: `Reversal of ${movement.movementId} (quick count)`,
      userId: session.user?.id,
      userName: session.user?.name,
      searchText: await buildSearchText([movement.productName, movement.sku, 'reversal'])
    });
    await StockMovementModel.updateOne(
      { movementId: movement.movementId },
      { $set: { reversed: true, reversedByMovementId: movementId } }
    );
  } else if (movement.kind === 'reversal') {
    return {
      success: false,
      error: 'Cannot reverse a reversal. Correct the live count with a quick count instead.'
    };
  }

  revalidateStock();
  return { success: true, data: {} };
}

async function recordReversal(movement: any, session: any, direction: 'in' | 'out') {
  const reversalId = await generateId('SM');
  await StockMovementModel.create({
    movementId: reversalId,
    kind: 'reversal',
    productId: movement.productId,
    variantId: movement.variantId,
    productName: movement.productName,
    sku: movement.sku,
    quantity: movement.quantity,
    inShopBefore: direction === 'in' ? movement.inShopAfter : movement.inShopBefore,
    inShopAfter: direction === 'in' ? movement.inShopBefore : movement.inShopAfter,
    purchaseId: movement.purchaseId,
    purchaseNumber: movement.purchaseNumber,
    invoiceId: movement.invoiceId,
    invoiceNumber: movement.invoiceNumber,
    customerName: movement.customerName,
    // Same swap for the per-line / per-component numbers: undoing a delivery
    // puts each variant back to where it was before it left.
    lines: (movement.lines ?? []).map((line: any) => ({
      ...line,
      inShopBefore: direction === 'in' ? line.inShopAfter : line.inShopBefore,
      inShopAfter: direction === 'in' ? line.inShopBefore : line.inShopAfter,
      components: line.components?.map((comp: any) => ({
        ...comp,
        inShopBefore: direction === 'in' ? comp.inShopAfter : comp.inShopBefore,
        inShopAfter: direction === 'in' ? comp.inShopBefore : comp.inShopAfter
      }))
    })),
    reversalOf: movement.movementId,
    note: `Reversal of ${movement.movementId}`,
    userId: session.user?.id,
    userName: session.user?.name,
    searchText: await buildSearchText([movement.productName, movement.sku, movement.movementId, 'reversal'])
  });
  await StockMovementModel.updateOne(
    { _id: movement._id },
    { $set: { reversed: true, reversedByMovementId: reversalId } }
  );
}

// ---------------------------------------------------------------------------

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}
