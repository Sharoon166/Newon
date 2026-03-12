'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import type { YearlyReportData } from '../types';
import useBrandStore from '@/stores/useBrandStore';
import Image from 'next/image';

interface PrintableReportsProps {
  reportData: YearlyReportData;
}

export function PrintableReports({ reportData }: PrintableReportsProps) {
  const brand = useBrandStore(state => state.getCurrentBrand());

  return (
    <div className="w-full bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          * {
            box-sizing: border-box;
          }
          .print-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .print-header {
            flex-shrink: 0;
          }
          .print-summary {
            flex-shrink: 0;
          }
          .print-table-container {
            flex: 1;
            overflow: hidden;
          }
          .print-table {
            width: 100%;
            font-size: 9px;
          }
          .print-table th,
          .print-table td {
            padding: 4px 6px;
          }
          .print-footer {
            flex-shrink: 0;
            font-size: 8px;
          }
        }
      `}</style>

      <div className="print-container p-4 print:p-2">
        {/* Header */}
        <div className="print-header flex items-start justify-between border-b pb-2 mb-3">
          <div className="flex items-center gap-3">
            {brand.logo && (
              <Image
                src={brand.logo}
                alt={brand.displayName}
                width={60}
                height={60}
                className="object-contain"
                unoptimized
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{brand.displayName}</h1>
              <p className="text-xs text-muted-foreground">{brand.address}</p>
              {brand.phone && <p className="text-xs text-muted-foreground">Phone: {brand.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">Financial Report</h2>
            <p className="text-xs text-muted-foreground">Year: {reportData.year}</p>
            <p className="text-xs text-muted-foreground">Generated: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="print-summary grid grid-cols-4 gap-2 mb-3">
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-sm font-bold">{formatCurrency(reportData.totals.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {reportData.totals.invoicesCount} inv, {reportData.totals.quotationsCount} quot
            </p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Total Profit</p>
            <p className={`text-sm font-bold ${reportData.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(reportData.totals.profit)}
            </p>
            <p className="text-xs text-muted-foreground">
              {reportData.totals.revenue > 0
                ? `${((reportData.totals.profit / reportData.totals.revenue) * 100).toFixed(1)}% margin`
                : '0% margin'}
            </p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Amount Collected</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(reportData.totals.paidAmount)}</p>
            <p className="text-xs text-muted-foreground">
              {reportData.totals.revenue > 0
                ? `${((reportData.totals.paidAmount / reportData.totals.revenue) * 100).toFixed(1)}% collected`
                : '0% collected'}
            </p>
          </div>
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-sm font-bold text-orange-600">{formatCurrency(reportData.totals.outstandingAmount)}</p>
            <p className="text-xs text-muted-foreground">Expenses: {formatCurrency(reportData.totals.expenses)}</p>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="print-table-container">
          <h3 className="text-sm font-semibold mb-1">Monthly Breakdown</h3>
          <table className="print-table w-full border-collapse border text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-1 text-left font-semibold">Month</th>
                <th className="border p-1 text-right font-semibold">Inv</th>
                <th className="border p-1 text-right font-semibold">Quot</th>
                <th className="border p-1 text-right font-semibold">Revenue</th>
                <th className="border p-1 text-right font-semibold">Paid</th>
                <th className="border p-1 text-right font-semibold">Outstanding</th>
                <th className="border p-1 text-right font-semibold">Gross Profit</th>
                <th className="border p-1 text-right font-semibold">Expenses</th>
                <th className="border p-1 text-right font-semibold">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {reportData.monthlyReports.map((row, index) => (
                <tr key={row.month} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="border p-1 font-medium">{row.monthName}</td>
                  <td className="border p-1 text-right tabular-nums">
                    {row.invoicesCount > 0 ? row.invoicesCount : '-'}
                  </td>
                  <td className="border p-1 text-right tabular-nums">
                    {row.quotationsCount > 0 ? row.quotationsCount : '-'}
                  </td>
                  <td className="border p-1 text-right font-medium tabular-nums">
                    {row.revenue > 0 ? formatCurrency(row.revenue) : '-'}
                  </td>
                  <td className="border p-1 text-right tabular-nums text-green-600">
                    {row.paidAmount > 0 ? formatCurrency(row.paidAmount) : '-'}
                  </td>
                  <td className="border p-1 text-right tabular-nums text-orange-600">
                    {row.outstandingAmount > 0 ? formatCurrency(row.outstandingAmount) : '-'}
                  </td>
                  <td className="border p-1 text-right tabular-nums text-blue-600">
                    {row.grossProfit > 0 ? formatCurrency(row.grossProfit) : row.grossProfit < 0 ? formatCurrency(row.grossProfit) : '-'}
                  </td>
                  <td className="border p-1 text-right tabular-nums text-red-600">
                    {row.expenses > 0 ? formatCurrency(row.expenses) : '-'}
                  </td>
                  <td
                    className={`border p-1 text-right font-semibold tabular-nums ${
                      row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {row.revenue > 0 || row.expenses > 0 ? formatCurrency(row.profit) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 border-t-2 font-bold">
                <td className="border p-1">Total</td>
                <td className="border p-1 text-right tabular-nums">{reportData.totals.invoicesCount}</td>
                <td className="border p-1 text-right tabular-nums">{reportData.totals.quotationsCount}</td>
                <td className="border p-1 text-right tabular-nums">{formatCurrency(reportData.totals.revenue)}</td>
                <td className="border p-1 text-right tabular-nums text-green-600">
                  {formatCurrency(reportData.totals.paidAmount)}
                </td>
                <td className="border p-1 text-right tabular-nums text-orange-600">
                  {formatCurrency(reportData.totals.outstandingAmount)}
                </td>
                <td className={`border p-1 text-right tabular-nums ${reportData.totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.totals.grossProfit)}
                </td>
                <td className="border p-1 text-right tabular-nums text-red-600">
                  {formatCurrency(reportData.totals.expenses)}
                </td>
                <td
                  className={`border p-1 text-right tabular-nums ${
                    reportData.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(reportData.totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="print-footer text-center text-xs text-muted-foreground border-t pt-2 mt-2">
          <p>This is a computer-generated report from {brand.displayName}</p>
          <p>Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
