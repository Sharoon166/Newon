'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { StockSlips } from './stock-slips';
import type { StockMovement } from '../types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { Printer } from 'lucide-react';

interface PrintableStockSlipsWithPrintProps {
  movements: StockMovement[];
}

export function PrintableStockSlipsWithPrint({ movements }: PrintableStockSlipsWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    documentTitle: 'Stock slips',
    contentRef: printRef,
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
    `
  });

  return (
    <div className="py-4 print:py-0 print:m-0 print:p-0">
      <div className="print:hidden mb-6">
        <PageHeader
          title="Stock slips"
          description={`${movements.length} movement(s). These slips are used to keep a physical record — hand them to whoever receives or delivers the goods.`}
        >
          <Button onClick={() => handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </PageHeader>
      </div>
      <div ref={printRef}>
        <StockSlips movements={movements} />
      </div>
    </div>
  );
}