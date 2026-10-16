import type { Purchase } from '../types';
import { getPurchasePayments } from '../actions';

/** Why deleting a purchase is blocked: it still carries recorded payments. */
export interface PurchasePaymentBlock {
  /** Payment records on the purchase (0 when only the rollup total is known). */
  count: number;
  /** Total amount already recorded against the purchase. */
  total: number;
}

/**
 * Decide whether deleting `purchase` has to be blocked because partial payments
 * were already recorded against it. Those payments are real money - they have
 * to be adjusted (removed) from the purchase first, otherwise deletion would
 * silently destroy them along with the document.
 *
 * Returns `null` when deletion may go ahead. Rows that already carry their
 * payment history answer locally; projections without it (e.g. the variant
 * purchase history) fall back to fetching the payments from the server.
 */
export async function resolvePurchasePaymentBlock(
  purchase: Purchase
): Promise<PurchasePaymentBlock | null> {
  // Purchases that predate payment tracking never recorded one.
  if (purchase.isUntracked) return null;

  let payments = purchase.payments;
  if (!payments) {
    const id = purchase.id || purchase._id;
    payments = id ? await getPurchasePayments(id) : [];
  }

  const total =
    purchase.paidAmount || payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (payments.length === 0 && total <= 0) return null;
  return { count: payments.length, total };
}
