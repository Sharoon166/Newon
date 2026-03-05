'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OutOfStockAlert, OverdueInvoiceAlert, PendingPaymentAlert } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertCircle,
  Package,
  PackageX,
  BadgeAlert,
  ClockArrowUp,
  Loader2,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLowStockAlerts, getOverdueInvoices, getPendingPayments } from '../actions';

interface AlertsSectionProps {
  outOfStockAlerts: OutOfStockAlert[];
  overdueInvoices: OverdueInvoiceAlert[];
  pendingPayments: PendingPaymentAlert[];
}

export function AlertsSection({
  outOfStockAlerts: initialOutOfStock,
  overdueInvoices: initialOverdue,
  pendingPayments: initialPending
}: AlertsSectionProps) {
  const [outOfStockAlerts, setOutOfStockAlerts] = useState(initialOutOfStock);
  const [overdueInvoices, setOverdueInvoices] = useState(initialOverdue);
  const [pendingPayments, setPendingPayments] = useState(initialPending);

  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingOverdue, setLoadingOverdue] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);

  const [hasMoreStock, setHasMoreStock] = useState(initialOutOfStock.length === 5);
  const [hasMoreOverdue, setHasMoreOverdue] = useState(initialOverdue.length === 5);
  const [hasMorePending, setHasMorePending] = useState(initialPending.length === 5);

  const criticalCount = outOfStockAlerts.length + overdueInvoices.length;
  const upcomingCount = pendingPayments.length;

  const loadMoreStock = async () => {
    setLoadingStock(true);
    try {
      const newAlerts = await getLowStockAlerts(5, outOfStockAlerts.length + 1);
      setOutOfStockAlerts(prev => [...prev, ...newAlerts]);
      setHasMoreStock(newAlerts.length === 5);
    } catch (error) {
      console.error('Error loading more stock alerts:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  const loadMoreOverdue = async () => {
    setLoadingOverdue(true);
    try {
      const newInvoices = await getOverdueInvoices(5, overdueInvoices.length + 1);
      setOverdueInvoices(prev => [...prev, ...newInvoices]);
      setHasMoreOverdue(newInvoices.length === 5);
    } catch (error) {
      console.error('Error loading more overdue invoices:', error);
    } finally {
      setLoadingOverdue(false);
    }
  };

  const loadMorePending = async () => {
    setLoadingPending(true);
    try {
      const newPayments = await getPendingPayments(5, pendingPayments.length + 1);
      setPendingPayments(prev => [...prev, ...newPayments]);
      setHasMorePending(newPayments.length === 5);
    } catch (error) {
      console.error('Error loading more pending payments:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Alerts
            </CardTitle>
            <CardDescription>Inventory, invoices, and upcoming payments that need your attention.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={criticalCount > 0 ? 'destructive' : 'secondary'}>{criticalCount} critical</Badge>
            <Badge variant={upcomingCount > 0 ? 'outline' : 'secondary'}>{upcomingCount} upcoming</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Out of stock */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PackageX className="h-4 w-4 text-red-500" />
                <span>Out of stock</span>
              </div>
            </div>

            {outOfStockAlerts.length > 0 ? (
              <div className="space-y-2">
                {outOfStockAlerts.map(alert => (
                  <div key={alert.id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{alert.productName}</div>
                        <div className="text-muted-foreground font-mono truncate">{alert.sku}</div>
                      </div>
                      <Package className="h-4 w-4 text-red-500 shrink-0" />
                    </div>
                  </div>
                ))}
                {hasMoreStock && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={loadMoreStock}
                    disabled={loadingStock}
                  >
                    {loadingStock ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        Load more
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
                <Button variant="link" className="px-0 text-xs" asChild>
                  <Link href="/inventory">
                    View all inventory
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No products are currently out of stock.</p>
            )}
          </div>

          {/* Overdue invoices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BadgeAlert className="h-4 w-4 text-orange-500" />
                <span>Overdue invoices</span>
              </div>
            </div>

            {overdueInvoices.length > 0 ? (
              <div className="space-y-2">
                {overdueInvoices.map(invoice => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="block rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-accent/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{invoice.customerName}</div>
                        <div className="text-muted-foreground truncate">
                          {invoice.invoiceNumber} · Due {formatDate(new Date(invoice.dueDate))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                        <Badge variant="destructive" className="mt-1 text-[10px]">
                          {invoice.daysOverdue}d overdue
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
                {hasMoreOverdue && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={loadMoreOverdue}
                    disabled={loadingOverdue}
                  >
                    {loadingOverdue ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        Load more
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
                <Button variant="link" className="px-0 text-xs" asChild>
                  <Link href="/invoices">
                    View all invoices
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No invoices are overdue right now.</p>
            )}
          </div>

          {/* Pending payments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClockArrowUp className="h-4 w-4 text-emerald-600" />
                <span>Upcoming payments</span>
              </div>
            </div>

            {pendingPayments.length > 0 ? (
              <div className="space-y-2">
                {pendingPayments.map(payment => (
                  <Link
                    key={payment.id}
                    href={`/invoices/${payment.id}`}
                    className="block rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-accent/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{payment.customerName}</div>
                        <div className="text-muted-foreground truncate">
                          {payment.invoiceNumber} · Due {formatDate(new Date(payment.dueDate))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {payment.daysUntilDue}d left
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
                {hasMorePending && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={loadMorePending}
                    disabled={loadingPending}
                  >
                    {loadingPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        Load more
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
                <Button variant="link" className="px-0 text-xs" asChild>
                  <Link href="/ledger">
                    View ledger
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No upcoming payments in the next few days.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
