export interface PaymentDetails {
  BANK_NAME: string;
  ACCOUNT_NUMBER: string;
  IBAN: string;
}

export interface InvoiceTerms {
  terms: string[];
}

export interface Settings {
  id: string;
  key: 'payment_details' | 'invoice_terms';
  value: PaymentDetails | InvoiceTerms;
  createdAt?: Date;
  updatedAt?: Date;
}
