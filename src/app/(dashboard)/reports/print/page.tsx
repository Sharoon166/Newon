import { getYearlyReport } from '@/features/reports/actions';
import { PrintableReportsWithPrint } from '@/features/reports/components/printable-reports-with-print';
import { requireAuth } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PrintReportsPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>;
}) {
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
    <div className="py-10 print:py-0 print:m-0 print:p-0">
      <PrintableReportsWithPrint reportData={reportData} />
    </div>
  );
}
