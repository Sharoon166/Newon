/**
 * Type definitions for stock deduction tracking
 * These types ensure accurate FIFO cost tracking for virtual products
 */

/**
 * Represents a single purchase used in stock deduction
 */
export interface PurchaseUsage {
  purchaseId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Represents component breakdown for a virtual product
 * Tracks which purchases were used for each component
 */
export interface ComponentDeduction {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  purchases: PurchaseUsage[];
}

/**
 * Represents stock deduction for a regular (non-virtual) product
 */
export interface RegularProductDeduction {
  purchases: PurchaseUsage[];
}

/**
 * Represents the actual stock deduction for a single invoice item
 */
export interface ItemDeduction {
  itemIndex: number;
  isVirtualProduct: boolean;
  virtualProductId?: string;
  productId?: string;
  variantId?: string;
  componentBreakdown?: ComponentDeduction[];
  regularPurchases?: PurchaseUsage[];
}

/**
 * Input for stock deduction function
 */
export interface StockDeductionInput {
  purchaseId?: string;
  quantity: number;
  isVirtualProduct?: boolean;
  virtualProductId?: string;
  productId?: string;
  variantId?: string;
}

/**
 * Result of stock deduction operation
 */
export interface StockDeductionResult {
  success: boolean;
  errors: string[];
  actualDeductions: ItemDeduction[];
}

/**
 * Represents a deduction that needs to be rolled back
 */
export interface DeductionToRollback {
  purchaseId: string;
  quantity: number;
}
