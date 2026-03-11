import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { getDashboardData } from '@/features/dashboard/actions';
import { MetricsCards } from '@/features/dashboard/components/metrics-cards';
import { SalesChart } from '@/features/dashboard/components/sales-chart';
import { ProfitChart } from '@/features/dashboard/components/profit-chart';
import { AlertsSection } from '@/features/dashboard/components/alerts-section';
import { getSession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

async function DashboardCharts() {
  const { salesTrend, salesTrend30Days, salesTrendMonthly, profitTrend, profitTrend30Days, profitTrendMonthly } =
    await getDashboardData();

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
  const firstName = session?.user.name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${firstName}. Here’s how your business is doing today.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/invoices/new">New invoice</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory/add">Add product</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/expenses">Log expense</Link>
          </Button>
        </div>
      </PageHeader>

      <section aria-labelledby="dashboard-metrics">
        <h2 id="dashboard-metrics" className="sr-only">
          Key metrics
        </h2>
        <MetricsCards metrics={metrics} />
      </section>

      <section aria-labelledby="dashboard-charts" className="space-y-6">
        <h2 id="dashboard-charts" className="sr-only">
          Sales and profit trends
        </h2>
        <DashboardCharts />
      </section>

      <section aria-labelledby="dashboard-alerts" className="grid gap-6">
        <h2 id="dashboard-alerts" className="sr-only">
          Alerts and tasks
        </h2>
        <DashboardAlerts />
      </section>
    </div>
  );
}
