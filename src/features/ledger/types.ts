/**
 * Ledger Types
 * 
 * This file defines the types for the ledger management system.
 * The ledger tracks customer transactions, payments, and outstanding balances.
 */

// Transaction types that can affect the ledger
export type TransactionType = 'invoice' | 'payment' | 'adjustment' | 'credit_note' | 'debit_note';

// Payment methods
export type PaymentMethod = 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi' | 'card';

/**
 * LedgerEntry - Individual transaction in the ledger
 * 
 * Fields added:
 * - id: Unique identifier for the ledger entry
 * - customerId: Reference to the customer
 * - customerName: Denormalized customer name for quick access
 * - transactionType: Type of transaction (invoice, payment, adjustment, etc.)
 * - transactionId: Reference to the source transaction (invoice ID, payment ID, etc.)
 * - transactionNumber: Human-readable transaction number (INV-001, PAY-001, etc.)
 * - date: Date of the transaction
 * - description: Description of the transaction
 * - debit: Amount debited (increases customer balance - invoices, debit notes)
 * - credit: Amount credited (decreases customer balance - payments, credit notes)
 * - balance: Running balance after this transaction
 * - paymentMethod: Method of payment (if applicable)
 * - reference: Reference number (cheque number, transaction ID, etc.)
 * - notes: Additional notes about the transaction
 * - createdBy: User who created the entry
 * - createdAt: Timestamp when entry was created
 * - updatedAt: Timestamp when entry was last updated
 */
export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  transactionType: TransactionType;
  transactionId?: string;
  transactionNumber: string;
  date: string | Date;
  description: string;
  debit: number; // Amount owed by customer (invoices)
  credit: number; // Amount paid by customer (payments)
  balance: number; // Running balance
  paymentMethod?: PaymentMethod;
  reference?: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * CustomerLedger - Aggregated ledger data for a customer
 * 
 * Fields added:
 * - customerId: Reference to the customer
 * - customerName: Customer name
 * - customerCompany: Customer company name
 * - customerEmail: Customer email
 * - customerPhone: Customer phone
 * - totalDebit: Total amount debited (all invoices)
 * - totalCredit: Total amount credited (all payments)
 * - currentBalance: Current outstanding balance (totalDebit - totalCredit)
 * - lastTransactionDate: Date of the last transaction
 * - entries: Array of ledger entries for this customer
 */
export interface CustomerLedger {
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  lastTransactionDate: string | Date;
  entries: LedgerEntry[];
}

/**
 * LedgerSummary - Summary statistics for the ledger
 * 
 * Fields added:
 * - totalCustomers: Total number of customers with ledger entries
 * - totalOutstanding: Total outstanding balance across all customers
 * - totalReceived: Total amount received (all payments)
 * - totalInvoiced: Total amount invoiced
 * - customersWithBalance: Number of customers with outstanding balance
 * - overdueAmount: Total overdue amount
 * - monthlyInvoiced: Total amount invoiced this month
 * - monthlyReceived: Total amount received this month
 */
export interface LedgerSummary {
  totalCustomers: number;
  totalOutstanding: number;
  totalReceived: number;
  totalInvoiced: number;
  customersWithBalance: number;
  overdueAmount: number;
  monthlyInvoiced: number;
  monthlyReceived: number;
}

/**
 * CreateLedgerEntryDto - Data transfer object for creating a ledger entry
 */
export interface CreateLedgerEntryDto {
  customerId: string;
  customerName: string;
  customerCompany?: string;
  transactionType: TransactionType;
  transactionId?: string;
  transactionNumber: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
  createdBy: string;
}

/**
 * UpdateLedgerEntryDto - Data transfer object for updating a ledger entry
 */
export interface UpdateLedgerEntryDto {
  description?: string;
  debit?: number;
  credit?: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
}

/**
 * LedgerFilters - Filters for querying ledger entries
 * 
 * Fields added:
 * - customerId: Filter by specific customer
 * - transactionType: Filter by transaction type
 * - dateFrom: Filter by start date
 * - dateTo: Filter by end date
 * - minAmount: Filter by minimum amount
 * - maxAmount: Filter by maximum amount
 * - hasBalance: Filter customers with outstanding balance
 * - search: Search by customer name, transaction number, or description
 * - page: Page number for pagination
 * - limit: Number of items per page
 */
export interface LedgerFilters {
  customerId?: string;
  transactionType?: TransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  hasBalance?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * PaginatedLedgerEntries - Paginated response for ledger entries
 */
export interface PaginatedLedgerEntries {
  docs: LedgerEntry[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

/**
 * PaginatedCustomerLedgers - Paginated response for customer ledgers
 */
export interface PaginatedCustomerLedgers {
  docs: CustomerLedger[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}
