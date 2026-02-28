'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ProfitTrendData } from '../types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { getProfitTrendByDateRange } from '../actions';

interface ProfitChartProps {
  data: ProfitTrendData[];
  data30Days?: ProfitTrendData[];
  dataMonthly?: ProfitTrendData[];
}

const chartConfig = {
  profit: {
    label: 'Profit',
    color: '#10b981'
  },
  expenses: {
    label: 'Expenses',
    color: '#ef4444'
  },
  netProfit: {
    label: 'Net Profit',
    color: '#3b82f6'
  }
};

export function ProfitChart({ data, data30Days, dataMonthly }: ProfitChartProps) {
  const [period, setPeriod] = useState<'7' | '30' | 'monthly' | 'custom'>('7');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [customData, setCustomData] = useState<ProfitTrendData[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  useEffect(() => {
    if (period === 'custom' && dateRange.from && dateRange.to) {
      setIsLoadingCustom(true);
      getProfitTrendByDateRange(dateRange.from, dateRange.to)
        .then(setCustomData)
        .finally(() => setIsLoadingCustom(false));
    }
  }, [period, dateRange.from, dateRange.to]);

  let displayData = data;
  if (period === '30' && data30Days) {
    displayData = data30Days;
  } else if (period === 'monthly' && dataMonthly) {
    displayData = dataMonthly;
  } else if (period === 'custom' && customData.length > 0) {
    displayData = customData;
  }

  const chartData = displayData.map(item => {
    const date = new Date(item.date);
    let dateLabel = '';

    if (period === '7') {
      dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    } else if (period === 'monthly') {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      dateLabel = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    return {
      date: dateLabel,
      profit: item.profit,
      expenses: item.expenses,
      netProfit: item.netProfit,
      invoices: item.invoices,
      fullDate: date.toLocaleDateString()
    };
  });

  const totalProfit = displayData.reduce((sum, item) => sum + item.profit, 0);
  const totalExpenses = displayData.reduce((sum, item) => sum + item.expenses, 0);
  const totalNetProfit = totalProfit - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              Profit & Expenses
            </CardTitle>
            <CardDescription>Profit and expenses overview</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={value => setPeriod(value as '7' | '30' | 'monthly' | 'custom')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30" disabled={!data30Days}>
                  Last 30 days
                </SelectItem>
                <SelectItem value="monthly" disabled={!dataMonthly}>
                  Last 12 months
                </SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : 'Select dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={range => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    disabled={date => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {isLoadingCustom && (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingCustom && (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.profit.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartConfig.profit.color} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.expenses.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartConfig.expenses.color} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={value => formatCurrency(value).toString()}
                />

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const labels: Record<string, string> = {
                          profit: 'Profit',
                          expenses: 'Expenses',
                          netProfit: 'Net Profit'
                        };
                        return [
                          <span key={name} className="font-bold">{labels[name as string] || name}</span>,
                          ' - ',
                          formatCurrency(value as number)
                        ];
                      }}
                    />
                  }
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke={chartConfig.profit.color}
                  fill="url(#colorProfit)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={chartConfig.expenses.color}
                  fill="url(#colorExpenses)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}

          <div className="grid grid-cols-3 place-items-center text-center gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(totalProfit)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Total Expenses</div>
              <div className="text-lg font-semibold text-red-600">{formatCurrency(totalExpenses)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Net Profit</div>
              <div className={`text-lg font-semibold ${totalNetProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(totalNetProfit)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
