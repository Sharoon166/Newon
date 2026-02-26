'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Receipt, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import type { ExpenseKPIs } from '../types';

interface ExpenseKPIsProps {
  kpis: ExpenseKPIs;
}

export function ExpenseKPIsComponent({ kpis }: ExpenseKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Receipt className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">{kpis.expenseCount} recorded expense(s)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Expenses</CardTitle>
          <Calendar className="h-6 w-6 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.dailyExpenses)}</div>
          <p className="text-xs text-muted-foreground">Today&apos;s expenses</p>
          {kpis.dailyExpensesTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${kpis.dailyExpensesTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {kpis.dailyExpensesTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(kpis.dailyExpensesTrend).toFixed(1)}% vs yesterday</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <TrendingUp className="h-6 w-6 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {kpis.topCategory
              ? kpis.topCategory.category
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
              : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.topCategory ? formatCurrency(kpis.topCategory.amount) : 'No expenses'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
