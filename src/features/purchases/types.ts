export interface Purchase {
  _id?: string;
  id?: string;
  purchaseId: string;
  productId: string;
  variantId: string;
  supplier: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  totalCost: number;
  purchaseDate: Date | string;
  remaining: number;
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreatePurchaseDto {
  productId: string;
  variantId: string;
  supplier: string;
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

