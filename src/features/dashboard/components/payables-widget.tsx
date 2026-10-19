'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PayablesSummary } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpRight, Truck } from 'lucide-react';

interface PayablesWidgetProps {
  summary: PayablesSummary;
}

const AGING_BUCKETS = [
  { key: 'current', label: 'Current', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  { key: 'days30', label: '30+ days', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  { key: 'days60', label: '60+ days', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  { key: 'days90Plus', label: '90+ days', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
] as const;

export function PayablesWidget({ summary }: PayablesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600" />
              Payables
            </CardTitle>
            <CardDescription>What you owe suppliers, and how long it has been outstanding.</CardDescription>
          </div>
          <Badge variant={summary.totalOutstanding > 0 ? 'outline' : 'secondary'}>
            {summary.supplierCount} supplier{summary.supplierCount === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className={`text-2xl font-bold ${summary.totalOutstanding > 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total outstanding balance</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AGING_BUCKETS.map(bucket => (
            <div key={bucket.key} className="rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">{bucket.label}</div>
              <div className="text-sm font-semibold">{formatCurrency(summary.aging[bucket.key])}</div>
            </div>
          ))}
        </div>

        {summary.topSuppliers.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Top suppliers by balance</div>
            {summary.topSuppliers.map(supplier => (
              <Link
                key={supplier.id}
                href={`/suppliers/${supplier.supplierId || supplier.id}`}
                className="block rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-accent/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{supplier.name}</div>
                    {supplier.oldestUnpaidDate && (
                      <div className="text-muted-foreground truncate">
                        Oldest unpaid: {formatDate(new Date(supplier.oldestUnpaidDate))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 font-semibold">{formatCurrency(supplier.outstandingBalance)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No outstanding payables - all supplier purchases are settled.</p>
        )}

        <Button variant="link" className="px-0 text-xs" asChild>
          <Link href="/suppliers">
            View all suppliers
            <ArrowUpRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
