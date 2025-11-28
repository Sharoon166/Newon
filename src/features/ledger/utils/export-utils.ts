/**
 * Ledger Export Utilities
 * 
 * Functions for exporting and printing ledger data
 */

import { toast } from 'sonner';
import { CustomerLedger, LedgerEntry } from '../types';
import { formatDate } from '@/lib/utils';

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCsvField(field: string | number | undefined): string {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export ledger data to CSV
 */
export function exportLedgerToCsv(data: CustomerLedger[]): void {
  try {
    const headers = ['Customer Name', 'Company', 'Email', 'Phone', 'Total Invoiced', 'Total Paid', 'Outstanding Balance', 'Last Transaction'];
    const rows = data.map(item => [
      escapeCsvField(item.customerName),
      escapeCsvField(item.customerCompany || ''),
      escapeCsvField(item.customerEmail || ''),
      escapeCsvField(item.customerPhone),
      escapeCsvField(item.totalDebit.toFixed(2)),
      escapeCsvField(item.totalCredit.toFixed(2)),
      escapeCsvField(item.currentBalance.toFixed(2)),
      escapeCsvField(formatDate(new Date(item.lastTransactionDate)))
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Ledger exported to CSV successfully');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast.error('Failed to export ledger to CSV');
  }
}

/**
 * Export ledger data to PDF (navigates to print page)
 */
export function exportLedgerToPdf(_data: CustomerLedger[]): void {
  try {
    // Navigate to print page - data will be fetched server-side
    window.location.href = '/ledger/print';
  } catch (error) {
    console.error('Error navigating to print page:', error);
    toast.error('Failed to open print page');
  }
}


/**
 * Export ledger entries to CSV
 */
export function exportLedgerEntriesToCsv(
  data: LedgerEntry[],
  customerName?: string
): void {
  try {
    const headers = [
      'Date',
      'Transaction #',
      'Type',
      'Description',
      'Debit',
      'Credit',
      'Balance',
      'Payment Method',
      'Reference'
    ];
    
    const rows = data.map(item => [
      escapeCsvField(formatDate(new Date(item.date))),
      escapeCsvField(item.transactionNumber),
      escapeCsvField(item.transactionType.replace('_', ' ')),
      escapeCsvField(item.description),
      escapeCsvField(item.debit.toFixed(2)),
      escapeCsvField(item.credit.toFixed(2)),
      escapeCsvField(item.balance.toFixed(2)),
      escapeCsvField(item.paymentMethod || '-'),
      escapeCsvField(item.reference || '-')
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = customerName 
      ? `ledger-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      : `ledger-entries-${new Date().toISOString().split('T')[0]}.csv`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Ledger entries exported to CSV successfully');
  } catch (error) {
    console.error('Error exporting entries to CSV:', error);
    toast.error('Failed to export ledger entries to CSV');
  }
}

/**
 * Export ledger entries to PDF (navigates to customer print page)
 */
export function exportLedgerEntriesToPdf(
  customerId: string
): void {
  try {
    // Navigate to the customer's print page
    const printUrl = `/ledger/${customerId}/print`;
    window.open(printUrl, '_blank');
    
    toast.success('Opening print page');
  } catch (error) {
    console.error('Error opening print page:', error);
    toast.error('Failed to open print page');
  }
}

/**
 * Print ledger entries (navigates to customer print page)
 */
export function printLedgerEntries(customerId: string): void {
  exportLedgerEntriesToPdf(customerId);
}
