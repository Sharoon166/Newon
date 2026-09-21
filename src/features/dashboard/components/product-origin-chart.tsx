'use client';

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ProductOriginData } from '../types';
import { Globe, MapPin } from 'lucide-react';

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
  const localCount = data.find(d => d.origin === 'local')?.count ?? 0;
  const importedCount = data.find(d => d.origin === 'imported')?.count ?? 0;
  const total = localCount + importedCount;

  const chartData = [
    { name: 'products', local: localCount, imported: importedCount }
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-base">Product origin</CardTitle>
        <CardDescription>Local vs imported breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[250px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={110}
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
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground"
                        >
                          Products
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-[2px]"
              style={{ backgroundColor: 'var(--color-local)' }}
            />
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Local</span>
            <span className="font-medium text-foreground">{localCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-[2px]"
              style={{ backgroundColor: 'var(--color-imported)' }}
            />
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Imported</span>
            <span className="font-medium text-foreground">{importedCount}</span>
          </div>
        </div>
        {total > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {((localCount / total) * 100).toFixed(0)}% local · {((importedCount / total) * 100).toFixed(0)}% imported
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
