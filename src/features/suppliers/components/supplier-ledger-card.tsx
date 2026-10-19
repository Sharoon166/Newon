import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SupplierLedgerData } from '../types';

const LEDGER_ENTRIES_SHOWN = 15;

interface SupplierLedgerCardProps {
  ledger: SupplierLedgerData;
}

/**
 * Mini ledger card for the supplier detail page. Shows summary totals plus the
 * most recent purchase/payment entries with a running balance; the full
 * statement lives at /suppliers/[id]/ledger/print.
 */
export function SupplierLedgerCard({ ledger }: SupplierLedgerCardProps) {
  const { supplier, entries, totalEntries, summary } = ledger;
  const supplierRef = supplier.supplierId || supplier.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Ledger
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/suppliers/${supplierRef}/ledger/print`}>
            <Printer className="mr-2 h-4 w-4" />
            Full statement
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Total debits</div>
            <div className="text-sm font-semibold">{formatCurrency(summary.totalDebit)}</div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Total credits</div>
            <div className="text-sm font-semibold text-green-600">{formatCurrency(summary.totalCredit)}</div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Balance owed</div>
            <div
              className={`text-sm font-semibold ${summary.closingBalance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
            >
              {formatCurrency(summary.closingBalance)}
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No ledger entries yet. Entries appear once purchases are recorded.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.type === 'payment' ? 'secondary' : 'outline'}
                        className="whitespace-nowrap"
                      >
                        {entry.type === 'payment' ? 'Payment' : 'Purchase'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.reference ? (
                        <span className="font-mono text-xs">{entry.reference}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{entry.note || '-'}</span>
                      )}
                      {entry.method && <div className="text-xs text-muted-foreground">{entry.method}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${entry.balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}
                    >
                      {formatCurrency(entry.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalEntries > LEDGER_ENTRIES_SHOWN && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing latest {LEDGER_ENTRIES_SHOWN} of {totalEntries} entries.{' '}
                <Link href={`/suppliers/${supplierRef}/ledger/print`} className="underline hover:text-foreground">
                  View full statement
                </Link>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
