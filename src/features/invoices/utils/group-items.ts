/**
 * Groups invoice items by variantId for display purposes.
 * The underlying data stays as separate lines (per batch/purchase),
 * but this utility computes a grouped view for the UI and print templates.
 *
 * This is a display-only transformation — no data is modified.
 */

export interface BatchEntry {
  fieldIndex: number;
  purchaseId?: string;
  quantity: number;
  rate: number;
  amount: number;
  originalRate?: number;
}

export interface GroupedInvoiceItem {
  key: string;
  productId?: string;
  variantId?: string;
  variantSKU?: string;
  description: string;
  unit: string;
  totalQuantity: number;
  unifiedRate: number;
  totalAmount: number;
  isVirtualProduct: boolean;
  virtualProductId?: string;
  batches: BatchEntry[];
  totalOriginalCost: number;
}

/**
 * Group an array of form items (which may have multiple entries per variant)
 * into one GroupedInvoiceItem per unique variant.
 *
 * For virtual products, groups by virtualProductId.
 * For regular products, groups by variantId.
 */
export function groupItemsByVariant<T extends {
  id?: string;
  variantId?: string;
  variantSKU?: string;
  virtualProductId?: string;
  isVirtualProduct?: boolean;
  description?: string;
  productName?: string;
  quantity: number;
  unit?: string;
  rate: number;
  amount: number;
  purchaseId?: string;
  originalRate?: number;
  productId?: string;
}>(
  items: T[],
  options?: { preserveOrder?: boolean }
): GroupedInvoiceItem[] {
  const groupMap = new Map<string, GroupedInvoiceItem>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.quantity <= 0) continue; // skip fully-consumed batches
    const isVP = item.isVirtualProduct === true;
    const groupKey = isVP ? `vp_${item.virtualProductId}` : `variant_${item.variantId}`;
    const itemDescription = item.description || item.productName || 'Unnamed';

    const originalCost = isVP
      ? 0 // VP cost is handled separately via componentBreakdown
      : (item.originalRate || 0) * item.quantity;

    const batch: BatchEntry = {
      fieldIndex: i,
      purchaseId: item.purchaseId,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      originalRate: item.originalRate
    };

    if (groupMap.has(groupKey)) {
      const existing = groupMap.get(groupKey)!;
      existing.batches.push(batch);
      existing.totalQuantity += item.quantity;
      existing.totalAmount += item.amount;
      existing.totalOriginalCost += originalCost;
      // unifiedRate = simple average of batch rates (not quantity-weighted),
      // so it stays stable regardless of how many units come from each batch.
      const batchCount = existing.batches.length;
      existing.unifiedRate = (existing.unifiedRate * (batchCount - 1) + item.rate) / batchCount;
    } else {
      groupMap.set(groupKey, {
        key: groupKey,
        productId: item.productId || item.variantId || item.virtualProductId,
        variantId: item.variantId,
        variantSKU: item.variantSKU,
        description: itemDescription,
        unit: item.unit || 'pcs',
        totalQuantity: item.quantity,
        unifiedRate: item.rate,
        totalAmount: item.amount,
        isVirtualProduct: isVP,
        virtualProductId: item.virtualProductId,
        batches: [batch],
        totalOriginalCost: originalCost
      });
    }
  }

  return Array.from(groupMap.values());
}

/**
 * Builds the live "effective stock" map per purchase — remaining minus quantity
 * already consumed by current form items (+ consumption added back by restored
 * items in the edit flow). This is the single source of truth used by both the
 * product selector and the grouped line-item stepper, so FIFO batch advance and
 * the stock shown on the cards can never disagree.
 */
export function buildEffectiveStockByPurchase(
  purchases: Array<{ purchaseId: string; remaining: number }>,
  items: Array<{
    purchaseId?: string;
    virtualProductId?: string;
    quantity: number;
    componentBreakdown?: Array<{ purchaseId: string; quantity: number }>;
  }>,
  restoredItems?: Array<{
    purchaseId?: string;
    virtualProductId?: string;
    quantity: number;
    componentBreakdown?: Array<{ purchaseId: string; quantity: number }>;
  }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of purchases) {
    map.set(p.purchaseId, p.remaining);
  }
  const apply = (
    arr: Array<{
      purchaseId?: string;
      virtualProductId?: string;
      quantity: number;
      componentBreakdown?: Array<{ purchaseId: string; quantity: number }>;
    }>,
    sign: 1 | -1
  ) => {
    for (const item of arr) {
      if (!item.virtualProductId && item.purchaseId) {
        map.set(item.purchaseId, (map.get(item.purchaseId) ?? 0) + sign * item.quantity);
      }
      if (item.componentBreakdown) {
        for (const comp of item.componentBreakdown) {
          map.set(comp.purchaseId, (map.get(comp.purchaseId) ?? 0) + sign * comp.quantity);
        }
      }
    }
  };
  if (restoredItems) apply(restoredItems, 1);
  apply(items, -1);
  return map;
}
