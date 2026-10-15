export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';

export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface PurchasePayment {
  _id?: string;
  amount: number;
  method: PaymentMethod;
  date: Date | string;
  reference?: string;
  notes?: string;
}

export interface AddPurchasePaymentDto {
  amount: number;
  method: PaymentMethod;
  date: Date | string;
  reference?: string;
  notes?: string;
}

export interface Purchase {
  _id?: string;
  id?: string;
  purchaseId: string;
  productId: string;
  variantId: string;
  supplier: string;
  /** Business id (e.g. "SP-25-001") of the linked Supplier, when linked. */
  supplierId?: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  totalCost: number;
  purchaseDate: Date | string;
  remaining: number;
  receivedQuantity?: number;
  notes?: string;
  /** Where the product comes from - mirrored from the linked Product document. */
  origin?: 'local' | 'imported';
  /** Partial payment tracking. Amount owed = totalCost (shipping excluded). */
  payments?: PurchasePayment[];
  paidAmount?: number;
  amountDue?: number;
  balanceAmount?: number;
  paymentStatus?: PurchasePaymentStatus;
  /**
   * True for purchases that predate payment tracking. They have no recorded
   * payments and are treated as already settled (shown as Paid), but flagged so
   * the UI can explain that their payment history is not tracked.
   */
  isUntracked?: boolean;
  /**
   * Set by the pre-save hook once the purchase participates in payment
   * tracking. Raw payloads (e.g. getPurchasesByVariantId) expose this instead
   * of the derived `isUntracked` flag returned by getAllPurchases.
   */
  paymentsTracked?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreatePurchaseDto {
  productId: string;
  variantId: string;
  supplier: string;
  supplierId?: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  purchaseDate: Date | string;
  notes?: string;
}

export interface UpdatePurchaseDto {
  supplier?: string;
  supplierId?: string;
  locationId?: string;
  quantity?: number;
  unitPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  shippingCost?: number;
  purchaseDate?: Date | string;
  remaining?: number;
  notes?: string;
}

export interface PurchaseAggregate {
  purchaseHistory: Purchase[];
  totalPurchased: number;
  totalCost: number;
}

export interface ProductWithPurchases {
  _id: string;
  name: string;
  supplier: string;
  purchaseHistory?: Purchase[];
  totalPurchased?: number;
  totalCost?: number;
}

export interface VariantWithPurchases {
  variantId: string;
  sku: string;
  purchaseHistory?: Purchase[];
  totalPurchased?: number;
  totalCost?: number;
}

export interface PurchaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  supplier?: string;
  /**
   * Exact business id of the linked Supplier (e.g. "SP-25-001"). When set it
   * takes precedence over the loose name filter, with an exact-name fallback
   * for purchases that predate supplier linking.
   */
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedPurchases {
  docs: Purchase[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}
