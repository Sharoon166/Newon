'use server';

import dbConnect from '@/lib/db';
import PurchaseModel, { type IPurchase } from '@/models/Purchase';
import ProductModel from '@/models/Product';
import SupplierModel from '@/models/Supplier';
import mongoose from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { revalidatePath } from 'next/cache';
import type {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  PurchaseFilters,
  PaginatedPurchases,
  AddPurchasePaymentDto
} from '../types';
import type { LocationInventory, ProductVariant } from '@/features/inventory/types';
import { purchaseSortField } from '../sort';
import { getSession, assertPermission } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/rbac';
import { redactImportedCosts, redactsImportedCosts } from '../utils/cost-redaction';
import { formatCurrency } from '@/lib/utils';
import {
  updateSupplierFinancialsOnPurchase,
  updateSupplierFinancialsOnPayment,
  reverseSupplierFinancialsOnPurchaseDelete,
  reverseSupplierFinancialsOnPaymentDelete
} from '@/features/suppliers/actions';

// Type for lean purchase document from MongoDB
export type LeanPurchase = {
  _id: mongoose.Types.ObjectId;
  purchaseId: string;
  productId: mongoose.Types.ObjectId;
  variantId: string;
  supplier: string;
  supplierId?: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  /** Per-unit goods cost (excludes shipping); absent on legacy rows. */
  purchasePrice?: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  totalCost: number;
  purchaseDate: Date;
  remaining: number;
  /** Physical units that have arrived (stock tracking feature). */
  receivedQuantity?: number;
  notes?: string;
  /**
   * Partial payment tracking. Amount owed = goods cost (quantity *
   * purchasePrice, or totalCost for legacy rows); shipping excluded.
   */
  payments?: Array<{
    _id?: mongoose.Types.ObjectId;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
    date: Date;
    reference?: string;
    notes?: string;
  }>;
  paidAmount?: number;
  amountDue?: number;
  balanceAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  /** False/absent for purchases that predate payment tracking. */
  paymentsTracked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

// export const getAllPurchases = async (filters?: PurchaseFilters): Promise<PaginatedPurchases> => {
//   await dbConnect();

//   const page = filters?.page || 1;
//   const limit = filters?.limit || 10;

//   // Build match query
//   const matchQuery: Record<string, unknown> = {};

//   if (filters?.supplier) {
//     matchQuery.supplier = { $regex: filters.supplier, $options: 'i' };
//   }

//   if (filters?.dateFrom || filters?.dateTo) {
//     const dateQuery: Record<string, Date> = {};
//     if (filters.dateFrom) {
//       dateQuery.$gte = filters.dateFrom;
//     }
//     if (filters.dateTo) {
//       dateQuery.$lte = filters.dateTo;
//     }
//     matchQuery.purchaseDate = dateQuery;
//   }

//   if (filters?.search) {
//     matchQuery.$or = [
//       { purchaseId: { $regex: filters.search, $options: 'i' } },
//       { supplier: { $regex: filters.search, $options: 'i' } },
//       { productName: { $regex: filters.search, $options: 'i' } }, // ← Add this
//       { variantSKU: { $regex: filters.search, $options: 'i' } }, // ← Add this
//       { description: { $regex: filters.search, $options: 'i' } } // ← Add this
//     ];
//   }

//   // Use paginate with populate instead of aggregate
//   const result = await (PurchaseModel as mongoose.PaginateModel<IPurchase>).paginate(matchQuery, {
//     page,
//     limit,
//     sort: { purchaseDate: -1, purchaseId: -1 },
//     lean: true,
//     populate: {
//       path: 'productId',
//       select: 'name supplier variants'
//     }
//   });

//   // Transform and serialize the results
//   const serializedDocs = result.docs.map(purchase => {
//     const doc = purchase as unknown as LeanPurchase & {
//       productId?: {
//         _id: unknown;
//         name: string;
//         supplier: string;
//         variants: Array<{
//           id: string;
//           sku: string;
//           attributes?: Record<string, string>;
//         }>;
//       };
//     };

//     const variant = doc.productId?.variants?.find(v => v.id === doc.variantId);

//     return {
//       id: doc._id.toString(),
//       productId:
//         typeof doc.productId === 'object' && doc.productId?._id
//           ? doc.productId._id.toString()
//           : doc.productId?.toString() || '',
//       variantId: doc.variantId,
//       supplier: doc.supplier,
//       locationId: doc.locationId,
//       quantity: doc.quantity,
//       unitPrice: doc.unitPrice,
//       retailPrice: doc.retailPrice,
//       wholesalePrice: doc.wholesalePrice,
//       shippingCost: doc.shippingCost,
//       totalCost: doc.totalCost,
//       purchaseDate: doc.purchaseDate?.toISOString() || '',
//       remaining: doc.remaining,
//       // Physical arrivals (stock tracking feature) - drives the "Received"
//       // column and the inline receive action on the purchases table.
//       receivedQuantity: doc.receivedQuantity,
//       notes: doc.notes,
//       purchaseId: doc.purchaseId,
//       createdAt: doc.createdAt?.toISOString() || '',
//       updatedAt: doc.updatedAt?.toISOString() || '',
//       productName: doc.productId?.name,
//       productSupplier: doc.productId?.supplier,
//       variant: variant
//         ? {
//             id: variant.id,
//             sku: variant.sku,
//             attributes: variant.attributes
//           }
//         : undefined
//     };
//   });

//   // // Post-query filtering for populated fields
//   // let filteredDocs = serializedDocs;
//   // if (filters?.search) {
//   //   const searchTerm = filters.search.toLowerCase();
//   //   filteredDocs = serializedDocs.filter((purchase) => {
//   //     return (
//   //       purchase.purchaseId?.toLowerCase().includes(searchTerm) ||
//   //       purchase.supplier?.toLowerCase().includes(searchTerm) ||
//   //       purchase.productName?.toLowerCase().includes(searchTerm) ||
//   //       purchase.variant?.sku?.toLowerCase().includes(searchTerm) ||  // Fixed: variant.sku
//   //       purchase.notes?.toLowerCase().includes(searchTerm)
//   //     );
//   //   });
//   // }

//   return {
//     docs: serializedDocs,
//     totalDocs: result.totalDocs,
//     limit: result.limit,
//     page: result.page || 1,
//     totalPages: result.totalPages,
//     hasNextPage: result.hasNextPage || false,
//     hasPrevPage: result.hasPrevPage || false,
//     nextPage: result.nextPage || null,
//     prevPage: result.prevPage || null
//   };
// };

/**
 * Whether the signed-in user may see cost fields on purchases of imported
 * products. Staff get those fields stripped from every read action below -
 * hiding the columns in the UI would not be enough on its own.
 */
async function canViewImportedCosts(): Promise<boolean> {
  const session = await getSession();
  return userHasPermission(session, 'view:imported-purchase-costs');
}

/** `origin` of a product, or undefined when the product is missing/unreadable. */
async function getProductOrigin(
  productId: unknown
): Promise<'local' | 'imported' | undefined> {
  if (!mongoose.Types.ObjectId.isValid(String(productId))) return undefined;
  const product = await ProductModel.findById(productId).select('origin').lean();
  return (product as { origin?: 'local' | 'imported' } | null)?.origin;
}

export const getAllPurchases = async (filters?: PurchaseFilters): Promise<PaginatedPurchases> => {
  await dbConnect();

  const canViewCosts = await canViewImportedCosts();

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const skip = (page - 1) * limit;

  // 1. Initial base query — only apply non-search filters before the lookup
  // (supplier filter uses the dedicated param, not the search term)
  const matchQuery: Record<string, unknown> = {};

  if (filters?.supplierId) {
    // Exact match on the linked supplier id. Purchases created before supplier
    // linking store only the name, so also match an exact (anchored,
    // case-insensitive) supplier name on documents without a supplierId.
    const escapedName = (filters.supplier || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    matchQuery.$or = [
      { supplierId: filters.supplierId },
      { supplier: { $regex: `^${escapedName}$`, $options: 'i' }, supplierId: { $in: [null, ''] } }
    ];
  } else if (filters?.supplier) {
    matchQuery.supplier = { $regex: filters.supplier, $options: 'i' };
  }

  if (filters?.dateFrom || filters?.dateTo) {
    const dateQuery: Record<string, Date> = {};
    if (filters.dateFrom) dateQuery.$gte = filters.dateFrom;
    if (filters.dateTo) dateQuery.$lte = filters.dateTo;
    matchQuery.purchaseDate = dateQuery;
  }

  // NOTE: Do NOT add search conditions here — product name and variant SKU live
  // on the joined Product document, so filtering before $lookup would silently
  // drop rows whose only match is in those fields.

  // 2. Build the Aggregation Pipeline
  const pipeline: PipelineStage[] = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'joinedProduct'
      }
    },
    {
      $unwind: {
        path: '$joinedProduct',
        preserveNullAndEmptyArrays: true
      }
    }
  ];

  // 3. Post-Lookup Search — runs after the join so product name & SKU are visible
  if (filters?.search) {
    pipeline.push({
      $match: {
        $or: [
          { purchaseId: { $regex: filters.search, $options: 'i' } },
          { supplier: { $regex: filters.search, $options: 'i' } },
          { 'joinedProduct.name': { $regex: filters.search, $options: 'i' } },
          { 'joinedProduct.variants.sku': { $regex: filters.search, $options: 'i' } }
        ]
      }
    });
  }

  // 4. Server-side sorting. The column id arrives in the URL, so it goes
  // through a whitelist (sort.ts) - unknown values resolve to undefined and
  // fall back to the newest-first default.
  //
  // Sorting on a field the caller may not see still leaks the rank order of
  // those values (a hand-crafted ?sort=totalCost would sort imported purchases
  // by their hidden cost), so cost-like sorts are dropped for staff.
  const requestedSortField = purchaseSortField(filters?.sortBy);
  const sortField =
    !canViewCosts && (requestedSortField === 'totalCost' || requestedSortField === 'paidEff')
      ? undefined
      : requestedSortField;

  if (sortField === 'paidEff' || sortField === 'paymentStatusEff') {
    // Payment columns display read-time values: purchases that predate payment
    // tracking are treated as fully settled (see resolveAmountDue / isUntracked
    // in the serializer below), so sorting the raw stored fields would
    // misorder them. Materialise the same values first - these expressions
    // mirror that JS logic, so keep them in sync.
    pipeline.push(
      {
        $addFields: {
          amountDueEff: {
            $cond: [
              { $ne: [{ $ifNull: ['$purchasePrice', null] }, null] },
              { $multiply: [{ $ifNull: ['$quantity', 0] }, '$purchasePrice'] },
              { $ifNull: ['$totalCost', 0] }
            ]
          }
        }
      },
      {
        $addFields: {
          paidEff: {
            $cond: [
              { $ne: [{ $ifNull: ['$paymentsTracked', null] }, true] },
              '$amountDueEff',
              { $ifNull: ['$paidAmount', 0] }
            ]
          },
          paymentStatusEff: {
            $cond: [
              { $ne: [{ $ifNull: ['$paymentsTracked', null] }, true] },
              'paid',
              { $ifNull: ['$paymentStatus', 'unpaid'] }
            ]
          }
        }
      }
    );
  }

  const sortDir: 1 | -1 = filters?.sortDir === 'asc' ? 1 : -1;
  // Always append tiebreakers so $skip/$limit paging can never show the same
  // row twice (or skip one) when several rows share the sorted value.
  const sort: Record<string, 1 | -1> = !sortField
    ? { purchaseDate: -1, purchaseId: -1 }
    : sortField === 'purchaseDate'
      ? { purchaseDate: sortDir, _id: -1 }
      : { [sortField]: sortDir, purchaseDate: -1, _id: -1 };

  // 5. Multi-Facet Execution (Calculates total counts & gets paginated data in 1 DB trip)
  const aggregationResult = await PurchaseModel.aggregate([
    ...pipeline,
    {
      $facet: {
        metadata: [{ $count: 'totalDocs' }],
        data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }]
      }
    }
  ]);

  const totalDocs = aggregationResult[0]?.metadata[0]?.totalDocs || 0;
  const rawDocs = aggregationResult[0]?.data || [];

  // 5. Light Transformation on just the 10 fetched rows
  const serializedDocs = rawDocs.map((doc: any) => {
    const variant = doc.joinedProduct?.variants?.find((v: any) => v.id === doc.variantId);

    // Purchases created before payment tracking never had their `paymentsTracked`
    // flag set. Treat them as already settled (Paid) and flag them as untracked
    // so the UI can explain their history isn't recorded. Do NOT use
    // `paymentStatus` for this: Mongoose persists its schema default ('unpaid')
    // whenever a legacy document is saved (e.g. a stock deduction), which would
    // otherwise misclassify them as unpaid.
    const amountDue = resolveAmountDue(doc);
    const isUntracked = doc.paymentsTracked !== true;

    const row = {
      id: doc._id.toString(),
      productId: doc.productId?.toString() || '',
      variantId: doc.variantId,
      supplier: doc.supplier,
      supplierId: doc.supplierId,
      locationId: doc.locationId,
      quantity: doc.quantity,
      unitPrice: doc.unitPrice,
      purchasePrice: doc.purchasePrice,
      retailPrice: doc.retailPrice,
      wholesalePrice: doc.wholesalePrice,
      shippingCost: doc.shippingCost,
      totalCost: doc.totalCost,
      purchaseDate: doc.purchaseDate instanceof Date ? doc.purchaseDate.toISOString() : doc.purchaseDate || '',
      remaining: doc.remaining,
      receivedQuantity: doc.receivedQuantity,
      notes: doc.notes,
      purchaseId: doc.purchaseId,
      payments: (doc.payments || []).map((p: { _id?: { toString(): string }; amount: number; method: string; date: Date | string; reference?: string; notes?: string }) => ({
        _id: p._id?.toString(),
        amount: p.amount,
        method: p.method,
        date: p.date instanceof Date ? p.date.toISOString() : p.date || '',
        reference: p.reference,
        notes: p.notes
      })),
      paidAmount: isUntracked ? amountDue : doc.paidAmount || 0,
      amountDue,
      balanceAmount: isUntracked ? 0 : Math.max(0, amountDue - (doc.paidAmount || 0)),
      paymentStatus: isUntracked ? 'paid' : doc.paymentStatus || 'unpaid',
      isUntracked,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || '',
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt || '',
      productName: doc.joinedProduct?.name,
      productSupplier: doc.joinedProduct?.supplier,
      // Local vs imported lives on the Product document - carried through so the
      // purchases table can label each row.
      origin: doc.joinedProduct?.origin === 'imported' ? 'imported' : 'local',
      variant: variant
        ? {
            id: variant.id,
            sku: variant.sku,
            attributes: variant.attributes
          }
        : undefined
    };

    // Purchases of imported products lose their cost fields for staff.
    return redactImportedCosts(row, canViewCosts);
  });

  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs: serializedDocs,
    totalDocs,
    limit,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

