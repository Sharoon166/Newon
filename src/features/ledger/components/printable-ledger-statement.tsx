'use client';

import { LedgerEntry } from '../types';
import useBrandStore from '@/stores/useBrandStore';

interface PrintableLedgerStatementProps {
  customerInfo: {
    customerId: string;
    customerName: string;
    customerCompany?: string;
    customerEmail: string;
    customerPhone: string;
  };
  ledgerEntries: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
  };
}

/** Rs 732,650.00 - always two decimals, no compact notation. */
const money = (value?: number) =>
  `Rs ${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 29-09-2024 */
const stmtDate = (date: string | Date) => {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const PARTICULAR_LABEL: Record<string, string> = {
  invoice: 'SALE',
  payment: 'RECEIPT',
  adjustment: 'ADJUSTMENT',
  credit_note: 'CREDIT NOTE',
  debit_note: 'DEBIT NOTE'
};

/**
 * Professional ledger statement - company letterhead + a single running
 * ledger table (No. | Date | Particular | Sales | Payment | Adjustment | Balance).
 * Renders the exact same ledger data as PrintableLedger, only the presentation
 * differs. Print button lives on the page that hosts it.
 */
export function PrintableLedgerStatement({
  customerInfo,
  ledgerEntries,
  summary
}: PrintableLedgerStatementProps) {
  const getCurrentBrand = useBrandStore(state => state.getCurrentBrand);
  const brand = getCurrentBrand();

  // Ledger rows arrive newest-first; a statement reads chronologically.
  const rows = [...ledgerEntries].sort((a, b) => {
    const byDate = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const oldest = rows[0];
  const openingBalance = oldest ? oldest.balance - (oldest.debit - oldest.credit) : 0;

  const totals = rows.reduce(
    (acc, entry) => {
      if (entry.transactionType === 'adjustment') acc.adjustment += entry.debit - entry.credit;
      else {
        acc.sales += entry.debit;
        acc.payment += entry.credit;
      }
      return acc;
    },
    { sales: 0, payment: 0, adjustment: 0 }
  );

  const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : summary.currentBalance;

  const cellNumber = 'px-2 py-1.5 border border-gray-300 align-top';
  const cellAmount = `${cellNumber} text-right whitespace-nowrap tabular-nums`;

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none py-8 px-10 print:px-6 print:py-4 print:max-w-full">
      <style jsx global>{`
        @media print {
          .statement-table thead {
            display: table-header-group;
          }
          .statement-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Letterhead */}
      <div className="flex items-start justify-between gap-6 pb-4">
        <div className="text-[11px] leading-relaxed text-gray-700">
          <p className="text-lg font-semibold text-primary">{brand.displayName}</p>
          <p>{brand.address}</p>
          <p>
            {brand.city} {brand.city && brand.zip ? '-' : ''} {brand.zip}
          </p>
          {brand.phone && <p>{brand.phone}</p>}
          {brand.email && <p>{brand.email}</p>}
          {brand.website && <p>{brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>}
          {(brand.strnNo || brand.ntnNo) && (
            <p className="mt-1">
              {brand.strnNo && <span>STRN: {brand.strnNo.trim()}</span>}
              {brand.strnNo && brand.ntnNo && '  ·  '}
              {brand.ntnNo && <span>NTN: {brand.ntnNo}</span>}
            </p>
          )}
        </div>
        {brand.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo} alt={brand.displayName} className="h-16 w-auto object-contain" />
        )}
      </div>

      <div className="h-[3px] w-full bg-primary/70" />

      {/* Title */}
      <p className="text-center text-base font-semibold text-primary my-4">Ledger Statement</p>

      {/* Party + date */}
      <div className="flex items-start justify-between gap-6 mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{customerInfo.customerName}</p>
          {customerInfo.customerCompany && (
            <p className="text-xs text-gray-600">{customerInfo.customerCompany}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-700">
          <p>Date</p>
          <p className="font-semibold">{stmtDate(new Date())}</p>
        </div>
      </div>

      {/* Ledger table */}
      {rows.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-8">No transactions for this period.</p>
      ) : (
        <table className="statement-table w-full border-collapse text-[11px] text-gray-800">
          <thead>
            <tr className="bg-primary/10 text-left text-[10px] uppercase tracking-wide text-gray-900">
              <th className="px-2 py-1.5 border border-gray-300 w-8 text-center font-semibold">No.</th>
              <th className="px-2 py-1.5 border border-gray-300 w-24 font-semibold">Date</th>
              <th className="px-2 py-1.5 border border-gray-300 font-semibold">Particular</th>
              <th className="px-2 py-1.5 border border-gray-300 w-28 text-right font-semibold">Sales</th>
              <th className="px-2 py-1.5 border border-gray-300 w-28 text-right font-semibold">Payment</th>
              <th className="px-2 py-1.5 border border-gray-300 w-28 text-right font-semibold">Adjustment</th>
              <th className="px-2 py-1.5 border border-gray-300 w-32 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening balance */}
            <tr className="bg-gray-50">
              <td className={cellNumber} />
              <td className={cellNumber} />
              <td className={`${cellNumber} font-semibold`}>Opening Balance</td>
              <td className={cellAmount} />
              <td className={cellAmount} />
              <td className={cellAmount} />
              <td className={`${cellAmount} font-semibold`}>{money(openingBalance)}</td>
            </tr>

            {rows.map((entry, index) => {
              const isAdjustment = entry.transactionType === 'adjustment';
              const label = PARTICULAR_LABEL[entry.transactionType] ?? entry.transactionType.toUpperCase();
              const showSales = !isAdjustment && entry.debit > 0;
              const showPayment = !isAdjustment && entry.credit > 0;
              const adjustment = isAdjustment ? entry.debit - entry.credit : 0;

              return (
                <tr key={entry.id}>
                  <td className={`${cellNumber} text-center text-gray-500`}>{index + 1}</td>
                  <td className={`${cellNumber} whitespace-nowrap`}>{stmtDate(entry.date)}</td>
                  <td className={cellNumber}>
                    <span className="font-semibold">{label}</span>
                    {entry.transactionNumber && (
                      <span className="block font-mono text-[10px] text-gray-700">
                        {entry.transactionNumber}
                      </span>
                    )}
                    {entry.description && entry.description !== label && (
                      <span className="block text-[10px] text-gray-500">{entry.description}</span>
                    )}
                    {entry.breakdown && entry.breakdown.length > 0 && (
                      <span className="block mt-0.5 space-y-px">
                        {entry.breakdown.map((line, i) => (
                          <span
                            key={`${line.kind}-${line.invoiceId ?? 'on-account'}-${i}`}
                            className="flex justify-between gap-3 text-[10px] text-gray-500"
                          >
                            <span>{line.label}</span>
                            <span className="tabular-nums">{money(line.amount)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={cellAmount}>{showSales ? money(entry.debit) : ''}</td>
                  <td className={cellAmount}>{showPayment ? money(entry.credit) : ''}</td>
                  <td className={cellAmount}>{isAdjustment && adjustment !== 0 ? money(adjustment) : ''}</td>
                  <td className={`${cellAmount} font-semibold`}>{money(entry.balance)}</td>
                </tr>
              );
            })}

            {/* Totals */}
            <tr className="bg-primary/10 font-bold text-gray-900">
              <td className={cellNumber} />
              <td className={cellNumber} />
              <td className={`${cellNumber} text-right`}>Total</td>
              <td className={cellAmount}>{money(totals.sales)}</td>
              <td className={cellAmount}>{money(totals.payment)}</td>
              <td className={cellAmount}>{totals.adjustment !== 0 ? money(totals.adjustment) : ''}</td>
              <td className={cellAmount}>{money(closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Closing summary */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 text-[11px]">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Total Sales</span>
            <span className="font-semibold tabular-nums">{money(summary.totalDebit)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Total Payments</span>
            <span className="font-semibold tabular-nums">{money(summary.totalCredit)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-400 pt-1.5 mt-1 font-bold text-gray-900">
            <span>Balance Due</span>
            <span className="tabular-nums">{money(summary.currentBalance)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-3 border-t border-gray-300 text-[9px] text-gray-500">
        <p>This is a computer-generated statement and does not require a signature.</p>
        <p>For any queries, please contact our accounts department.</p>
      </div>
    </div>
  );
}
