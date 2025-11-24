// Shared types for invoice and quotation templates
// These are simplified versions of the full Invoice type for template rendering

export type TemplateItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  productId?: string;
  variantId?: string;
  variantSKU?: string;
  purchaseId?: string;
};

export type TemplateCompanyDetails = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website?: string;
};

export type TemplateClientDetails = {
  name: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
};

export type TemplatePaymentDetails = {
  bankName: string;
  accountNumber: string;
  iban: string;
};

export type InvoiceTemplateData = {
  logo?: string;
  company: TemplateCompanyDetails;
  client: TemplateClientDetails;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: TemplateItem[];
  taxRate: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes?: string;
  terms?: string;
  paymentDetails: TemplatePaymentDetails;
  outstandingBalance?: number;
  paid: number;
  remainingPayment: number;
  amountInWords?: string;
  billingType?: 'wholesale' | 'retail';
  market?: 'newon' | 'waymor';
  customerId?: string;
};

export type QuotationTemplateData = {
  logo?: string;
  company: TemplateCompanyDetails;
  client: TemplateClientDetails;
  quotationNumber: string;
  date: string;
  validUntil: string;
  items: TemplateItem[];
  taxRate: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes?: string;
  terms?: string;
  amountInWords?: string;
  billingType?: 'wholesale' | 'retail';
  market?: 'newon' | 'waymor';
  customerId?: string;
};
