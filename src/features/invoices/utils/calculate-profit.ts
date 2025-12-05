/**
 * Calculate profit for an invoice using originalRate and rate from items
 * Profit = Sum of (rate - originalRate) * quantity for all items - invoice discount
 * 
 * Formula:
 * 1. For each item: itemProfit = (rate - originalRate) * quantity
 * 2. Sum all item profits
 * 3. Subtract invoice-level discount
 * 
 * Note: Tax (GST) is not included in profit as it's passed to government
 */

interface ItemWithProfit {
  rate: number;
  originalRate?: number;
  quantity: number;
}

export function calculateInvoiceProfit(
  items: ItemWithProfit[],
  discountAmount: number
): number {
  const finalProfit = items.reduce((sum, item) => {
    const costPrice = item.originalRate ?? 0;
    const sellingPrice = item.rate;
    const profitPerUnit = sellingPrice - costPrice;
    return sum + (profitPerUnit * item.quantity);
  }, 0) - discountAmount

  // Return profit (can be negative if selling at a loss)
  return finalProfit;
}

/**
 * Check if an invoice is custom (prices were manually changed)
 * An invoice is custom if any item's rate differs from originalRate
 */
export function isInvoiceCustom(items: ItemWithProfit[]): boolean {
  for (const item of items) {
    // If no originalRate, it's a custom/manual entry
    if (item.originalRate === undefined) {
      return true;
    }

    // If rate differs from originalRate, prices were changed
    // Use small tolerance for floating point comparison
    if (Math.abs(item.rate - item.originalRate) > 0.01) {
      return true;
    }
  }

  return false;
}
