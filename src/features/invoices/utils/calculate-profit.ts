/**
 * Calculate profit for an invoice using originalRate and rate from items
 * Profit = Sum of (rate - originalRate) * quantity for all items - invoice discount
 *
 * Formula:
 * 1. For regular items: itemProfit = (rate - originalRate) * quantity
 * 2. For virtual products: itemProfit = rate - (totalComponentCost + totalCustomExpenses)
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
  totalComponentCost?: number;
  totalCustomExpenses?: number;
  isVirtualProduct?: boolean;
}

export function calculateInvoiceProfit(items: ItemWithProfit[], discountAmount: number): number {
  const finalProfit =
    items.reduce((sum, item) => {
      // For virtual products, calculate profit as: (sellingPrice - (componentCost + customExpensesCost)) * quantity
      if (item.isVirtualProduct) {
        const componentCost = item.totalComponentCost || 0;
        const customExpensesCost = item.totalCustomExpenses || 0;
        const totalCost = componentCost + customExpensesCost;
        const profitPerUnit = item.rate - totalCost;
        const itemProfit = profitPerUnit * item.quantity;
        return sum + itemProfit;
      }

      // For regular items with custom expenses, use actualCost as the cost basis
      if (item.customExpenses && item.customExpenses.length > 0) {
        const customCost = item.customExpenses.reduce((s, e) => s + e.actualCost, 0);
        const itemProfit = (item.rate * item.quantity) - (customCost * item.quantity);
        return sum + itemProfit;
      }

      // For regular items, calculate profit from rate vs originalRate
      const costPrice = item.originalRate ?? 0;
      const sellingPrice = item.rate;
      const profitPerUnit = sellingPrice - costPrice;
      const itemProfit = profitPerUnit * item.quantity;

      return sum + itemProfit;
    }, 0) - discountAmount;

  // Return profit (can be negative if selling at a loss)
  return finalProfit;
}

