/**
 * Name of the pseudo-supplier used by the Stock page's "Add to in-shop"
 * adjustment flow. It is a regular Supplier document (created on demand by
 * `ensureAdjustmentSupplier`) whose purchases are settled in full on creation,
 * so its outstanding balance is always 0.
 */
export const ADJUSTMENT_SUPPLIER_NAME = 'Adjustment';
