'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LowStockAlert, OverdueInvoiceAlert, PendingPaymentAlert } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertCircle, AlertTriangle, ArrowDown, Clock, ExternalLink, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AlertsSectionProps {
  lowStockAlerts: LowStockAlert[];
  overdueInvoices: OverdueInvoiceAlert[];
  pendingPayments: PendingPaymentAlert[];
}

export function AlertsSection({ lowStockAlerts, overdueInvoices, pendingPayments }: AlertsSectionProps) {
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
        <Tabs defaultValue="low-stock">
          <TabsList>
            <TabsTrigger value="low-stock">
              <ArrowDown className='text-red-500'/>
              Low Stock ({lowStockAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              <AlertCircle className='text-orange-500'/>
              Overdue ({overdueInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className='text-destructive'/>
              Pending ({pendingPayments.length})
            </TabsTrigger>
          </TabsList>

          {/* Low Stock Tab */}
          <TabsContent value="low-stock" className="space-y-3 mt-4">
            {lowStockAlerts.length > 0 ? (
              <>
                {lowStockAlerts.slice(0, 5).map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                        <Package className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{alert.productName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{alert.sku}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <Badge variant="destructive" className="font-semibold">
                        {alert.currentStock} left
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">Min: {alert.minStock}</div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/inventory">
                    <ExternalLink />
                    View All Inventory
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No low stock alerts</p>
              </div>
            )}
          </TabsContent>

          {/* Overdue Invoices Tab */}
          <TabsContent value="overdue" className="space-y-3 mt-4">
            {overdueInvoices.length > 0 ? (
              <>
                {overdueInvoices.slice(0, 5).map(invoice => (
                  <div
                    key={invoice.id}
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
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/invoices">
                    <ExternalLink />
                    View All Invoices
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No overdue invoices</p>
              </div>
            )}
          </TabsContent>

          {/* Pending Payments Tab */}
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingPayments.length > 0 ? (
              <>
                {pendingPayments.slice(0, 5).map(payment => (
                  <div
                    key={payment.id}
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
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/ledger">
                    <ExternalLink />
                    View Ledger
                  </Link>
                </Button>
              </>
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
