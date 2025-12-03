'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ProfitTrendData } from '../types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface ProfitChartProps {
  data: ProfitTrendData[];
  data30Days?: ProfitTrendData[];
}

const chartConfig = {
  profit: {
    label: 'Profit',
    color: '#85BB65',
  },
};

export function ProfitChart({ data, data30Days }: ProfitChartProps) {
  const [period, setPeriod] = useState<'7' | '30'>('7');

  const displayData = period === '30' && data30Days ? data30Days : data;

  const chartData = displayData.map((item) => {
    const date = new Date(item.date);
    return {
      date:
        period === '7'
          ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              Profit Trend
            </CardTitle>
            <CardDescription>Profit overview from invoices</CardDescription>
          </div>

          <Select value={period} onValueChange={(value) => setPeriod(value as '7' | '30')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30" disabled={!data30Days}>Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">

          {/* Chart */}
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
