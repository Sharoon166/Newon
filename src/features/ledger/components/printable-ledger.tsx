'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { LedgerEntry } from '../types';
import { Printer } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Date | string;
  dueDate?: Date | string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  type: string;
}

interface PrintableLedgerProps {
  customerInfo: {
    customerId: string;
    customerName: string;
    customerCompany?: string;
    customerEmail: string;
    customerPhone: string;
  };
  ledgerEntries: LedgerEntry[];
  invoices: Invoice[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
  };
}

export function PrintableLedger({ customerInfo, ledgerEntries, invoices, summary }: PrintableLedgerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef
  });

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'credit_note':
        return 'bg-purple-100 text-purple-800';
      case 'debit_note':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ledger-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .ledger-content {
            flex: 1;
          }
          .ledger-footer {
            margin-top: auto;
            page-break-inside: avoid;
          }
          /* Prevent awkward page breaks */
          .summary-section,
          .transaction-item,
          .invoice-item {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .section-header {
            page-break-after: avoid;
            break-after: avoid;
          }
          /* Keep header with first item */
          h3 {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
        @media screen {
          body {
            background-color: #f5f5f5;
          }
        }
      `}</style>

      {/* Print Button - Only visible on screen */}
      <div className="max-w-[210mm] mx-auto mb-4 print:hidden fixed right-8 bottom-4">
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="h-4 w-4 mr-2" />
          Print Ledger
        </Button>
      </div>

      <div
        ref={contentRef}
        className="max-w-[210mm] w-full mx-auto bg-white shadow-lg print:shadow-none py-8 px-10 print:py-4 print:px-4 ledger-page"
      >
        <div className="ledger-content space-y-6 print:space-y-4">
          {/* Header */}
          <div className="border-b-4 border-gray-900 pb-6 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">LEDGER STATEMENT</h1>
              <p className="text-sm text-gray-600">Statement Date: {formatDate(new Date())}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100 p-6 border-l-4 border-gray-900">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Account Holder</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{customerInfo.customerName}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {customerInfo.customerCompany && (
                <div>
                  <p className="text-gray-500 text-xs uppercase">Company</p>
                  <p className="text-gray-900 font-medium">{customerInfo.customerCompany}</p>
                </div>
              )}
              {customerInfo.customerEmail && (
                <div>
                  <p className="text-gray-500 text-xs uppercase">Email</p>
                  <p className="text-gray-900 font-medium">{customerInfo.customerEmail}</p>
                </div>
              )}
              {customerInfo.customerPhone && (
                <div>
                  <p className="text-gray-500 text-xs uppercase">Phone</p>
                  <p className="text-gray-900 font-medium">{customerInfo.customerPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="@container summary-section">
            <div className="grid gap-4 grid-cols-2 @lg:grid-cols-3 print:gap-3 print:grid-cols-2">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide mb-1">Total Invoiced</p>
                <p className="text-lg font-bold">{formatCurrency(summary.totalDebit)}</p>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide mb-1">Total Paid</p>
                <p className="text-lg font-bold">{formatCurrency(summary.totalCredit)}</p>
              </div>

              <div
                className={`border-2 rounded-lg p-4 ${summary.currentBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}
              >
                <p className={`text-xs uppercase tracking-wide mb-1`}>Outstanding Balance</p>
                <p className={`text-lg font-bold`}>{formatCurrency(summary.currentBalance)}</p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4 section-header">
              <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
              <p className="text-sm text-gray-500 print:hidden">
                {ledgerEntries.length} transaction{ledgerEntries.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2 print:space-y-1.5">
              {ledgerEntries.map(entry => (
                <div
                  key={entry.id}
                  className="transaction-item border-2 border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow print:hover:shadow-none print:p-3"
                >
                  {/* First Row: Transaction Info */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(new Date(entry.date))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Transaction #</p>
                        <p className="text-sm font-bold text-gray-900">{entry.transactionNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                        <Badge className={getTransactionTypeColor(entry.transactionType)}>
                          {entry.transactionType.replace('_', ' ')}
                        </Badge>
                      </div>
                      {entry.description && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                          <p className="text-sm text-gray-700">{entry.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Second Row: Financial Details */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex gap-6 print:gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Debit</p>
                        <p className="text-base font-bold text-gray-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Credit</p>
                        <p className="text-base font-bold text-green-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          {invoices.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 section-header">
                <h3 className="text-xl font-bold text-gray-900">All Invoices and Quotations</h3>
                <p className="text-sm text-gray-500 print:hidden">
                  {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-2 print:space-y-1.5">
                {invoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="invoice-item border-2 border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow print:hover:shadow-none print:p-3"
                  >
                    {/* First Row: Invoice Info */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {invoice.type === 'invoice' ? 'Invoice' : 'Quotation'}
                          </p>
                          <p className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(new Date(invoice.date))}</p>
                        </div>
                        {invoice.dueDate && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Due Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(new Date(invoice.dueDate))}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                        <Badge className={cn(getStatusColor(invoice.status), 'capitalize')}>{invoice.status}</Badge>
                      </div>
                    </div>

                    {/* Second Row: Financial Details */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex gap-6 print:gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                          <p className="text-base font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Paid</p>
                          <p className="text-base font-bold text-green-700">{formatCurrency(invoice.paidAmount)}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Balance</p>
                          <p
                            className={cn(
                              'text-base font-bold',
                              invoice.balanceAmount > 0 ? 'text-amber-600' : 'text-green-600'
                            )}
                          >
                            {formatCurrency(invoice.balanceAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ledger-footer mt-12 pt-6 border-t-2 border-gray-300 print:mt-8">
          <div className="flex justify-between items-center">
            <div className="text-left space-y-1">
              <p className="text-xs text-gray-500 italic">
                This is a computer-generated statement and does not require a signature.
              </p>
              <p className="text-xs text-gray-400">For any queries, please contact our accounts department.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
