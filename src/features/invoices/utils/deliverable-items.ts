import type { InvoiceItem } from '../types';

/**
 * Sentinel `productId`s written on manually added ("custom") invoice lines -
 * services, charges, anything typed in by hand that is not stock.
 *
 * Two spellings exist because two forms write them:
 *   - `new-invoice-form-wrapper.tsx` / `invoice-form-wrapper.tsx` use 'manual-entry'
 *   - `quotation-conversion-form.tsx` uses 'custom-item'
 */
export const CUSTOM_ITEM_PRODUCT_IDS = ['manual-entry', 'custom-item'];

/** The slice of an invoice item this module reasons about. */
export type DeliverableItem = Pick<
  InvoiceItem,
  'productId' | 'variantId' | 'purchaseId' | 'virtualProductId' | 'isVirtualProduct' | 'componentBreakdown'
>;

/**
 * A virtual product (a recipe of other products). Its physical units are the
 * components, never the VP itself, so it is delivered by delivering those.
 *
 * `isVirtualProduct` and `virtualProductId` are written together, but either
 * alone is enough - older rows and hand-converted quotations only agree on one.
 */
export function isVirtualItem(item: Pick<DeliverableItem, 'virtualProductId' | 'isVirtualProduct'>): boolean {
  return item.isVirtualProduct === true || !!item.virtualProductId;
}

/**
 * A custom line: not a virtual product, and either carrying a sentinel
 * productId or pointing at no product/variant/purchase at all. There is
 * physically nothing to hand over, so it never takes part in delivery.
 *
 * A real product that merely had its rate edited still has a `variantId`, so it
 * stays deliverable - only true hand-typed lines are skipped.
 */
export function isCustomItem(item: DeliverableItem): boolean {
  if (isVirtualItem(item)) return false;
  if (CUSTOM_ITEM_PRODUCT_IDS.includes(item.productId ?? '')) return true;
  return !item.variantId && !item.purchaseId;
}

/**
 * Whether a line counts towards physical delivery: everything except custom
 * lines. Virtual products qualify - their components are what ships.
 *
 * Used by the Stock page's "Awaiting delivery" tab, its badge counts, the
 * invoice delivery card and `getDeliverySummary`, so all four always agree.
 */
export function isDeliverableItem(item: DeliverableItem): boolean {
  return !isCustomItem(item);
}

/**
 * Mongo `$expr` mirror of {@link isDeliverableItem}, for the aggregate queries
 * in `getAwaitingDelivery` / `getStockWorkCounts` that sum pending units
 * directly in the database.
 *
 * Keep this in step with the functions above - they are one rule expressed
 * twice. `itemPath` is the `$map` accumulator, e.g. `'$$i'`.
 */
export function deliverableItemMongoExpr(itemPath: string): Record<string, unknown> {
  const field = (name: string) => `${itemPath}.${name}`;
  // $toString keeps this safe if a legacy row stored an id as a non-string.
  const str = (name: string) => ({ $toString: { $ifNull: [field(name), ''] } });
  const nonEmpty = (name: string) => ({ $gt: [{ $strLenCP: str(name) }, 0] });

  return {
    $or: [
      // Virtual products ship as their components. This branch mirrors
      // `isVirtualItem`: either flag on its own is enough, because older rows
      // and hand-converted quotations only agree on one of them. Keep both
      // copies in step or the tab and the aggregate counts will disagree.
      {
        $or: [
          { $eq: [{ $ifNull: [field('isVirtualProduct'), false] }, true] },
          nonEmpty('virtualProductId')
        ]
      },
      {
        $and: [
          // Not one of the hand-typed sentinels...
          { $eq: [{ $in: [str('productId'), CUSTOM_ITEM_PRODUCT_IDS] }, false] },
          // ...and actually tied to stock.
          { $or: [nonEmpty('variantId'), nonEmpty('purchaseId')] }
        ]
      }
    ]
  };
}
