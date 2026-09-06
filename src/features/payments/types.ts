// Payment method options (shared with invoices)
export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';

// A single allocation of the general payment against an open invoice
export interface GeneralPaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

// GeneralPayment entity
export interface GeneralPayment {
  _id?: string;
  id?: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: string | Date;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  allocations: GeneralPaymentAllocation[];
  allocatedAmount: number;
  unallocatedAmount: number;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// For creating a new general payment
export interface CreateGeneralPaymentDto {
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: Date;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  allocations: GeneralPaymentAllocation[];
}

// Filters for the payments list
export interface GeneralPaymentFilters {
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

// Paginated response
export interface PaginatedGeneralPayments {
  docs: GeneralPayment[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

// Open invoice available for allocation
export interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  balanceAmount: number;
}