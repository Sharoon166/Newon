'use client';

import { useState, useCallback } from 'react';
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { ProductOriginData, ProductOriginProfitData } from '../types';
import { Globe, MapPin, RefreshCw, DollarSign, TrendingUp, TrendingDown, CoinsIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProductOriginChartProps {
  data: ProductOriginData[];
}

const chartConfig = {
  local: {
    label: 'Local',
    color: 'var(--chart-2)'
  },
  imported: {
    label: 'Imported',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function ProductOriginChart({ data }: ProductOriginChartProps) {
  const [profitData, setProfitData] = useState<ProductOriginProfitData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const localCount = data.find(d => d.origin === 'local')?.count ?? 0;
  const importedCount = data.find(d => d.origin === 'imported')?.count ?? 0;
  const totalProducts = localCount + importedCount;

  const localProfit = profitData?.find(d => d.origin === 'local')?.profit ?? 0;
  const importedProfit = profitData?.find(d => d.origin === 'imported')?.profit ?? 0;
  const totalProfit = localProfit + importedProfit;
  
  const localRevenue = profitData?.find(d => d.origin === 'local')?.revenue ?? 0;
  const importedRevenue = profitData?.find(d => d.origin === 'imported')?.revenue ?? 0;
  const totalRevenue = localRevenue + importedRevenue;

  const localInvoices = profitData?.find(d => d.origin === 'local')?.invoices ?? 0;
  const importedInvoices = profitData?.find(d => d.origin === 'imported')?.invoices ?? 0;

  const handleRefreshProfit = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { getProductOriginProfitData } = await import('../actions');
      const result = await getProductOriginProfitData();
      setProfitData(result);
    } catch (error) {
      console.error('Error fetching profit data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const productChartData = [
    { name: 'products', local: localCount, imported: importedCount }
  ];

  const profitChartData = [
    { name: 'revenue', local: Math.max(0, localRevenue), imported: Math.max(0, importedRevenue) }
  ];

  return (
    <Card className="flex flex-col @container">
      <CardHeader className="items-center pb-0">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-base">Product Origin</CardTitle>
            <CardDescription>Local vs imported breakdown</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshProfit}
            disabled={isLoading}
            className="h-8 gap-1"
            title="Calculate profit by origin"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-xs">{profitData ? 'Refresh' : 'Profit'}</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-0">
        {/* Charts container - side by side on larger screens, stacked on mobile */}
        <div className="grid w-full gap-4 @md:grid-cols-2">
          {/* Product Distribution Chart - Always visible */}
          <div className="w-full">
            <p className="text-xs font-medium text-muted-foreground text-center mb-2">Products</p>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square w-full max-w-[180px]"
            >
              <RadialBarChart
                data={productChartData}
                endAngle={180}
                innerRadius={55}
                outerRadius={80}
              >
                <PolarGrid
                  gridType="circle"
                  radialLines={false}
                  stroke="none"
                  className="first:fill-muted last:fill-muted"
                />
                <RadialBar
                  dataKey="local"
                  fill="var(--color-local)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="imported"
                  stackId="a"
                  cornerRadius={5}
                  fill="var(--color-imported)"
                  className="stroke-transparent stroke-2"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 8}
                              className="fill-foreground text-lg font-bold"
                            >
                              {totalProducts.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 6}
                              className="fill-muted-foreground text-[10px]"
                            >
                              Total
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </div>

          {/* Profit Chart - Shows when data is loaded */}
          <div className={`w-full ${profitData ? '' : 'hidden @md:flex items-center justify-center'}`}>
            {profitData ? (
              <>
                <p className="text-xs font-medium text-muted-foreground text-center mb-2">Profit (Month)</p>
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square w-full max-w-[180px]"
                >
                  <RadialBarChart
                    data={profitChartData}
                    endAngle={180}
                    innerRadius={55}
                    outerRadius={80}
                  >
                    <PolarGrid
                      gridType="circle"
                      radialLines={false}
                      stroke="none"
                      className="first:fill-muted last:fill-muted"
                    />
                    <RadialBar
                      dataKey="local"
                      fill="var(--color-local)"
                      stackId="a"
                      cornerRadius={5}
                      className="stroke-transparent stroke-2"
                    />
                    <RadialBar
                      dataKey="imported"
                      stackId="a"
                      cornerRadius={5}
                      fill="var(--color-imported)"
                      className="stroke-transparent stroke-2"
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) - 8}
                                  className={`text-base font-bold ${totalProfit >= 0 ? 'fill-green-600' : 'fill-red-600'}`}
                                >
                                  {formatCurrency(totalProfit, false)}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 6}
                                  className="fill-muted-foreground text-[10px]"
                                >
                                  Profit
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </PolarRadiusAxis>
                  </RadialBarChart>
                </ChartContainer>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 @md:block hidden">
                <TrendingUp className="h-8 w-8 mb-2 mx-auto text-success" />
                <p className="text-sm text-muted-foreground">Click "Profit" to calculate</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex-col gap-3 text-sm pt-4">
        {/* Product count stats */}
        <div className="flex items-center justify-center gap-6 w-full">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-[2px]"
              style={{ backgroundColor: 'var(--color-local)' }}
            />
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Local</span>
            <span className="font-medium">{localCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-[2px]"
              style={{ backgroundColor: 'var(--color-imported)' }}
            />
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Imported</span>
            <span className="font-medium">{importedCount}</span>
          </div>
        </div>
        
        {totalProducts > 0 && !profitData && (
          <p className="text-center text-xs text-muted-foreground">
            {((localCount / totalProducts) * 100).toFixed(0)}% local · {((importedCount / totalProducts) * 100).toFixed(0)}% imported
          </p>
        )}

        {/* Profit stats - Shows when data is loaded */}
        {profitData && (
          <div className="w-full border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Local Profit */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Local</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  <div className="flex items-center gap-1">
                    {localProfit >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={localProfit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(localProfit, false)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">Revenue: {formatCurrency(localRevenue, false)}</p>
                  <p className="text-muted-foreground">{localInvoices} invoices</p>
                </div>
              </div>
              
              {/* Imported Profit */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Imported</span>
                </div>
                <div className="pl-4 space-y-0.5">
                  <div className="flex items-center gap-1">
                    {importedProfit >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={importedProfit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(importedProfit, false)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">Revenue: {formatCurrency(importedRevenue, false)}</p>
                  <p className="text-muted-foreground">{importedInvoices} invoices</p>
                </div>
              </div>
            </div>
            
            {totalRevenue > 0 && (
              <div className="flex items-center justify-center gap-4 text-xs pt-2 border-t">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Margin:</span>
                  <span className="font-medium">{((totalProfit / totalRevenue) * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
