import type { ExpenseCategory } from '@/features/expenses/types';

export interface VirtualProductComponent {
  productId: string;
  variantId: string;
  quantity: number;
  // Populated fields (not in DB)
  productName?: string;
  sku?: string;
  image?: string;
  availableStock?: number;
}

export interface CustomExpense {
  name: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
}

export interface VirtualProduct {
  _id?: string;
  id?: string;
  name: string;
  sku: string;
  description: string;
  components: VirtualProductComponent[];
  customExpenses: CustomExpense[];
  basePrice: number;
  categories: string[];
  disabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnhancedVirtualProduct extends VirtualProduct {
  availableQuantity: number; // Calculated based on minimum stock of components
  estimatedComponentCost: number; // Calculated from FIFO purchase prices
  totalCustomExpenses: number; // Sum of custom expenses
  estimatedTotalCost: number; // estimatedComponentCost + totalCustomExpenses
  estimatedProfit: number; // basePrice - estimatedTotalCost
  components: (VirtualProductComponent & {
    productName: string;
    sku: string;
    image?: string;
    availableStock: number;
  })[];
}

// Lean types for MongoDB documents (used in server actions)
export interface LeanVirtualProduct {
  _id: { toString: () => string };
  name: string;
  sku: string;
  description?: string;
  basePrice: number;
  categories?: string[];
  disabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  components: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  customExpenses?: CustomExpense[];
}
