'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableLedgerTable } from './printable-ledger-table';
import { CustomerLedger } from '../types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { Printer } from 'lucide-react';

interface PrintableLedgerTableWithPrintProps {
  data: CustomerLedger[];
}

export function PrintableLedgerTableWithPrint({ data }: PrintableLedgerTableWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Customer-Ledger-${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4;
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
    `,
  });

  return (
    <>
      <div className="print:hidden">
        <PageHeader title='Print Leger Report' backLink='/ledger'/>
        <Button className="fixed bottom-4 right-8" onClick={handlePrint}>
         <Printer /> Print as PDF
        </Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintableLedgerTable data={data} />
      </div>
    </>
  );
}
