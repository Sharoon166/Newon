import { Suspense } from 'react';
import { getDashboardData } from '@/features/dashboard/actions';
import { MetricsCards } from '@/features/dashboard/components/metrics-cards';
import { SalesChart } from '@/features/dashboard/components/sales-chart';
import { ProfitChart } from '@/features/dashboard/components/profit-chart';
import { AlertsSection } from '@/features/dashboard/components/alerts-section';
import { getSession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
        <div className="grid md:grid-cols-3 gap-4 pt-4 mt-4 border-t">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-3 w-24 mx-auto" />
              <Skeleton className="h-6 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function DashboardCharts() {
  const {
    salesTrend,
    salesTrend30Days,
    salesTrendMonthly,
    profitTrend,
    profitTrend30Days,
    profitTrendMonthly
  } = await getDashboardData();

  return (
    <>
      <SalesChart data={salesTrend} data30Days={salesTrend30Days} dataMonthly={salesTrendMonthly} />
      <ProfitChart data={profitTrend} data30Days={profitTrend30Days} dataMonthly={profitTrendMonthly} />
    </>
  );
}

async function DashboardAlerts() {
  const { outOfStockAlerts, overdueInvoices, pendingPayments } = await getDashboardData();

  return (
    <AlertsSection
      outOfStockAlerts={outOfStockAlerts}
      overdueInvoices={overdueInvoices}
      pendingPayments={pendingPayments}
    />
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (session?.user?.role === 'staff') {
    redirect('/inventory');
  }

  const { metrics } = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="size-8" />}
        title="Dashboard"
        description="Welcome back!"
      />

      <MetricsCards metrics={metrics} />

      <div className="grid gap-6">
        <Suspense fallback={<><ChartSkeleton /><ChartSkeleton /></>}>
          <DashboardCharts />
        </Suspense>
      </div>

      <div className="grid gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardAlerts />
        </Suspense>
      </div>
    </div>
  );
}
