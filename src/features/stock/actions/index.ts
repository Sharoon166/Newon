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
import type {
  ActionResult,
  AwaitingArrivalItem,
  AwaitingDeliveryItem,
  DeliverInvoiceInput,
  InShopRow,
  PaginatedStock,
  QuickCountInput,
  ReceivePurchaseInput,
  StockMovement,
  StockMovementKind,
  StockTrackingStatus,
  StockWorkCounts
} from '../types';

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
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
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
      $gt: [
        {
          $sum: {
            $map: {
              input: { $ifNull: ['$items', []] },
              as: 'i',
              in: { $subtract: [{ $ifNull: ['$$i.quantity', 0] }, { $ifNull: ['$$i.deliveredQuantity', 0] }] }
            }
          }
        },
        0
      ]
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
export async function initializeStockTracking(startedAtISO?: string): Promise<ActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  if (session.user?.role !== 'admin') {
    throw new Error('Only an admin can set the starting counts.');
  }

  const startedAt = startedAtISO ? new Date(startedAtISO) : new Date();
  if (Number.isNaN(startedAt.getTime())) {
    throw new Error('Invalid start date.');
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
  ).lean()) as
    | {
        initialized?: boolean;
        currentEpoch?: number;
        startedAt?: Date;
        history?: Array<{ epoch: number; date: Date; changedAt: Date; changedBy?: string; changedByName?: string }>;
      }
    | null;

  if (!locked) {
    throw new Error('Starting counts are already being set. Wait a moment and try again.');
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
    await PurchaseModel.updateMany(
      { receivedQuantity: { $exists: false } },
      [{ $set: { receivedQuantity: '$quantity' } }]
    );

    // 2. Backfill invoices that predate tracking: everything is fully delivered.
    await InvoiceModel.updateMany(
      { type: 'invoice' },
      [
        {
          $set: {
            items: {
              $map: {
                input: { $ifNull: ['$items', []] },
                as: 'i',
                in: {
                  $mergeObjects: [
                    '$$i',
                    { deliveredQuantity: { $ifNull: ['$$i.deliveredQuantity', '$$i.quantity'] } }
                  ]
                }
              }
            }
          }
        }
      ]
    );

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
          productName: (product as { name: string }).name,
          sku: v.sku ?? '',
          quantity: baseline,
          inShopBefore: 0,
          inShopAfter: baseline,
          note: 'Starting count (equals Available on start date)',
          searchText: `${(product as { name: string }).name} ${v.sku ?? ''} starting count opening`.toLowerCase()
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
    throw error;
  }

  revalidateStock();
  return { ok: true };
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
    const variants = (product as { variants?: Array<any> }).variants ?? [];
    for (const v of variants) {
      const key = `${String(product._id)}|${v.id}`;
      rows.push({
        productId: String(product._id),
        variantId: v.id,
        productName: (product as { name: string }).name,
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
      $gt: [
        { $subtract: ['$quantity', { $ifNull: ['$receivedQuantity', '$quantity'] }] },
        0
      ]
    }
  };
  if (input.search) {
    const regex = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ purchaseId: regex }, { supplier: regex }];
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
      $gt: [
        {
          $sum: {
            $map: {
              input: { $ifNull: ['$items', []] },
              as: 'i',
              in: {
                $subtract: [
                  { $ifNull: ['$$i.quantity', 0] },
                  { $ifNull: ['$$i.deliveredQuantity', 0] }
                ]
              }
            }
          }
        },
        0
      ]
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

  const items: AwaitingDeliveryItem[] = docs
    .map((doc: any) => {
      const lines = (doc.items ?? [])
        .map((item: any, index: number) => {
          const delivered = Math.min(item.quantity ?? 0, item.deliveredQuantity ?? 0);
          return {
            index,
            productName: item.productName || 'Unknown',
            sku: item.variantSKU,
            unit: item.unit || 'pcs',
            quantity: item.quantity ?? 0,
            delivered,
            pending: Math.max(0, (item.quantity ?? 0) - delivered)
          };
        })
        .filter(line => line.pending > 0);

      if (lines.length === 0) return null;

      return {
        id: String(doc._id),
        invoiceNumber: doc.invoiceNumber || 'N/A',
        customerName: doc.customerName || '',
        customerCompany: doc.customerCompany,
        date: doc.date instanceof Date ? doc.date.toISOString() : String(doc.date),
        status: doc.status,
        lines,
        totalInvoiced: lines.reduce((s: number, l: any) => s + l.quantity, 0),
        totalDelivered: lines.reduce((s: number, l: any) => s + l.delivered, 0),
        totalPending: lines.reduce((s: number, l: any) => s + l.pending, 0)
      };
    })
    .filter((item): item is AwaitingDeliveryItem => item !== null);

  return { docs: items, total, page, limit };
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
  const limit = Math.min(100, Math.max(1, input.limit ?? 15));

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
// Receive (partial receiving on purchases)
// ---------------------------------------------------------------------------