export const getPurchasesByVariantId = async (productId: string, variantId: string) => {
  await dbConnect();

  // Validate inputs
  if (!productId || !variantId) {
    console.warn('getPurchasesByVariantId: Missing parameters', { productId, variantId });
    return [];
  }

  // Clean variantId (remove whitespace)
  const cleanVariantId = variantId.trim();

  // Validate ObjectId format for productId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    console.error('getPurchasesByVariantId: Invalid productId format', { productId });
    return [];
  }

  const productObjectId = new mongoose.Types.ObjectId(productId);

  // Check if this is a simple product (single variant) by looking up the product
  // This helps us handle legacy purchases without variantId
  const product = (await ProductModel.findById(productObjectId).lean()) as {
    variants?: ProductVariant[];
    origin?: 'local' | 'imported';
  } | null;
  const variants = product?.variants || [];
  const isSimpleProduct = variants && Array.isArray(variants) && variants.length === 1;
  const singleVariantId = isSimpleProduct && variants[0] ? variants[0].id : null;
  const shouldIncludeLegacyPurchases = isSimpleProduct && singleVariantId === cleanVariantId;

  // Build query: match purchases with the requested variantId
  // If it's a simple product and the variantId matches, also include legacy purchases without variantId
  const purchasesQuery: {
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    $or?: Array<{ variantId: string | null | { $exists: boolean } | undefined }>;
  } = {
    productId: productObjectId
  };

  if (shouldIncludeLegacyPurchases) {
    // For simple products, include purchases without variantId (legacy)
    purchasesQuery.$or = [
      { variantId: cleanVariantId },
      { variantId: { $exists: false } },
      { variantId: null },
      { variantId: '' }
    ];
  } else {
    purchasesQuery.variantId = cleanVariantId;
  }

  const purchases = (await PurchaseModel.find(purchasesQuery)
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean()) as unknown as LeanPurchase[];

  const canViewCosts = await canViewImportedCosts();

  return purchases.map(purchase =>
    redactImportedCosts(
      {
        ...purchase,
        id: purchase._id.toString(),
        purchaseId: purchase.purchaseId,
        productId: purchase.productId.toString(),
        variantId: purchase.variantId,
        _id: undefined,
        __v: undefined
      },
      canViewCosts,
      // `origin` was loaded with the product above - the rows don't carry it.
      product?.origin
    )
  );
};

