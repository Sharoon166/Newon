export interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Financial tracking fields (optional for backward compatibility)
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
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  // Financial fields can be updated by invoice/payment systems
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
}

export interface CustomerFilters {
  search?: string;
  hasOutstandingBalance?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}