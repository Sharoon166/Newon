/**
 * Calculate profit for an invoice using originalRate and rate from items
 * Profit = Sum of (rate - originalRate) * quantity for all items - invoice discount
 * 
 * Formula:
 * 1. For each item: itemProfit = (rate - originalRate) * quantity
 * 2. For custom expenses: add (clientCost - actualCost) to profit
 * 3. Sum all item profits
 * 4. Subtract invoice-level discount
 * 
 * Note: Tax (GST) is not included in profit as it's passed to government
 */

interface CustomExpense {
  actualCost: number;
  clientCost: number;
}

interface ItemWithProfit {
  rate: number;
  originalRate?: number;
  quantity: number;
  customExpenses?: CustomExpense[];
}

export function calculateInvoiceProfit(
  items: ItemWithProfit[],
  discountAmount: number
): number {
  const finalProfit = items.reduce((sum, item) => {
    const costPrice = item.originalRate ?? 0;
    const sellingPrice = item.rate;
    const profitPerUnit = sellingPrice - costPrice;
    const itemProfit = profitPerUnit * item.quantity;
    
    // Add profit from custom expenses (clientCost - actualCost)
    const customExpenseProfit = item.customExpenses?.reduce((expSum, exp) => {
      return expSum + (exp.clientCost - exp.actualCost);
    }, 0) ?? 0;
    
    return sum + itemProfit + customExpenseProfit;
  }, 0) - discountAmount

  // Return profit (can be negative if selling at a loss)
  return finalProfit;
}