// Keep backward compatibility - get all purchases for a product
export const getPurchasesByProductId = async (productId: string) => {
  await dbConnect();

  const canViewCosts = await canViewImportedCosts();
  const origin = canViewCosts ? undefined : await getProductOrigin(productId);

  const purchases = (await PurchaseModel.find({ productId: new mongoose.Types.ObjectId(productId) })
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean()) as unknown as LeanPurchase[];

  return purchases.map(purchase =>
    redactImportedCosts(
      {
        ...purchase,
        id: purchase._id.toString(),
        purchaseId: purchase.purchaseId,
        productId: purchase.productId.toString(),
        variantId: purchase.variantId,
        _id: undefined,
        __v: undefined
      },
      canViewCosts,
      origin
    )
  );
};

export const getPurchaseById = async (id: string) => {
  await dbConnect();

  const purchase = (await PurchaseModel.findById(id).lean()) as unknown as LeanPurchase | null;

  if (!purchase) {
    return null;
  }

  const canViewCosts = await canViewImportedCosts();
  const origin = canViewCosts ? undefined : await getProductOrigin(purchase.productId);

  return redactImportedCosts(
    {
      ...purchase,
      id: purchase._id.toString(),
      purchaseId: purchase.purchaseId,
      productId: purchase.productId.toString(),
      variantId: purchase.variantId,
      _id: undefined,
      __v: undefined
    },
    canViewCosts,
    origin
  );
};

