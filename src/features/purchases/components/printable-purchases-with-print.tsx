'use client';

import { useRef, useState, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintablePurchases } from './printable-purchases';
import { Purchase } from '../types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PrintablePurchasesWithPrintProps {
  data: Purchase[];
}

export function PrintablePurchasesWithPrint({ data }: PrintablePurchasesWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Get unique suppliers from data
  const suppliers = useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(data.map(p => p.supplier || 'Unknown Supplier'))).sort();
    return uniqueSuppliers;
  }, [data]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase-History-${new Date().toISOString().split('T')[0]}`,
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
    `,
  });

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Print Purchase History Report" backLink="/purchases" />
        
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium">Filter by Supplier:</label>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="fixed bottom-4 right-8" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print as PDF
        </Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintablePurchases data={data} selectedSupplier={selectedSupplier} />
      </div>
    </>
  );
}
