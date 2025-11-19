'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetrics } from '../types';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Wallet
} from 'lucide-react';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Stock',
      value: metrics.totalStock.toLocaleString(),
      subtitle: `Value: ${formatCurrency(metrics.totalStockValue)}`,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Daily Sales',
      value: formatCurrency(metrics.dailySales),
      subtitle: 'Today\'s revenue',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Monthly Sales',
      value: formatCurrency(metrics.monthlySales),
      subtitle: 'This month\'s revenue',
      icon: ShoppingCart,
      color: 'text-purple-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      subtitle: 'All time revenue',
      icon: DollarSign,
      color: 'text-emerald-600'
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(metrics.pendingPayments),
      subtitle: `${metrics.pendingPaymentsCount} invoices`,
      icon: Wallet,
      color: 'text-amber-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