export const createPurchase = async (data: CreatePurchaseDto) => {
  await assertPermission('create:purchases');
  await dbConnect();

  // Recording a purchase against an imported product requires
  // `create:imported-purchases` - staff may only record local purchases. The
  // origin always comes from the stored product, never from the client payload.
  const origin = await getProductOrigin(data.productId);
  if (origin === 'imported') {
    await assertPermission('create:imported-purchases');
  }

  // Calculate totalCost: landed cost when a goods price was entered
  // (quantity * purchasePrice + shipping, shipping counted once as a company
  // expense), otherwise the legacy quantity * unitPrice.
  const totalCost =
    data.purchasePrice != null
      ? data.quantity * data.purchasePrice + (data.shippingCost || 0)
      : data.quantity * data.unitPrice;
  const goodsDue =
    data.purchasePrice != null ? data.quantity * data.purchasePrice : totalCost;

  // When a supplier is linked, keep the denormalized name snapshot in sync with
  // the Supplier document. Falls back to the name supplied by the caller when
  // the supplier cannot be found (or when no supplier is linked).
  let supplierName = data.supplier;
  if (data.supplierId) {
    const supplier = await SupplierModel.findOne({ supplierId: data.supplierId }).lean();
    if (supplier) {
      supplierName = supplier.name;
    }
  }

  const newPurchase = await PurchaseModel.create({
    ...data,
    supplier: supplierName,
    productId: new mongoose.Types.ObjectId(data.productId),
    variantId: data.variantId,
    totalCost,
    purchaseDate: data.purchaseDate || new Date(),
    // remaining will be set to quantity by the pre-save hook, but we can set it explicitly here too
    remaining: data.quantity
  });

  // Record the amount owed against the linked supplier (amountDue is set by the
  // pre-save hook = goods cost; shipping is excluded - it is an expense to the
  // company, not part of the supplier's debt).
  if (newPurchase.supplierId) {
    await updateSupplierFinancialsOnPurchase(
      newPurchase.supplierId,
      newPurchase.amountDue ?? goodsDue,
      newPurchase.purchaseDate
    );
  }

  // Update the variant inventory for the selected location
  const product = await ProductModel.findById(data.productId);
  if (product && product.variants) {
    const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === data.variantId);
    if (variantIndex >= 0) {
      const variant = product.variants[variantIndex];
      const inventory: LocationInventory[] = Array.isArray(variant.inventory) ? variant.inventory : [];

      if (data.locationId) {
        // Update specific location inventory
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === data.locationId
        );

        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry
          inventory[locationInventoryIndex].availableStock += data.quantity;
        } else {
          // Add new inventory entry for this location
          inventory.push({
            locationId: data.locationId,
            availableStock: data.quantity,
            backorderStock: 0
          });
        }
      } else {
        // If no location specified, add to the first available location or create a default one
        if (inventory.length > 0) {
          const firstLocation = inventory[0];
          firstLocation.availableStock += data.quantity;
        } else {
          // Create a default inventory entry
          inventory.push({
            locationId: 'default',
            availableStock: data.quantity,
            backorderStock: 0
          });
        }
      }

      // Update variant inventory
      variant.inventory = inventory;

      // Update legacy fields for backward compatibility
      const totalAvailable = inventory.reduce(
        (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
        0
      );
      const totalBackorder = inventory.reduce(
        (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
        0
      );
      variant.availableStock = totalAvailable;
      variant.stockOnBackorder = totalBackorder;

      // Mark variants as modified and save
      product.markModified('variants');
      await product.save();
    } else {
      console.error(`Variant ${data.variantId} not found in product ${data.productId}`);
    }
  } else {
    console.error(`Product ${data.productId} not found or has no variants`);
  }

  revalidatePath(`/inventory/${data.productId}/edit`);
  revalidatePath(`/inventory/${data.productId}`);
  revalidatePath('/inventory');
  revalidatePath('/purchases');
  revalidatePath('/virtual-products');

  const purchaseObj = newPurchase.toObject();
  return {
    ...purchaseObj,
    id: purchaseObj._id?.toString(),
    purchaseId: purchaseObj.purchaseId,
    productId: purchaseObj.productId.toString(),
    variantId: purchaseObj.variantId,
    _id: undefined,
    __v: undefined
  };
};

