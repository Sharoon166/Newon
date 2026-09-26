import type { Invoice } from '../types';
import { isDeliverableItem } from './deliverable-items';

export interface DeliverySummary {
  /** Total units across the invoice lines. */
  total: number;
  /** Units physically handed over from stock (clamped to the line quantity). */
  delivered: number;
  /** Units still waiting to go out. */
  pending: number;
  /** delivered / total, 0 when there is nothing to deliver. */
  ratio: number;
  /**
   * Physical delivery tracking only applies to real, still-active invoices:
   * quotations are never delivered, and cancelled invoices are hidden from the
   * Stock page's "Awaiting delivery" tab.
   */
  applicable: boolean;
}

/**
 * Delivery progress of an invoice, derived from `items[].deliveredQuantity`.
 *
 * This is the same arithmetic the Stock page uses for its "Awaiting delivery"
 * tab and badge counts, so a badge in the invoices table will never disagree
 * with what the Stock page shows.
 *
 * Deliberately separate from `invoice.status` - that field tracks payments and
 * is rewritten to paid/partial/pending by the pre-save hook.
 */
export function getDeliverySummary(invoice: Pick<Invoice, 'type' | 'status' | 'items'>): DeliverySummary {
  const applicable = invoice.type === 'invoice' && invoice.status !== 'cancelled';

  let total = 0;
  let delivered = 0;

  if (applicable) {
    for (const item of invoice.items ?? []) {
      // Custom lines have no stock behind them, so they never count towards
      // physical delivery - a custom-only invoice simply reads as nothing to
      // deliver (the table renders that as "—").
      if (!isDeliverableItem(item)) continue;
      const quantity = item.quantity ?? 0;
      total += quantity;
      // A line can never be delivered beyond what was invoiced.
      delivered += Math.min(quantity, Math.max(0, item.deliveredQuantity ?? 0));
    }
  }

  const pending = Math.max(0, total - delivered);

  return {
    total,
    delivered,
    pending,
    ratio: total > 0 ? delivered / total : 0,
    applicable
  };
}
