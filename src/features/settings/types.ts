export interface PaymentDetails {
  BANK_NAME: string;
  ACCOUNT_NUMBER: string;
  IBAN: string;
}

export interface InvoiceTerms {
  terms: string[];
}

/**
 * Everything the app prints about a brand. Stored per brand id in the
 * `brand_settings` document; `ntnNo` / `strnNo` / `invoiceTitle` are optional
 * because not every brand is registered or prints a custom invoice heading.
 */
export interface BrandSettings {
  /** Stable key - also the invoice `market` value and the store's brand id. */
  id: string;
  displayName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
  ntnNo?: string;
  strnNo?: string;
  /** Heading printed on invoices; empty/undefined falls back to "Sale Invoice". */
  invoiceTitle?: string;
  /** Brand-specific payment details; falls back to global payment details if not set. */
  paymentDetails?: {
    bankName: string;
    accountNumber: string;
    iban: string;
  };
}

/** Brand id -> its settings (`{ newon: {...}, waymor: {...} }`). */
export type BrandSettingsMap = Record<string, BrandSettings>;

export interface Settings {
  id: string;
  key: 'payment_details' | 'invoice_terms' | 'brand_settings';
  value: PaymentDetails | InvoiceTerms | BrandSettingsMap;
  createdAt?: Date;
  updatedAt?: Date;
}
