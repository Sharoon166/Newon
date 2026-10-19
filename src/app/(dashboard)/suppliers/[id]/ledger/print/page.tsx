'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getSupplierLedger } from '@/features/suppliers/actions';
import { PrintableSupplierLedger } from '@/features/suppliers/components/printable-supplier-ledger';
import type { SupplierLedgerData } from '@/features/suppliers/types';

export default function PrintSupplierLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const [ledger, setLedger] = useState<SupplierLedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const supplierId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getSupplierLedger(supplierId);
        if (data.entries.length === 0) {
          toast.error('No ledger entries found for this supplier');
          router.push(`/suppliers/${supplierId}`);
          return;
        }
        setLedger(data);
      } catch (error) {
        console.error('Error loading supplier ledger for print:', error);
        toast.error('Failed to load ledger data');
        router.push(`/suppliers/${supplierId}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (supplierId) {
      fetchData();
    }
  }, [supplierId, router]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Supplier-Statement-${ledger?.supplier.name || 'ledger'}-${new Date().toISOString().split('T')[0]}`,
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
        .print\\:hidden {
          display: none !important;
        }
      }
    `
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading supplier statement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-muted-foreground">No ledger data to print</p>
          <Button onClick={() => router.push(`/suppliers/${supplierId}`)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supplier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 print:py-0 print:m-0 print:p-0 print:max-w-full">
      <div className="print:hidden mb-4 flex gap-2">
        <Button onClick={() => router.push(`/suppliers/${supplierId}`)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>Print / Save as PDF</Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintableSupplierLedger ledger={ledger} />
      </div>
    </div>
  );
}
