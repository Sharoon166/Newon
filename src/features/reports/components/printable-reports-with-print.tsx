'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableReports } from './printable-reports';
import type { YearlyReportData } from '../types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { Printer } from 'lucide-react';

interface PrintableReportsWithPrintProps {
  reportData: YearlyReportData;
}

export function PrintableReportsWithPrint({ reportData }: PrintableReportsWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Financial-Report-${reportData.year}`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
      @media print {
        * {
          box-sizing: border-box;
        }
        html, body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }
      }
    `
  });

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          icon={<Printer className="size-8" />}
          title={`Print Financial Report - ${reportData.year}`}
          backLink="/reports"
        />

        <Button className="fixed bottom-4 right-8" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print as PDF
        </Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintableReports reportData={reportData} />
      </div>
    </>
  );
}
