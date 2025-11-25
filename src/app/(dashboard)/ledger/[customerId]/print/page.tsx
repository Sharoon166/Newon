'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { getCustomerLedgerEntries } from '@/features/ledger/actions';
import { getInvoices } from '@/features/invoices/actions';
import { PrintableLedger } from '@/features/ledger/components/printable-ledger';
import { LedgerEntry } from '@/features/ledger/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Date | string;
  dueDate?: Date | string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  type: string;
}

export default function PrintLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const [ledgerData, setLedgerData] = useState<{
    customerInfo: {
      customerId: string;
      customerName: string;
      customerCompany?: string;
      customerEmail: string;
      customerPhone: string;
    };
    ledgerEntries: LedgerEntry[];
    invoices: Invoice[];
    summary: {
      totalDebit: number;
      totalCredit: number;
      currentBalance: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const customerId = params.customerId as string;
        
        const ledgerEntries = await getCustomerLedgerEntries(customerId);
        
        if (ledgerEntries.length === 0) {
          toast.error('No ledger entries found for this customer');
          router.push('/ledger');
          return;
        }

        const invoicesResult = await getInvoices({ 
          customerId,
          limit: 1000
        });

        const customerInfo = {
          customerId,
          customerName: ledgerEntries[0].customerName,
          customerCompany: ledgerEntries[0].customerCompany,
          customerEmail: ledgerEntries[0].customerEmail || '',
          customerPhone: ledgerEntries[0].customerPhone || ''
        };

        const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
        const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
        const currentBalance = totalDebit - totalCredit;

        setLedgerData({
          customerInfo,
          ledgerEntries,
          invoices: invoicesResult.docs,
          summary: {
            totalDebit,
            totalCredit,
            currentBalance
          }
        });
      } catch (error) {
        console.error('Error loading customer ledger for print:', error);
        toast.error('Failed to load ledger data');
        router.push('/ledger');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.customerId) {
      fetchData();
    }
  }, [params.customerId, router]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ledger-${ledgerData?.customerInfo.customerName}-${new Date().toISOString().split('T')[0]}`,
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
            <p className="text-muted-foreground">Loading ledger data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ledgerData) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-muted-foreground">No ledger data to print</p>
          <Button onClick={() => router.push('/ledger')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ledger
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 print:py-0 print:m-0 print:p-0 print:max-w-full">
      <div className="print:hidden mb-4 flex gap-2">
        <Button onClick={() => router.push(`/ledger/${params.customerId}`)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>
          Print / Save as PDF
        </Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintableLedger
          customerInfo={ledgerData.customerInfo}
          ledgerEntries={ledgerData.ledgerEntries}
          invoices={ledgerData.invoices}
          summary={ledgerData.summary}
        />
      </div>
    </div>
  );
}
