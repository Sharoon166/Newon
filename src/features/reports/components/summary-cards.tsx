import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, FileCheck, DollarSign, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
  totals: {
    invoicesCount: number;
    quotationsCount: number;
    revenue: number;
    expenses: number;
    profit: number;
    paidAmount: number;
    outstandingAmount: number;
  };
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  const profitMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0.0';
  const collectionRate = totals.revenue > 0 ? ((totals.paidAmount / totals.revenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totals.revenue)}</div>
          <p className="text-xs text-muted-foreground">
            {totals.invoicesCount} invoices, {totals.quotationsCount} quotations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          {totals.profit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.profit)}
          </div>
          <p className="text-xs text-muted-foreground">
            {profitMargin}% profit margin
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.paidAmount)}</div>
          <p className="text-xs text-muted-foreground">
            {collectionRate}% collection rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.outstandingAmount)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
