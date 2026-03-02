'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { SalesTrendData } from '../types';
import { formatCurrency, cn } from '@/lib/utils';
import { Calendar, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { getSalesTrendByDateRange } from '../actions';

interface SalesChartProps {
  data: SalesTrendData[];
  data30Days?: SalesTrendData[];
  dataMonthly?: SalesTrendData[];
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    theme: {
      light: 'var(--primary)',
      dark: 'var(--primary)',
    },
  }
} satisfies ChartConfig;

function SalesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { fullDate?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const fullDate = payload[0]?.payload?.fullDate;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 text-muted-foreground">{fullDate ?? 'Revenue'}</div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: 'var(--color-revenue)' }}
            aria-hidden
          />
          <span className="text-muted-foreground">Revenue</span>
        </div>
        <span className="font-mono font-medium tabular-nums text-foreground">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

export function SalesChart({ data, data30Days, dataMonthly }: SalesChartProps) {
  const [period, setPeriod] = useState<'7' | '30' | 'monthly' | 'custom'>('7');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [customData, setCustomData] = useState<SalesTrendData[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  
  useEffect(() => {
    if (period === 'custom' && dateRange.from && dateRange.to) {
      setIsLoadingCustom(true);
      getSalesTrendByDateRange(dateRange.from, dateRange.to)
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
  
  const totalRevenue = displayData.reduce((sum, item) => sum + item.revenue, 0);
  const totalSales = displayData.reduce((sum, item) => sum + item.sales, 0);
  const averageDailyRevenue = displayData.length ? totalRevenue / displayData.length : 0;
  
  const chartData = displayData.map((item) => {
    const date = new Date(item.date);
    let dateLabel = '';
    
    if (period === '7') {
      dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    } else if (period === 'monthly') {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short' });
    } else if (period === '30') {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return {
      date: dateLabel,
      revenue: item.revenue,
      sales: item.sales,
      invoices: item.invoices,
      fullDate: date.toLocaleDateString(),
    };
  });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base">Sales performance</CardTitle>
            <CardDescription>Revenue tracking and analysis</CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: '7' as const, label: '7 days', disabled: false },
                { value: '30' as const, label: '30 days', disabled: !data30Days },
                { value: 'monthly' as const, label: '12 months', disabled: !dataMonthly },
                { value: 'custom' as const, label: 'Custom', disabled: false },
              ].map(({ value, label, disabled }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    period === value
                      ? "bg-secondary text-secondary-foreground shadow-sm"
                      : disabled
                      ? "bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-sm w-full sm:w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : 'Select range'}
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
      
      <CardContent className="space-y-6">
        {isLoadingCustom && (
          <div className="h-[250px] sm:h-[350px] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        )}
        
        {!isLoadingCustom && (
          <div className="space-y-6">
            <ChartContainer config={chartConfig} className="h-[300px] sm:h-[340px] w-full">
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={18}
                  interval="preserveStartEnd"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={84}
                  tickFormatter={(value) => formatCurrency(value as number)}
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <ChartTooltip content={<SalesTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[6, 6, 2, 2]}
                  maxBarSize={36}
                />
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/60 p-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total revenue</div>
                <div className="text-lg font-medium text-foreground">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">{displayData.length} days</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total sales</div>
                <div className="text-lg font-medium text-foreground">{totalSales.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">{displayData.length} days</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Daily average</div>
                <div className="text-lg font-medium text-foreground">{formatCurrency(averageDailyRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">Per day</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
