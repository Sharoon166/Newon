'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import { SupplierLedgerData } from '../types';

interface PrintableSupplierLedgerProps {
  ledger: SupplierLedgerData;
}

/**
 * A4 printable statement of a supplier's ledger. Screen-only chrome (back /
 * print buttons) lives on the print page, not here.
 */
export function PrintableSupplierLedger({ ledger }: PrintableSupplierLedgerProps) {
  const { supplier, entries, totalEntries, summary } = ledger;

  const addressLine = [
    supplier.address,
    [supplier.city, supplier.state].filter(Boolean).join(', '),
    supplier.zip
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-[210mm] mx-auto bg-white text-black p-8 print:p-0 print:max-w-full">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Supplier Statement</h1>
            <p className="text-sm text-gray-600">Generated on {formatDate(new Date())}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">{supplier.name}</h2>
            {supplier.company && <p className="text-sm">{supplier.company}</p>}
            <p className="text-sm">Supplier ID: {supplier.supplierId || '—'}</p>
          </div>
        </div>
      </div>

      {/* Supplier details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold mb-2">Supplier Details</h3>
          <div className="text-sm space-y-1">
            {supplier.email && <p>Email: {supplier.email}</p>}
            {supplier.phone && <p>Phone: {supplier.phone}</p>}
            {addressLine && <p>Address: {addressLine}</p>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Account Summary</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total Debits:</span>
              <span className="font-medium">{formatCurrency(summary.totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Credits:</span>
              <span className="font-medium">{formatCurrency(summary.totalCredit)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Balance Payable:</span>
              <span>{formatCurrency(summary.closingBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger entries */}
      <div>
        <h3 className="font-semibold mb-3">Ledger Entries ({totalEntries} total)</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Reference</th>
              <th className="text-right py-2">Debit</th>
              <th className="text-right py-2">Credit</th>
              <th className="text-right py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No ledger entries recorded for this supplier.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="py-2">{entry.type === 'payment' ? 'Payment' : 'Purchase'}</td>
                  <td className="py-2">
                    <span className="font-mono text-xs">{entry.reference || entry.note || '—'}</span>
                  </td>
                  <td className="py-2 text-right">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                  </td>
                  <td className="py-2 text-right">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                  </td>
                  <td className="py-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-black font-semibold">
                <td colSpan={3} className="py-2">
                  Closing Balance Payable
                </td>
                <td className="py-2 text-right">{formatCurrency(summary.totalDebit)}</td>
                <td className="py-2 text-right">{formatCurrency(summary.totalCredit)}</td>
                <td className="py-2 text-right">{formatCurrency(summary.closingBalance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
