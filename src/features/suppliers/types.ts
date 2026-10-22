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
  /** ISO 3166-1 alpha-2 code, e.g. "PK" for Pakistan */
  country?: string;
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
  country?: string;
  notes?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

export interface SupplierFilters {
  search?: string;
  /** ISO 3166-1 alpha-2 code (e.g. "PK") to narrow results to one country. */
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

/**
 * A single row in a supplier's mini ledger. Purchases are debits (what the
 * supplier is owed), payments recorded against those purchases are credits.
 */
export interface SupplierLedgerEntry {
  id: string;
  date: Date;
  type: 'purchase' | 'payment';
  /** Purchase id (e.g. "PR-25-001") or payment reference */
  reference?: string;
  method?: string;
  note?: string;
  debit: number;
  credit: number;
  /** Running balance owed to the supplier after this entry */
  balance: number;
}

export interface SupplierLedgerSummary {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface SupplierLedgerData {
  supplier: Supplier;
  entries: SupplierLedgerEntry[];
  totalEntries: number;
  summary: SupplierLedgerSummary;
}
