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