export const updatePurchase = async (id: string, data: UpdatePurchaseDto) => {
  await assertPermission('edit:purchases');
  await dbConnect();

  // Fetch the purchase. Cost fields (totalCost, unitPrice, amountDue) are
  // recalculated below after validation - this path uses findByIdAndUpdate,
  // which skips the pre-save hook.
  const purchase = await PurchaseModel.findById(id);
  if (!purchase) {
    throw new Error('PurchaseModel not found');
  }

  // Editing a purchase against an imported product requires the same
  // permission as creating one - the origin always comes from the stored
  // product, never from the client payload.
  const origin = await getProductOrigin(purchase.productId);
  if (origin === 'imported') {
    await assertPermission('create:imported-purchases');
  }

  // Units already sold/allocated from this purchase. This amount does not change
  // when the ordered quantity is edited, so the invariant is always:
  // remaining = quantity - used.
  const used = purchase.quantity - purchase.remaining;

  // Calculate new remaining if quantity is being updated and remaining is not explicitly provided
  let calculatedRemaining = data.remaining;
  if (data.quantity !== undefined) {
    // Cannot reduce the ordered quantity below what has already been sold or
    // allocated - those units are gone and can never be un-sold.
    if (data.quantity < used) {
      throw new Error(
        `Cannot reduce quantity to ${data.quantity}: ${used} unit(s) have already been sold or allocated from this purchase. The quantity cannot be lower than ${used}.`
      );
    }

    if (data.remaining === undefined) {
      // Keep the used amount fixed (covers both increases and decreases).
      calculatedRemaining = data.quantity - used;
    }
  }

  // Validate that remaining doesn't exceed quantity (using calculated remaining)
  if (data.remaining !== undefined) {
    const quantity = data.quantity ?? purchase.quantity;
    if (data.remaining > quantity) {
      throw new Error(`Remaining quantity (${data.remaining}) cannot exceed the quantity (${quantity})`);
    }
  }

  // Validate calculated remaining doesn't exceed new quantity
  if (calculatedRemaining !== undefined && data.quantity !== undefined) {
    if (calculatedRemaining > data.quantity) {
      throw new Error(
        `Calculated remaining quantity (${calculatedRemaining}) cannot exceed the new quantity (${data.quantity}). This should not happen - please report this issue.`
      );
    }
  }

  // Effective cost inputs after this edit. `purchasePrice` (goods cost per
  // unit) takes precedence when present - on legacy rows it is absent and the
  // cost fields are left untouched by this edit unless explicitly sent.
  const nextQuantity = data.quantity ?? purchase.quantity;
  const nextUnitPrice = data.unitPrice ?? purchase.unitPrice;
  const nextPurchasePrice =
    data.purchasePrice !== undefined ? data.purchasePrice : purchase.purchasePrice;
  const nextShippingCost = data.shippingCost ?? purchase.shippingCost;

  // The amount owed (goods cost: quantity * purchasePrice, or quantity *
  // unitPrice on legacy rows) can never drop below the payments already
  // recorded against the purchase - that would silently turn real payments
  // into an overpayment. The payments must be reduced first, then the
  // purchase edited. Untracked (legacy) purchases have no payment history, so
  // they are exempt. Shipping is excluded (it is not part of the supplier debt).
  if (purchase.paymentsTracked === true) {
    const paid = purchase.paidAmount || 0;
    const nextAmountDue =
      nextPurchasePrice != null ? nextQuantity * nextPurchasePrice : nextQuantity * nextUnitPrice;
    if (paid > 0 && nextAmountDue < paid - 0.001) {
      throw new Error(
        `The purchase total (${formatCurrency(nextAmountDue, false)}) would be less than the ${formatCurrency(paid, false)} already paid. Please adjust the payments first, then edit this purchase.`
      );
    }
  }

  // Handle inventory updates when quantity is changed
  const quantityDiff = data.quantity !== undefined ? data.quantity - purchase.quantity : 0;

  if (quantityDiff !== 0) {
    const product = await ProductModel.findById(purchase.productId);
    if (product && product.variants) {
      const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === purchase.variantId);
      if (variantIndex >= 0) {
        const variant = product.variants[variantIndex];
        const inventory = Array.isArray(variant.inventory) ? variant.inventory : [];

        // Determine which location to update
        const targetLocationId = purchase.locationId || (inventory.length > 0 ? inventory[0].locationId : 'default');

        // Find inventory entry for this location
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === targetLocationId
        );

        if (locationInventoryIndex >= 0) {
          inventory[locationInventoryIndex].availableStock += quantityDiff;

          // Ensure it doesn't go below 0
          if (inventory[locationInventoryIndex].availableStock < 0) {
            inventory[locationInventoryIndex].availableStock = 0;
          }
        } else if (quantityDiff > 0) {
          // Add new inventory entry if quantity is increased and location doesn't exist
          inventory.push({
            locationId: targetLocationId,
            availableStock: quantityDiff,
            backorderStock: 0
          });
        }

        // Update variant inventory
        variant.inventory = inventory;

        // Update legacy fields for backward compatibility
        const totalAvailable = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
          0
        );
        const totalBackorder = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
          0
        );
        variant.availableStock = totalAvailable;
        variant.stockOnBackorder = totalBackorder;

        // Mark variants as modified
        product.markModified('variants');
        await product.save();
      }
    }
  }

  const updateData: Partial<
    UpdatePurchaseDto & {
      totalCost?: number;
      remaining?: number;
      receivedQuantity?: number;
      amountDue?: number;
      balanceAmount?: number;
      paymentStatus?: 'unpaid' | 'partial' | 'paid';
    }
  > = { ...data };

  // When a supplier is linked, keep the denormalized name snapshot in sync with
  // the Supplier document.
  if (data.supplierId) {
    const supplier = await SupplierModel.findOne({ supplierId: data.supplierId }).lean();
    if (supplier) {
      updateData.supplier = supplier.name;
    }
  }

  // Use pre-calculated remaining if quantity was updated
  if (calculatedRemaining !== undefined && data.remaining === undefined) {
    updateData.remaining = calculatedRemaining;
  }

  // Keep the "received" count inside the new quantity when the quantity changes,
  // otherwise the Received column renders impossible values like "100 / 10".
  // Purchases that predate tracking have no receivedQuantity (they count as fully
  // arrived) - leave those undefined instead of inventing a value.
  if (data.quantity !== undefined && purchase.receivedQuantity !== undefined) {
    updateData.receivedQuantity = Math.min(purchase.receivedQuantity, data.quantity);
  }

  // Recalculate totalCost when any cost input is updated. Rows with a goods
  // price get the landed total (quantity * purchasePrice + shipping) and a
  // derived unitPrice (totalCost / quantity); legacy rows keep
  // quantity * unitPrice (their stored shipping - always 0 in prod - stays out
  // of the supplier-facing total).
  if (
    data.quantity !== undefined ||
    data.unitPrice !== undefined ||
    data.purchasePrice !== undefined ||
    data.shippingCost !== undefined
  ) {
    if (nextPurchasePrice != null) {
      const landedTotal = nextQuantity * nextPurchasePrice + (nextShippingCost || 0);
      updateData.totalCost = landedTotal;
      updateData.unitPrice = landedTotal / nextQuantity;
    } else {
      updateData.totalCost = nextQuantity * nextUnitPrice;
    }
  }

  // findByIdAndUpdate skips the pre-save hook, so recompute the payment totals
  // here whenever the amount due changes. amountDue is the goods cost only
  // (quantity * purchasePrice, or totalCost on legacy rows) - shipping is an
  // expense to the company, not part of the supplier debt.
  const currentAmountDue = resolveAmountDue(purchase);
  const nextTotalCost = updateData.totalCost ?? purchase.totalCost;
  const nextAmountDue =
    nextPurchasePrice != null ? nextQuantity * nextPurchasePrice : nextTotalCost || 0;
  updateData.amountDue = nextAmountDue;
  // Only tracked purchases get their payment status rewritten (mirrors the
  // pre-save hook). Untracked legacy rows are treated as settled at read time,
  // so rewriting theirs to "unpaid" with a full balance would misreport them.
  if (purchase.paymentsTracked === true) {
    const currentPaid = purchase.paidAmount || 0;
    updateData.balanceAmount = Math.max(0, nextAmountDue - currentPaid);
    updateData.paymentStatus =
      updateData.balanceAmount <= 0 && currentPaid > 0
        ? 'paid'
        : currentPaid > 0
          ? 'partial'
          : 'unpaid';
  }

  const updatedPurchase = (await PurchaseModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean()) as LeanPurchase | null;

  if (!updatedPurchase) {
    throw new Error('PurchaseModel not found');
  }

  const productId = updatedPurchase.productId.toString();

  // Keep the linked supplier(s) financials in sync. When the supplier changes
  // the whole purchase is transferred; otherwise adjust by the delta in amount due.
  const oldSupplierId = purchase.supplierId;
  const newSupplierId = data.supplierId ?? purchase.supplierId;
  const purchaseDate = updatedPurchase.purchaseDate || new Date();
  // Legacy purchases count as fully paid so editing them never creates debt.
  const paid = effectivePaidAmount(purchase);

  if (oldSupplierId !== newSupplierId) {
    if (oldSupplierId) {
      await reverseSupplierFinancialsOnPurchaseDelete(oldSupplierId, currentAmountDue, paid);
    }
    if (newSupplierId) {
      await updateSupplierFinancialsOnPurchase(newSupplierId, nextAmountDue, purchaseDate);
      if (paid > 0) {
        await updateSupplierFinancialsOnPayment(newSupplierId, paid, purchaseDate);
      }
    }
  } else if (newSupplierId) {
    const amountDueDelta = nextAmountDue - currentAmountDue;
    if (amountDueDelta !== 0) {
      await updateSupplierFinancialsOnPurchase(newSupplierId, amountDueDelta, purchaseDate);
      // A legacy purchase is settled, so keep its outstanding contribution at
      // zero: the amount-due change must be matched by an equal "payment".
      if (purchase.paymentsTracked !== true) {
        await updateSupplierFinancialsOnPayment(newSupplierId, amountDueDelta, purchaseDate);
      }
    }
  }

  revalidatePath(`/inventory/${productId}/edit`);
  revalidatePath(`/inventory/${productId}`);
  revalidatePath('/inventory');
  revalidatePath('/purchases');
  revalidatePath('/virtual-products');

  return {
    ...updatedPurchase,
    id: updatedPurchase._id.toString(),
    purchaseId: updatedPurchase.purchaseId,
    productId: updatedPurchase.productId.toString(),
    variantId: updatedPurchase.variantId,
    _id: undefined,
    __v: undefined
  };
};

