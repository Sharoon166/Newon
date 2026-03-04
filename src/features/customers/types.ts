export interface Customer {
  id: string;
  customerId?: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  disabled?: boolean;
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export interface CustomerFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}