'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { exportReportsToCsv } from '../utils/export-utils';
import type { YearlyReportData } from '../types';
import { ReportsTable } from './reports-table';
import { useRouter } from 'next/navigation';

interface ReportsPageClientProps {
  reportData: YearlyReportData;
}

export function ReportsPageClient({ reportData }: ReportsPageClientProps) {
  const router = useRouter();

  const handleExportCsv = () => {
    exportReportsToCsv(reportData.monthlyReports, reportData.year);
  };

  const handleExportPdf = () => {
    router.push(`/reports/print?year=${reportData.year}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-xl">Monthly Breakdown - {reportData.year}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>
      <ReportsTable data={reportData.monthlyReports} totals={reportData.totals} />
    </div>
  );
}
