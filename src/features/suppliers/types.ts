export interface Supplier {
  id: string;
  supplierId?: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  disabled?: boolean;
  totalPurchased?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastPurchaseDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierDto {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

export interface SupplierFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}
