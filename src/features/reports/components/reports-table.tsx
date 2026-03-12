'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyReport } from '../types';

interface ReportsTableProps {
  data: MonthlyReport[];
  totals: {
    invoicesCount: number;
    quotationsCount: number;
    revenue: number;
    expenses: number;
    grossProfit: number;
    profit: number;
    paidAmount: number;
    outstandingAmount: number;
  };
}

export function ReportsTable({ data, totals }: ReportsTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Sr.</TableHead>
            <TableHead className="font-semibold">Month</TableHead>
            <TableHead className="text-right font-semibold">Invoices</TableHead>
            <TableHead className="text-right font-semibold">Quotations</TableHead>
            <TableHead className="text-right font-semibold">Revenue</TableHead>
            <TableHead className="text-right font-semibold">Paid</TableHead>
            <TableHead className="text-right font-semibold">Outstanding</TableHead>
            <TableHead className="text-right font-semibold">Gross Profit</TableHead>
            <TableHead className="text-right font-semibold">Expenses</TableHead>
            <TableHead className="text-right font-semibold">Net Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row.month} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <TableCell className="font-medium">{index + 1}.</TableCell>
              <TableCell className="font-medium">{row.monthName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.invoicesCount > 0 ? row.invoicesCount : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.quotationsCount > 0 ? row.quotationsCount : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {row.revenue > 0 ? formatCurrency(row.revenue) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.paidAmount > 0 ? (
                  <span className="text-green-600 font-medium">{formatCurrency(row.paidAmount)}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.outstandingAmount > 0 ? (
                  <span className="text-orange-600 font-medium">{formatCurrency(row.outstandingAmount)}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.grossProfit > 0 ? (
                  <span className="text-blue-600 font-medium">{formatCurrency(row.grossProfit)}</span>
                ) : row.grossProfit < 0 ? (
                  <span className="text-red-600 font-medium">{formatCurrency(row.grossProfit)}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.expenses > 0 ? (
                  <span className="text-red-600 font-medium">{formatCurrency(row.expenses)}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.revenue > 0 || row.expenses > 0 ? (
                  <span className={`font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(row.profit)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-primary/5 border-t-2 hover:bg-primary/5">
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold tabular-nums">{totals.invoicesCount}</TableCell>
            <TableCell className="text-right font-bold tabular-nums">{totals.quotationsCount}</TableCell>
            <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.revenue)}</TableCell>
            <TableCell className="text-right font-bold tabular-nums text-green-600">
              {formatCurrency(totals.paidAmount)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-orange-600">
              {formatCurrency(totals.outstandingAmount)}
            </TableCell>
            <TableCell className={`text-right font-bold tabular-nums ${totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totals.grossProfit)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-red-600">
              {formatCurrency(totals.expenses)}
            </TableCell>
            <TableCell
              className={`text-right font-bold tabular-nums ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(totals.profit)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
