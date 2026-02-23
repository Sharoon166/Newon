'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { ExpenseKPIs } from '../types';

interface ExpenseKPIsProps {
  kpis: ExpenseKPIs;
}

export function ExpenseKPIsComponent({ kpis }: ExpenseKPIsProps) {
  const cards = [
    {
      title: 'Total Expenses',
      value: formatCurrency(kpis.totalExpenses),
      subtitle: `${kpis.expenseCount} expenses`
    },
    {
      title: 'Daily Expenses',
      value: formatCurrency(kpis.dailyExpenses),
      subtitle: "Today's expenses"
    },
    {
      title: 'Weekly Expenses',
      value: formatCurrency(kpis.weeklyExpenses),
      subtitle: "This week's expenses"
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(kpis.monthlyExpenses),
      subtitle: "This month's expenses"
    },
    {
      title: 'Top Category',
      value: kpis.topCategory
        ? kpis.topCategory.category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'N/A',
      subtitle: kpis.topCategory ? formatCurrency(kpis.topCategory.amount) : 'No expenses'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
