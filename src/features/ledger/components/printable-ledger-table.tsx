'use client';

import { CustomerLedger } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PrintableLedgerTableProps {
  data: CustomerLedger[];
}

export function PrintableLedgerTable({ data }: PrintableLedgerTableProps) {
  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          .ledger-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block;
            box-shadow: none !important;
          }
          .ledger-content {
            width: 100%;
          }
          .ledger-footer {
            margin-top: 1cm;
            page-break-inside: avoid;
          }
          .customer-item {
            margin-bottom: 0.3cm;
          }
          h1 {
            font-size: 18pt !important;
            margin-bottom: 0.2cm !important;
          }
          .summary-section {
            margin-bottom: 0.4cm !important;
          }
          .summary-section .grid {
            gap: 0.2cm !important;
          }
          .summary-section > div > div {
            padding: 0.2cm !important;
          }
          .customer-item {
            padding: 0.3cm !important;
            border-width: 1px !important;
          }
          .text-4xl {
            font-size: 18pt !important;
          }
          .text-2xl {
            font-size: 14pt !important;
          }
          .text-xl {
            font-size: 12pt !important;
          }
          .text-lg {
            font-size: 11pt !important;
          }
          .text-base {
            font-size: 10pt !important;
          }
          .text-sm {
            font-size: 9pt !important;
          }
          .text-xs {
            font-size: 8pt !important;
          }
        }
      `}</style>

      <div className="w-full mx-auto bg-white py-8 px-10 print:py-0 print:px-0 ledger-page">
        <div className="ledger-content space-y-6 print:space-y-3">
          {/* Header */}
          <div className="border-b-4 border-gray-900 pb-4 mb-4 print:pb-2 print:mb-3">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl print:mb-1">
                LEDGER REPORT
              </h1>
              <p className="text-sm text-gray-600 print:text-xs">Generated on: {formatDate(new Date())}</p>
              <p className="text-sm text-gray-600 print:text-xs">Total Customers: {data.length}</p>
            </div>
          </div>

          {/* Customer Cards */}
          <div className="mt-6 print:mt-3">
            <div className="flex items-center justify-between mb-4 section-header print:mb-2">
              <h3 className="text-xl font-bold text-gray-900 print:text-base">Customer(s)</h3>
            </div>
            <div className="space-y-3 print:space-y-1.5">
              {data.map(item => (
                <div
                  key={item.customerId}
                  className="customer-item border-2 border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow print:hover:shadow-none print:p-2 print:border"
                >
                  {/* First Row: Customer Info */}
                  <div className="flex items-start justify-between gap-4 mb-3 print:mb-1.5 print:gap-2">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-1 print:text-sm print:mb-0.5">
                        {item.customerName}
                      </h4>
                      {item.customerCompany && (
                        <p className="text-sm text-gray-600 mb-2 print:text-xs print:mb-1">{item.customerCompany}</p>
                      )}
                      {(item.customerEmail || item.customerPhone) && (
                        <div className="flex gap-4 text-sm text-gray-600 print:text-[10px] print:gap-2">
                          {item.customerEmail && <span>{item.customerEmail}</span>}
                          {item.customerEmail && item.customerPhone && <span>•</span>}
                          {item.customerPhone && <span>{item.customerPhone}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-[9px] print:mb-0">
                        Last Transaction
                      </p>
                      <p className="text-sm font-medium text-gray-900 print:text-xs">
                        {formatDate(new Date(item.lastTransactionDate))}
                      </p>
                    </div>
                  </div>

                  {/* Second Row: Financial Details */}
                  <div className="pt-3 border-t border-gray-200 print:pt-1.5">
                    <div className="grid grid-cols-3 gap-4 print:gap-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-[9px] print:mb-0">
                          Total Invoiced
                        </p>
                        <p className="text-base font-bold text-gray-900 print:text-sm">
                          {formatCurrency(item.totalDebit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-[9px] print:mb-0">
                          Total Paid
                        </p>
                        <p className="text-base font-bold text-green-700 print:text-sm">
                          {formatCurrency(item.totalCredit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-[9px] print:mb-0">
                          Outstanding
                        </p>
                        <p
                          className={`text-base font-bold print:text-sm ${
                            item.currentBalance > 0
                              ? 'text-amber-600'
                              : item.currentBalance < 0
                                ? 'text-blue-600'
                                : 'text-green-600'
                          }`}
                        >
                          {formatCurrency(item.currentBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ledger-footer mt-12 pt-6 border-t-2 border-gray-300 print:mt-4 print:pt-3">
          <div className="flex justify-between items-center">
            <div className="text-left space-y-1 print:space-y-0">
              <p className="text-xs text-gray-500 italic print:text-[9px]">
                This is a computer-generated report and does not require a signature.
              </p>
              <p className="text-xs text-gray-400 print:text-[9px]">
                For any queries, please contact our accounts department.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
