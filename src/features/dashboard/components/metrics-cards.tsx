'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetrics } from '../types';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
  Coins,
  BarChart3
} from 'lucide-react';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          <Package className="h-6 w-6 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Value: {formatCurrency(metrics.totalStockValue)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
          <BarChart3 className="h-6 w-6 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.dailySales)}</div>
          <p className="text-xs text-muted-foreground mt-1">Today&apos;s revenue</p>
          {metrics.dailySalesTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${metrics.dailySalesTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.dailySalesTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(metrics.dailySalesTrend).toFixed(1)}% vs yesterday</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
          <ShoppingCart className="h-6 w-6 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.monthlySales)}</div>
          <p className="text-xs text-muted-foreground mt-1">This month&apos;s revenue</p>
          {metrics.monthlySalesTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${metrics.monthlySalesTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.monthlySalesTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(metrics.monthlySalesTrend).toFixed(1)}% vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <Coins className="h-6 w-6 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground mt-1">All time revenue</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <TrendingUp className={`h-6 w-6 ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Profit: {formatCurrency(metrics.monthlyProfit)} - Expenses: {formatCurrency(metrics.monthlyExpenses)}
          </p>
          {metrics.netProfitTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${metrics.netProfitTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.netProfitTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(metrics.netProfitTrend).toFixed(1)}% vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          <Wallet className="h-6 w-6 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.pendingPayments)}</div>
          <p className="text-xs text-muted-foreground mt-1">{metrics.pendingPaymentsCount} invoices</p>
        </CardContent>
      </Card>
    </div>
  );
}