export async function receivePurchase(input: ReceivePurchaseInput): Promise<ActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  const quantity = Math.floor(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Enter a positive quantity to receive.');
  }

  const purchase = await PurchaseModel.findById(input.purchaseId).lean();
  if (!purchase) throw new Error('Purchase not found.');

  const received = (purchase as any).receivedQuantity ?? 0;
  const pending = Math.max(0, purchase.quantity - received);
  if (quantity > pending) {
    throw new Error(`Cannot receive ${quantity}: only ${formatQty(pending)} still to come.`);
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
    throw new Error(`Cannot receive ${quantity}: only ${formatQty(freshPending)} still to come.`);
  }

  // Physical counter + store product name/sku for the movement record.
  const product = await ProductModel.findOneAndUpdate(
    { _id: purchase.productId, 'variants.id': purchase.variantId },
    { $inc: { 'variants.$.inShop': quantity } },
    { new: true }
  );

  if (!product) {
    await PurchaseModel.updateOne({ _id: input.purchaseId }, { $inc: { receivedQuantity: -quantity } });
    throw new Error('The linked product was not found. Nothing was changed.');
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
      return { ok: true, idempotent: true };
    }
    await PurchaseModel.updateOne({ _id: input.purchaseId }, { $inc: { receivedQuantity: -quantity } });
    await ProductModel.updateOne(
      { _id: purchase.productId, 'variants.id': purchase.variantId },
      { $inc: { 'variants.$.inShop': -quantity } }
    );
    throw error;
  }

  revalidateStock();
  return { ok: true, receivedQuantity: inShopAfter };
}

// ---------------------------------------------------------------------------
// Deliver (partial delivery on invoices)
// ---------------------------------------------------------------------------