export const deletePurchase = async (id: string) => {
  await assertPermission('delete:purchases');
  await dbConnect();

  const purchase = (await PurchaseModel.findById(id).lean()) as LeanPurchase | null;
  if (!purchase) {
    throw new Error('Purchase not found');
  }

  // Real money has been recorded against this purchase: deleting it would
  // destroy the payment history (and silently reverse the supplier's paid
  // total). The payments must be removed from the purchase first.
  const recordedPayments = purchase.payments || [];
  const recordedTotal =
    purchase.paymentsTracked === true
      ? purchase.paidAmount || recordedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0;
  if (recordedPayments.length > 0 || recordedTotal > 0) {
    throw new Error(
      `Cannot delete this purchase. It has ${
        recordedPayments.length > 0 ? `${recordedPayments.length} recorded payment(s)` : 'recorded payments'
      } totalling ${formatCurrency(recordedTotal)}. Please adjust (remove) the payments first, then delete the purchase.`
    );
  }

  // Check if any quantity has been used (sold/allocated)
  if (purchase.remaining < purchase.quantity) {
    throw new Error(
      `Cannot delete this purchase. ${purchase.quantity - purchase.remaining} unit(s) have already been sold or allocated. Only purchases with no sales can be deleted.`
    );
  }

  const productId = purchase.productId.toString();
  const supplierId = purchase.supplierId;
  const purchaseAmountDue = resolveAmountDue(purchase);
  // Legacy purchases count as fully paid, so removing one must also remove the
  // full amount from the supplier's paid total (and nothing from outstanding).
  const purchasePaidAmount = effectivePaidAmount(purchase);

  // If locationId is provided, update the variant inventory for that location by subtracting the quantity
  if (purchase.locationId) {
    const product = await ProductModel.findById(productId);
    if (product && product.variants) {
      const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === purchase.variantId);
      if (variantIndex >= 0) {
        const variant = product.variants[variantIndex];
        const inventory: LocationInventory[] = Array.isArray(variant.inventory) ? variant.inventory : [];

        // Find inventory entry for this location
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === purchase.locationId
        );

        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry by subtracting the quantity
          inventory[locationInventoryIndex].availableStock -= purchase.quantity;
          // Ensure it doesn't go below 0
          if (inventory[locationInventoryIndex].availableStock < 0) {
            inventory[locationInventoryIndex].availableStock = 0;
          }
        }

        // Update variant inventory
        variant.inventory = inventory;

        // Update legacy fields for backward compatibility
        const totalAvailable = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
          0
        );
        const totalBackorder = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
          0
        );
        variant.availableStock = totalAvailable;
        variant.stockOnBackorder = totalBackorder;

        // Mark variants as modified
        product.markModified('variants');
        await product.save();
      }
    }
  }

  await PurchaseModel.deleteOne({ _id: id });

  // Reverse the amount owed against the linked supplier.
  if (supplierId) {
    await reverseSupplierFinancialsOnPurchaseDelete(supplierId, purchaseAmountDue, purchasePaidAmount);
  }

  revalidatePath(`/inventory/${productId}/edit`);
  revalidatePath(`/inventory/${productId}`);
  revalidatePath('/inventory');
  revalidatePath('/virtual-products');
};

