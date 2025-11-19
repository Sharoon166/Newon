import { getDashboardData } from '@/features/dashboard/actions';
import { MetricsCards } from '@/features/dashboard/components/metrics-cards';
import { SalesChart } from '@/features/dashboard/components/sales-chart';
import { AlertsSection } from '@/features/dashboard/components/alerts-section';
import { getSession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Check if user is admin
  const session = await getSession();

  // Redirect staff to inventory page (staff cannot access dashboard)
  if (session?.user?.role === 'staff') {
    redirect('/inventory');
  }

  // Fetch all dashboard data
  const { metrics, salesTrend, salesTrend30Days, lowStockAlerts, overdueInvoices, pendingPayments } = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="size-8" />}
        title="Dashboard"
        description="Welcome back!"
      />

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Alerts Row */}
      <div className="grid gap-6">
        <SalesChart data={salesTrend} data30Days={salesTrend30Days} />
        <AlertsSection
          lowStockAlerts={lowStockAlerts}
          overdueInvoices={overdueInvoices}
          pendingPayments={pendingPayments}
        />
      </div>
    </div>
  );
}
