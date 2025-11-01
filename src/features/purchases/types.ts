export interface Purchase {
  _id?: string;
  id?: string;
  productId: string;
  variantId: string;
  supplier: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
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
  purchaseDate: Date | string;
  notes?: string;
}

export interface UpdatePurchaseDto {
  supplier?: string;
  locationId?: string;
  quantity?: number;
  unitPrice?: number;
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

