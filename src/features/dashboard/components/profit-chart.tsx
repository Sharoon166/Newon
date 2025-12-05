'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
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
    color: '#85BB65',
  },
};

export function ProfitChart({ data, data30Days, dataMonthly }: ProfitChartProps) {
  const [period, setPeriod] = useState<'7' | '30' | 'monthly' | 'custom'>('7');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [customData, setCustomData] = useState<ProfitTrendData[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  // Fetch custom range data when date range changes
  useEffect(() => {
    if (period === 'custom' && dateRange.from && dateRange.to) {
      setIsLoadingCustom(true);
      getProfitTrendByDateRange(dateRange.from, dateRange.to)
        .then(setCustomData)
        .finally(() => setIsLoadingCustom(false));
    }
  }, [period, dateRange.from, dateRange.to]);

  // Use the appropriate data based on selected period
  let displayData = data;
  if (period === '30' && data30Days) {
    displayData = data30Days;
  } else if (period === 'monthly' && dataMonthly) {
    displayData = dataMonthly;
  } else if (period === 'custom' && customData.length > 0) {
    displayData = customData;
  }

  const chartData = displayData.map((item) => {
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
      invoices: item.invoices,
      fullDate: date.toLocaleDateString(),
    };
  });

  const totalProfit = displayData.reduce((sum, item) => sum + item.profit, 0);
  const avgDailyProfit = totalProfit / displayData.length;
  const totalInvoices = displayData.reduce((sum, item) => sum + item.invoices, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              Profit Trend
            </CardTitle>
            <CardDescription>Profit overview from invoices</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(value) => setPeriod(value as '7' | '30' | 'monthly' | 'custom')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30" disabled={!data30Days}>Last 30 days</SelectItem>
                <SelectItem value="monthly" disabled={!dataMonthly}>Last 12 months</SelectItem>
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
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Loading State */}
          {isLoadingCustom && (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Chart */}
          {!isLoadingCustom && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value).toString()}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === 'profit') {
                        return [
                          <div
                            key={value.toString()}
                            className="w-1 h-3 bg-[#85BB65] rounded"
                          />,
                          formatCurrency(value as number),
                        ];
                      }
                      return [value, name];
                    }}
                  />
                }
              />

              <Bar
                dataKey="profit"
                fill={chartConfig.profit.color}
                radius={[6, 6, 0, 0]} // rounded top corners
              />
            </BarChart>
          </ChartContainer>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 place-items-center text-center gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(totalProfit)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Total Invoices</div>
              <div className="text-lg font-semibold">{totalInvoices}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Avg. Daily</div>
              <div className="text-lg font-semibold">
                {formatCurrency(avgDailyProfit)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
