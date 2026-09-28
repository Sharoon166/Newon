/**
 * Name of a `kind: 'reversal'` slip, stored on the movement itself as
 * `returnKind` when the reversal is created:
 *
 *   - `purchase`  a receipt was undone - the stock goes back to the supplier;
 *   - `sales`     a delivery was undone - the stock comes back from the customer;
 *   - `correction` a quick count was undone - no document is involved, only a
 *                  counted number is put back.
 *
 * Stored rather than derived, so the name is decided once, at creation.
 */
export type ReturnFlavor = 'purchase' | 'sales' | 'correction';

export interface ReturnLabels {
  /** Name of the entry (the Type badge in History, the printed slip header). */
  badge: string;
  /** Challan button / sheet title. */
  challan: string;
  /** Header printed on the challan itself (upper case, like the others). */
  challanTitle: string;
  /** "Purchase return of" - used for the note and the challan reference. */
  ofLabel: string;
  /** Plural used by filters and printed summaries. */
  plural: string;
}

export const RETURN_LABELS: Record<ReturnFlavor, ReturnLabels> = {
  purchase: {
    badge: 'Purchase return',
    challan: 'Purchase return challan',
    challanTitle: 'PURCHASE RETURN CHALLAN',
    ofLabel: 'Purchase return of',
    plural: 'Purchase returns'
  },
  sales: {
    badge: 'Sales return',
    challan: 'Sales return challan',
    challanTitle: 'SALES RETURN CHALLAN',
    ofLabel: 'Sales return of',
    plural: 'Sales returns'
  },
  correction: {
    badge: 'Correction',
    challan: 'Correction challan',
    challanTitle: 'CORRECTION CHALLAN',
    ofLabel: 'Correction of',
    plural: 'Corrections'
  }
};

/** Footer terms printed on each flavor of return challan. */
export const RETURN_TERMS: Record<ReturnFlavor, string[]> = {
  purchase: ['1. Stock returned to the supplier against the purchase shown above.'],
  sales: ['1. Stock returned by the customer against the invoice shown above.'],
  correction: ['1. This slip puts the counted quantity of the movement named above back to its previous value.']
};

/** Labels for the slip at hand: `returnLabels(movement).badge`. */
export function returnLabels(movement: { returnKind: ReturnFlavor }): ReturnLabels {
  return RETURN_LABELS[movement.returnKind];
}
