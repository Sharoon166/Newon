import { PageHeader } from '@/components/general/page-header';
import { getYearlyReport } from '@/features/reports/actions';
import { YearSelector } from '@/features/reports/components/year-selector';
import { SummaryCards } from '@/features/reports/components/summary-cards';
import { ReportsPageClient } from '@/features/reports/components/reports-page-client';
import { requireAuth } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await requireAuth();

  // Only allow admin to access reports
  if (session.user.role !== 'admin') {
    redirect('/not-allowed');
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = params.year ? parseInt(params.year) : currentYear;

  const reportData = await getYearlyReport(selectedYear);

  return (
    <>
      <PageHeader title="Financial Reports" description="View monthly financial performance and business metrics">
        <YearSelector label="Select Year" />
      </PageHeader>

      <div className="mt-6 space-y-6">
        <SummaryCards totals={reportData.totals} />
        <ReportsPageClient reportData={reportData} />
      </div>
    </>
  );
}