export const getPurchasesAggregateByVariantId = async (productId: string, variantId: string) => {
  await dbConnect();

  const canViewCosts = await canViewImportedCosts();
  const hideImportedCosts = redactsImportedCosts(
    canViewCosts ? undefined : await getProductOrigin(productId),
    canViewCosts
  );

  const result = await PurchaseModel.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        variantId: variantId
      }
    },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        purchaseHistory: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        totalPurchased: 1,
        totalCost: 1,
        purchaseHistory: {
          $map: {
            input: '$purchaseHistory',
            as: 'purchase',
            in: {
              id: { $toString: '$$purchase._id' },
              productId: { $toString: '$$purchase.productId' },
              variantId: '$$purchase.variantId',
              supplier: '$$purchase.supplier',
              locationId: '$$purchase.locationId',
              quantity: '$$purchase.quantity',
              unitPrice: '$$purchase.unitPrice',
              totalCost: '$$purchase.totalCost',
              purchaseDate: '$$purchase.purchaseDate',
              remaining: '$$purchase.remaining',
              notes: '$$purchase.notes',
              createdAt: '$$purchase.createdAt',
              updatedAt: '$$purchase.updatedAt'
            }
          }
        }
      }
    }
  ]);

  const aggregate = result[0] || { totalPurchased: 0, totalCost: 0, purchaseHistory: [] };
  if (!hideImportedCosts) return aggregate;

  // Staff may see how many units were bought, but not what they cost.
  return {
    ...aggregate,
    totalCost: undefined,
    purchaseHistory: (aggregate.purchaseHistory as Record<string, unknown>[]).map(purchase =>
      redactImportedCosts(purchase, false, 'imported')
    )
  };
};

// Keep backward compatibility
export const getPurchasesAggregateByProductId = async (productId: string) => {
  await dbConnect();

  const canViewCosts = await canViewImportedCosts();
  const hideImportedCosts = redactsImportedCosts(
    canViewCosts ? undefined : await getProductOrigin(productId),
    canViewCosts
  );

  const result = await PurchaseModel.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        purchaseHistory: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        totalPurchased: 1,
        totalCost: 1,
        purchaseHistory: {
          $map: {
            input: '$purchaseHistory',
            as: 'purchase',
            in: {
              id: { $toString: '$$purchase._id' },
              productId: { $toString: '$$purchase.productId' },
              variantId: '$$purchase.variantId',
              supplier: '$$purchase.supplier',
              locationId: '$$purchase.locationId',
              quantity: '$$purchase.quantity',
              unitPrice: '$$purchase.unitPrice',
              totalCost: '$$purchase.totalCost',
              purchaseDate: '$$purchase.purchaseDate',
              remaining: '$$purchase.remaining',
              notes: '$$purchase.notes',
              createdAt: '$$purchase.createdAt',
              updatedAt: '$$purchase.updatedAt'
            }
          }
        }
      }
    }
  ]);

  const aggregate = result[0] || { totalPurchased: 0, totalCost: 0, purchaseHistory: [] };
  if (!hideImportedCosts) return aggregate;

  // Staff may see how many units were bought, but not what they cost.
  return {
    ...aggregate,
    totalCost: undefined,
    purchaseHistory: (aggregate.purchaseHistory as Record<string, unknown>[]).map(purchase =>
      redactImportedCosts(purchase, false, 'imported')
    )
  };
};

// Get all payments recorded against a purchase.
export const getPurchasePayments = async (purchaseId: string) => {
  await dbConnect();

  const purchase = (await PurchaseModel.findById(purchaseId).lean()) as unknown as LeanPurchase | null;
  if (!purchase) {
    return [];
  }

  // Payment amounts are cost data: no payment history for imported products
  // unless the caller may see those costs.
  const canViewCosts = await canViewImportedCosts();
  const origin = canViewCosts ? undefined : await getProductOrigin(purchase.productId);
  if (redactsImportedCosts(origin, canViewCosts)) {
    return [];
  }

  return (purchase.payments || []).map(p => ({
    _id: p._id?.toString(),
    amount: p.amount,
    method: p.method,
    date: p.date instanceof Date ? p.date.toISOString() : p.date,
    reference: p.reference,
    notes: p.notes
  }));
};

// Server actions must NOT throw for expected/validation failures: errors thrown
// from a server action have their message redacted in production, so the client
// toast would only ever show a generic message. Instead these actions resolve to
// a serializable result the UI can inspect.
export type PaymentActionResult = { success: true } | { success: false; error: string };

