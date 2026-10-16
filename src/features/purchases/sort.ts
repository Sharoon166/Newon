// Sort contract shared by the purchases page (URL params), the table headers
// and getAllPurchases. Keys are the table's column ids; values are the fields
// the aggregation pipeline sorts on. Fields prefixed with `joinedProduct.`
// only exist after the $lookup - which is exactly where the $sort runs.
//
// The whitelist lives here (not in actions/index.ts) because that file is a
// 'use server' module, which may only export async functions.

export const PURCHASE_SORT_FIELDS = {
  purchaseDate: 'purchaseDate',
  productName: 'joinedProduct.name',
  origin: 'joinedProduct.origin',
  supplier: 'supplier',
  totalCost: 'totalCost',
  retailPrice: 'retailPrice',
  amountPaid: 'paidEff',
  paymentStatus: 'paymentStatusEff'
} as const;

export type PurchaseSortId = keyof typeof PURCHASE_SORT_FIELDS;

/** Newest purchases first - what getAllPurchases returns when no sort is given. */
export const DEFAULT_PURCHASE_SORT: { id: PurchaseSortId; desc: boolean } = {
  id: 'purchaseDate',
  desc: true
};

/** Whitelist lookup: anything unknown resolves to undefined. */
export function purchaseSortField(sortBy?: string | null): string | undefined {
  if (!sortBy || !(sortBy in PURCHASE_SORT_FIELDS)) return undefined;
  return PURCHASE_SORT_FIELDS[sortBy as PurchaseSortId];
}

/**
 * Turn the `sort` / `dir` URL params into a known column id + direction.
 * Unknown ids fall back to the default so the chevron shown in the header
 * always matches what the server actually did.
 *
 * `dir` only counts when `sort` is present - without it the server sorts
 * newest-first regardless.
 */
export function parsePurchaseSort(
  sort: string | null | undefined,
  dir: string | null | undefined
): { id: PurchaseSortId; desc: boolean } {
  const field = purchaseSortField(sort);
  if (!field || !sort) return DEFAULT_PURCHASE_SORT;
  return { id: sort as PurchaseSortId, desc: dir !== 'asc' };
}
