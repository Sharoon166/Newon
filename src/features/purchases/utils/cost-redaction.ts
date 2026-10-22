import type { Purchase } from '../types';

/**
 * Purchase fields that describe what the goods cost the business.
 *
 * These are admin-only (`view:imported-purchase-costs`) when the purchase
 * belongs to an imported product. `retailPrice` is deliberately NOT in the
 * list: staff need the selling price at the counter.
 *
 * `payments` is included because every entry carries an amount, so the array
 * together reveals what was paid and what is still owed.
 */
const COST_FIELDS = [
  'unitPrice',
  'purchasePrice',
  'wholesalePrice',
  'shippingCost',
  'totalCost',
  'payments',
  'paidAmount',
  'amountDue',
  'balanceAmount'
] as const;

/**
 * Purchase fields that reveal which supplier the goods were bought from.
 *
 * The source of imported stock is confidential for the same reason as its
 * cost, so these are stripped together with `COST_FIELDS` (same permission,
 * same rows). `productSupplier` is the supplier snapshot carried over from
 * the joined Product document, so it must not survive either.
 */
const SUPPLIER_FIELDS = ['supplier', 'supplierId', 'productSupplier'] as const;

/** True when this purchase must hide its cost data from the caller. */
export function redactsImportedCosts(origin: Purchase['origin'], canViewImportedCosts: boolean): boolean {
  return !canViewImportedCosts && origin === 'imported';
}

/**
 * Strip the cost and supplier fields off a purchase of an imported product
 * when the caller lacks `view:imported-purchase-costs`.
 *
 * The stripped fields become `undefined` at runtime; the object is returned
 * typed as `T` so the rest of the codebase keeps its `number` types.
 * Consumers must check `costsRedacted` before rendering a number -
 * `formatCurrency` renders a missing value as "Rs 0", which would be a lie,
 * so the UI shows "—" instead - and `supplierRedacted` before rendering the
 * supplier name.
 *
 * `origin` may be passed explicitly for payloads that were projected without
 * the joined product document (e.g. the aggregate actions). Loose `object`
 * constraint because those projections only carry a subset of purchase fields.
 */
export function redactImportedCosts<T extends object>(
  purchase: T,
  canViewImportedCosts: boolean,
  origin: Purchase['origin'] = (purchase as { origin?: Purchase['origin'] }).origin
): T {
  if (!redactsImportedCosts(origin, canViewImportedCosts)) return purchase;

  const redacted = { ...purchase, costsRedacted: true, supplierRedacted: true } as T & {
    costsRedacted?: boolean;
    supplierRedacted?: boolean;
  };
  for (const field of COST_FIELDS) {
    (redacted as Record<string, unknown>)[field] = undefined;
  }
  for (const field of SUPPLIER_FIELDS) {
    (redacted as Record<string, unknown>)[field] = undefined;
  }
  return redacted;
}