// Compute the amount owed for a purchase: the goods cost only - quantity *
// purchasePrice when a goods price exists, otherwise totalCost (legacy rows
// where unitPrice is the goods price). Shipping is an expense to the company
// and is deliberately excluded from what the supplier is owed (payments,
// balances and supplier rollups all build on this). Always derive instead of
// trusting the stored `amountDue`: older documents have a shipping-inclusive
// value persisted there.
function resolveAmountDue(purchase: {
  quantity?: number;
  purchasePrice?: number;
  paymentsTracked?: boolean;
  amountDue?: number;
  totalCost?: number;
  shippingCost?: number;
}) {
  if (purchase.purchasePrice != null && purchase.quantity) {
    return purchase.quantity * purchase.purchasePrice;
  }
  return purchase.totalCost || 0;
}

// Amount that should count as "paid" against the linked supplier. Purchases that
// predate payment tracking are treated as fully settled, so their whole amount
// due counts as paid and they never add to a supplier's outstanding balance.
function effectivePaidAmount(purchase: {
  paymentsTracked?: boolean;
  paidAmount?: number;
  amountDue?: number;
  totalCost?: number;
  shippingCost?: number;
}) {
  if (purchase.paymentsTracked !== true) {
    return resolveAmountDue(purchase);
  }
  return purchase.paidAmount || 0;
}

// Add a partial payment to a purchase.
export const addPurchasePayment = async (
  purchaseId: string,
  payment: AddPurchasePaymentDto
): Promise<PaymentActionResult> => {
  try {
    await assertPermission('edit:purchases');
    await dbConnect();

    const purchase = await PurchaseModel.findById(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    if (payment.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0' };
    }

    // Derive the balance from amountDue - paidAmount rather than trusting the
    // stored `balanceAmount`, so legacy documents (which predate the field and
    // may have it missing or zero) can still record payments.
    const currentBalance = Math.max(0, resolveAmountDue(purchase) - (purchase.paidAmount || 0));
    // Small tolerance so float rounding can't reject an exact-balance payment.
    if (payment.amount > currentBalance + 0.001) {
      return {
        success: false,
        error: `Payment amount (${payment.amount}) exceeds the outstanding balance (${currentBalance})`
      };
    }

    purchase.payments = purchase.payments || [];
    purchase.payments.push({
      amount: payment.amount,
      method: payment.method,
      date: payment.date instanceof Date ? payment.date : new Date(payment.date),
      reference: payment.reference,
      notes: payment.notes
    });

    // Pre-save hook recalculates paidAmount / balanceAmount / paymentStatus.
    await purchase.save();

    if (purchase.supplierId) {
      await updateSupplierFinancialsOnPayment(
        purchase.supplierId,
        payment.amount,
        payment.date instanceof Date ? payment.date : new Date(payment.date)
      );
    }

    revalidatePath('/purchases');
    revalidatePath(`/inventory/${purchase.productId.toString()}/edit`);

    return { success: true };
  } catch (error) {
    console.error('Error adding purchase payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add payment' };
  }
};

// Update an existing payment on a purchase.
export const updatePurchasePayment = async (
  purchaseId: string,
  paymentIndex: number,
  updatedPayment: AddPurchasePaymentDto
): Promise<PaymentActionResult> => {
  try {
    await assertPermission('edit:purchases');
    await dbConnect();

    const purchase = await PurchaseModel.findById(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    const payments = purchase.payments || [];
    if (paymentIndex < 0 || paymentIndex >= payments.length) {
      return { success: false, error: 'Payment not found' };
    }

    const updatedAmount = Number(updatedPayment.amount);
    if (!Number.isFinite(updatedAmount) || updatedAmount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0' };
    }

    const amountDue = resolveAmountDue(purchase);
    const otherPaid = payments.reduce((sum, p, i) => (i === paymentIndex ? sum : sum + (p.amount || 0)), 0);
    if (otherPaid + updatedAmount > amountDue + 0.001) {
      return {
        success: false,
        error: `Payment amount (${updatedAmount}) exceeds the remaining balance on this purchase (max ${amountDue - otherPaid})`
      };
    }

    const oldPaymentAmount = payments[paymentIndex].amount;

    purchase.payments = payments;
    purchase.payments[paymentIndex] = {
      amount: updatedAmount,
      method: updatedPayment.method,
      date: updatedPayment.date instanceof Date ? updatedPayment.date : new Date(updatedPayment.date),
      reference: updatedPayment.reference,
      notes: updatedPayment.notes
    } as never;

    await purchase.save();

    if (purchase.supplierId) {
      const paymentDate = updatedPayment.date instanceof Date ? updatedPayment.date : new Date(updatedPayment.date);
      await reverseSupplierFinancialsOnPaymentDelete(purchase.supplierId, oldPaymentAmount);
      await updateSupplierFinancialsOnPayment(purchase.supplierId, updatedAmount, paymentDate);
    }

    revalidatePath('/purchases');
    revalidatePath(`/inventory/${purchase.productId.toString()}/edit`);

    return { success: true };
  } catch (error) {
    console.error('Error updating purchase payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update payment' };
  }
};

// Delete a payment from a purchase.
export const deletePurchasePayment = async (
  purchaseId: string,
  paymentIndex: number
): Promise<PaymentActionResult> => {
  try {
    await assertPermission('edit:purchases');
    await dbConnect();

    const purchase = await PurchaseModel.findById(purchaseId);
    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    const payments = purchase.payments || [];
    if (paymentIndex < 0 || paymentIndex >= payments.length) {
      return { success: false, error: 'Payment not found' };
    }

    const deletedAmount = payments[paymentIndex].amount;
    payments.splice(paymentIndex, 1);
    purchase.payments = payments;

    await purchase.save();

    if (purchase.supplierId) {
      await reverseSupplierFinancialsOnPaymentDelete(purchase.supplierId, deletedAmount);
    }

    revalidatePath('/purchases');
    revalidatePath(`/inventory/${purchase.productId.toString()}/edit`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting purchase payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete payment' };
  }
};
