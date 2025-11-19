'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { SalesTrendData } from '../types';
import { formatCurrency} from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface SalesChartProps {
  data: SalesTrendData[];
  data30Days?: SalesTrendData[];
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
};

export function SalesChart({ data, data30Days }: SalesChartProps) {
  const [period, setPeriod] = useState<'7' | '30'>('7');
  
  // Use the appropriate data based on selected period
  const displayData = period === '30' && data30Days ? data30Days : data;
  
  // Format data for recharts
  const chartData = displayData.map((item) => {
    const date = new Date(item.date);
    return {
      date: period === '7' 
        ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { day: 'numeric',month: "short" }),
      revenue: item.revenue,
      sales: item.sales,
      invoices: item.invoices,
      fullDate: date.toLocaleDateString(),
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BarChart3 className="h-5 w-5" />
              Sales Trend
            </CardTitle>
            <CardDescription>Revenue and sales overview</CardDescription>
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
                      if (name === 'revenue') {
                        return [<div key={value.toLocaleString()} className='w-1 h-3 bg-primary rounded'/>,formatCurrency(value as number)];
                      }
                      return [value, name];
                    }}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>

          {/* Summary */}
          <div className="grid grid-cols-3 place-items-center text-center gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
              <div className="text-lg font-semibold">
                {formatCurrency(displayData.reduce((sum, item) => sum + item.revenue, 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Sales</div>
              <div className="text-lg font-semibold">
                {displayData.reduce((sum, item) => sum + item.sales, 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg. Daily</div>
              <div className="text-lg font-semibold">
                {formatCurrency(displayData.reduce((sum, item) => sum + item.revenue, 0) / displayData.length)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
