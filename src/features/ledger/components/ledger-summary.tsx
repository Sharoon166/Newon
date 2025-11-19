'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerSummary } from '../types';
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingUp, TrendingDown, AlertCircle, DollarSign, Receipt } from 'lucide-react';

interface LedgerSummaryProps {
  summary: LedgerSummary;
}

export function LedgerSummaryCards({ summary }: LedgerSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalCustomers}</div>
          <p className="text-xs text-muted-foreground">
            {summary.customersWithBalance} with outstanding balance
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalInvoiced)}</div>
          <p className="text-xs text-muted-foreground">All time invoices</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalReceived)}</div>
          <p className="text-xs text-muted-foreground">All time payments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalOutstanding)}</div>
          <p className="text-xs text-muted-foreground">
            {((summary.totalOutstanding / summary.totalInvoiced) * 100).toFixed(1)}% of total invoiced
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.overdueAmount)}</div>
          <p className="text-xs text-muted-foreground">Requires immediate attention</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {((summary.totalReceived / summary.totalInvoiced) * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">Payment collection efficiency</p>
        </CardContent>
      </Card>
    </div>
  );
}
