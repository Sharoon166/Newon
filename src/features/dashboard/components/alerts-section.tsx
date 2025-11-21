'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OutOfStockAlert, OverdueInvoiceAlert, PendingPaymentAlert } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Clock, Package, Loader2, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLowStockAlerts, getOverdueInvoices, getPendingPayments } from '../actions';
import Image from 'next/image';
import { ImageZoom } from '@/components/ui/shadcn-io/image-zoom';

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

  const loadMoreStock = async () => {
    setLoadingStock(true);
    try {
      const newAlerts = await getLowStockAlerts(5, outOfStockAlerts.length);
      setOutOfStockAlerts([...outOfStockAlerts, ...newAlerts]);
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
      const newInvoices = await getOverdueInvoices(5, overdueInvoices.length);
      setOverdueInvoices([...overdueInvoices, ...newInvoices]);
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
      const newPayments = await getPendingPayments(5, pendingPayments.length);
      setPendingPayments([...pendingPayments, ...newPayments]);
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
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Alerts & Notifications
        </CardTitle>
        <CardDescription>Important items requiring attention</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="out-of-stock">
          <TabsList>
            <TabsTrigger value="out-of-stock">
              <AlertTriangle className="text-red-500" />
              Out of Stock ({outOfStockAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              <AlertCircle className="text-orange-500" />
              Overdue ({overdueInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="text-destructive" />
              Pending ({pendingPayments.length})
            </TabsTrigger>
          </TabsList>

          {/* Out of Stock Tab */}
          <TabsContent value="out-of-stock" className="mt-4">
            {outOfStockAlerts.length > 0 ? (
              <div className="space-y-3">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {outOfStockAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {alert.image ? (
                            <ImageZoom>
                              <Image
                                src={alert.image}
                                alt={alert.productName}
                                width={100}
                                height={100}
                                className="h-10 w-10 rounded-md"
                              />
                            </ImageZoom>
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                              <Package className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{alert.productName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{alert.sku}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <Badge variant="destructive" className="font-semibold">
                            Out of Stock
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="space-y-2 pt-2">
                  {hasMoreStock && (
                    <Button
                      variant="outline"
                      className="w-full max-w-sm"
                      onClick={loadMoreStock}
                      disabled={loadingStock}
                    >
                      {loadingStock ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                  <div className="flex justify-center w-full">
                    <Button className="w-full max-w-sm" asChild>
                      <Link href="/inventory">
                        View All Inventory
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No out of stock items</p>
              </div>
            )}
          </TabsContent>

          {/* Overdue Invoices Tab */}
          <TabsContent value="overdue" className="mt-4">
            {overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {overdueInvoices.map(invoice => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 shrink-0">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{invoice.customerName}</div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.invoiceNumber} • Due: {formatDate(new Date(invoice.dueDate))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-semibold">{formatCurrency(invoice.amount)}</div>
                          <Badge variant="destructive" className="text-xs mt-1">
                            {invoice.daysOverdue}d overdue
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
                <div className="space-y-2 pt-2">
                  {hasMoreOverdue && (
                    <Button
                      variant="outline"
                      className="w-full max-w-sm"
                      onClick={loadMoreOverdue}
                      disabled={loadingOverdue}
                    >
                      {loadingOverdue ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                  <div className="flex justify-center w-full">
                    <Button className="w-full max-w-sm" asChild>
                      <Link href="/invoices">
                        View All Invoices
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No overdue invoices</p>
              </div>
            )}
          </TabsContent>

          {/* Pending Payments Tab */}
          <TabsContent value="pending" className="mt-4">
            {pendingPayments.length > 0 ? (
              <div className="space-y-3">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {pendingPayments.map(payment => (
                      <Link
                        key={payment.id}
                        href={`/invoices/${payment.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
                            <Clock className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{payment.customerName}</div>
                            <div className="text-xs text-muted-foreground">
                              {payment.invoiceNumber} • Due: {formatDate(new Date(payment.dueDate))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {payment.daysUntilDue}d left
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
                <div className="space-y-2 pt-2">
                  {hasMorePending && (
                    <Button
                      variant="outline"
                      className="w-full max-w-sm"
                      onClick={loadMorePending}
                      disabled={loadingPending}
                    >
                      {loadingPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                  <div className="flex justify-center w-full">
                    <Button className="w-full max-w-sm" asChild>
                      <Link href="/ledger">
                        View Ledger
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending payments</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