export async function deliverInvoice(input: DeliverInvoiceInput): Promise<ActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  if (!input.lines || input.lines.length === 0) {
    throw new Error('Nothing to deliver.');
  }

  const invoice = await InvoiceModel.findById(input.invoiceId).lean();
  if (!invoice) throw new Error('Invoice not found.');
  if (invoice.type !== 'invoice') throw new Error('Quotations are not delivered.');
  if (invoice.status === 'cancelled') throw new Error('This invoice is cancelled.');

  // Validate every line against the invoiced quantity.
  const items = (invoice as any).items ?? [];
  const requested: Array<{ itemIndex: number; quantity: number; item: any }> = [];
  for (const line of input.lines) {
    const itemIndex = Number(line.itemIndex);
    const item = items[itemIndex];
    if (!item) throw new Error(`Invoice line ${itemIndex} no longer exists.`);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Quantity for '${item.productName}' must be positive.`);
    }
    const delivered = item.deliveredQuantity ?? 0;
    const pending = Math.max(0, item.quantity - delivered);
    if (quantity > pending) {
      throw new Error(
        `Cannot deliver ${formatQty(quantity)} of '${item.productName}': only ${formatQty(pending)} still to deliver.`
      );
    }
    requested.push({ itemIndex, quantity, item });
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
        throw new Error(
          `Cannot deliver ${formatQty(quantity)} of '${freshItem?.productName ?? item.productName}': only ${formatQty(freshPending)} still to deliver.`
        );
      }
    }
    throw new Error('Delivery was not recorded. Please try again.');
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
          variantId: item.variantId,
          productName: item.productName,
          sku: item.variantSKU
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

      if (item.isVirtualProduct && item.componentBreakdown?.length) {
        // Physical units leaving are the components, scaled by the item quantity.
        const components: NonNullable<typeof line.components> = [];
        for (const comp of item.componentBreakdown) {
          const compQty = (comp.quantity ?? 1) * quantity;
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
          components.push({
            productId: comp.productId,
            variantId: comp.variantId,
            productName: comp.productName,
            sku: comp.sku,
            quantity: compQty
          });
        }
        line.components = components;
      } else if (!item.isVirtualProduct && item.variantId) {
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
      }
      // Items without a physical variant (e.g. service lines) are recorded but
      // do not move the "In shop" counter.

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
    throw error;
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
      inShopBefore: 0,
      inShopAfter: 0,
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
      return { ok: true, idempotent: true };
    }
    throw error;
  }

  revalidateStock();
  return { ok: true, deliveredQuantity: totalDelivered };
}

async function buildShortageError(
  productId: string,
  variantId: string,
  productName: string,
  requestedQty: number
): Promise<Error> {
  const product = await ProductModel.findOne({ _id: productId, 'variants.id': variantId }).lean();
  const available = product?.variants?.find((v: any) => v.id === variantId)?.inShop ?? 0;
  return new Error(
    `Cannot deliver ${formatQty(requestedQty)} of '${productName}': only ${formatQty(available)} unit(s) are physically in the shop.`
  );
}

// ---------------------------------------------------------------------------
// Quick count
// ---------------------------------------------------------------------------

export async function quickCount(input: QuickCountInput): Promise<ActionResult> {
  const session = await assertPermission('edit:stock');
  await dbConnect();

  const count = Number(input.count);
  if (!Number.isFinite(count) || count < 0) {
    throw new Error('Enter a valid count (0 or more).');
  }

  const product = await ProductModel.findOne({ _id: input.productId, 'variants.id': input.variantId }).lean();
  if (!product) throw new Error('Product not found.');
  const variant = product.variants?.find((v: any) => v.id === input.variantId);
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
      return { ok: true, idempotent: true };
    }
    await ProductModel.updateOne(
      { _id: input.productId, 'variants.id': input.variantId },
      { $set: { 'variants.$.inShop': before } }
    );
    throw error;
  }

  revalidateStock();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reversal - mistakes are fixed by reversing, never by editing history
// ---------------------------------------------------------------------------

export async function reverseMovement(movementId: string): Promise<ActionResult> {
  const session = await assertPermission('reverse:stock');
  await dbConnect();

  const movement = await StockMovementModel.findOne({ movementId }).lean();
  if (!movement) throw new Error('Movement not found.');
  if (movement.kind === 'opening') throw new Error('Starting counts cannot be reversed - use a quick count instead.');
  if (movement.reversed) throw new Error('This movement has already been reversed.');

  if (movement.kind === 'receive') {
    // Pull the units back out of the shop and undo the received quantity.
    const res = await ProductModel.updateOne(
      { _id: movement.productId, 'variants.id': movement.variantId, 'variants.inShop': { $gte: movement.quantity } },
      { $inc: { 'variants.$.inShop': -movement.quantity } }
    );
    if (res.matchedCount === 0) {
      const product = await ProductModel.findOne({ _id: movement.productId, 'variants.id': movement.variantId }).lean();
      const available = product?.variants?.find((v: any) => v.id === movement.variantId)?.inShop ?? 0;
      throw new Error(
        `Cannot reverse: only ${formatQty(available)} unit(s) of '${movement.productName}' are physically in the shop.`
      );
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
      throw error;
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
        throw new Error(
          `Cannot reverse: the delivery record on invoice ${movement.invoiceNumber || ''} no longer matches (the invoice was edited after delivery).`
        );
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
      throw new Error('The product for this movement no longer exists.');
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
    throw new Error('Cannot reverse a reversal. Correct the live count with a quick count instead.');
  }

  revalidateStock();
  return { ok: true };
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
    lines: movement.lines ?? [],
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