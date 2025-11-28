// Invoice status type
export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

// Payment interface
export interface Payment {
  id?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  date: string | Date; // Can be string (from DB) or Date (for forms)
  reference?: string;
  notes?: string;
}

// Invoice item interface
export interface InvoiceItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantSKU?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
  stockLocation?: string;
  purchaseId?: string;
}

// Main Invoice interface
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'invoice' | 'quotation';
  date: string | Date; // Can be string (from DB) or Date (for forms)
  dueDate?: string | Date;
  billingType: 'wholesale' | 'retail';
  market: 'newon' | 'waymor';
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  gstAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  paidAmount: number;
  balanceAmount: number;
  payments: Payment[];
  stockDeducted: boolean;
  notes?: string;
  termsAndConditions?: string;
  amountInWords?: string;
  validUntil?: string | Date;
  convertedToInvoice?: boolean;
  convertedInvoiceId?: string;
  description?: string;
  profit?: number;
  custom: boolean;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Create Invoice DTO
export interface CreateInvoiceDto {
  invoiceNumber?: string; // Optional - will be auto-generated if not provided
  type: 'invoice' | 'quotation';
  date: Date;
  dueDate?: Date;
  billingType: 'wholesale' | 'retail';
  market: 'newon' | 'waymor';
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  gstAmount: number;
  totalAmount: number;
  status?: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  paidAmount?: number;
  balanceAmount: number;
  payments?: Payment[]; // Initial payments (if any paid amount during creation)
  stockDeducted?: boolean;
  notes?: string;
  termsAndConditions?: string;
  amountInWords?: string;
  validUntil?: Date;
  description?: string;
  profit?: number;
  custom?: boolean;
  createdBy: string;
}

// Update Invoice DTO
export interface UpdateInvoiceDto {
  date?: Date;
  dueDate?: Date;
  billingType?: 'wholesale' | 'retail';
  market?: 'newon' | 'waymor';
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  gstAmount?: number;
  totalAmount?: number;
  status?: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  paidAmount?: number;
  balanceAmount?: number;
  stockDeducted?: boolean;
  notes?: string;
  termsAndConditions?: string;
  amountInWords?: string;
  validUntil?: Date;
  convertedToInvoice?: boolean;
  convertedInvoiceId?: string;
  description?: string;
  profit?: number;
  custom?: boolean;
}

// Add Payment DTO
export interface AddPaymentDto {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  date: Date;
  reference?: string;
  notes?: string;
}

// Invoice filters
export interface InvoiceFilters {
  type?: 'invoice' | 'quotation';
  status?: string;
  customerId?: string;
  market?: 'newon' | 'waymor';
  billingType?: 'wholesale' | 'retail';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// Paginated invoices response
export interface PaginatedInvoices {
  docs: Invoice[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}
