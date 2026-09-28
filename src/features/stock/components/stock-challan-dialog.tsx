'use client';

import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FileDown, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getStockChallan } from '../actions';
import { RETURN_TERMS, returnLabels } from '../return-naming';
import { StockChallanTemplate, type ChallanLine } from './stock-challan-template';
import type { StockChallanData, StockChallanKind, StockMovement } from '../types';

interface StockChallanDialogProps {
  /** The slip the challan is generated for (null = closed). */
  movement: StockMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHEET_TITLES: Record<Exclude<StockChallanKind, 'reversal'>, string> = {
  in: 'Purchase challan',
  out: 'Delivery challan',
  adjustment: 'Adjustment challan',
  opening: 'Starting count challan'
};

const TERMS: Record<Exclude<StockChallanKind, 'reversal'>, string[] | undefined> = {
  in: ['1. Goods received are recorded against the purchase shown above.'],
  // The plain stock-out slip keeps the standard delivery wording.
  out: undefined,
  adjustment: [
    '1. Adjustment made after a physical count of stock in the shop.',
    '2. In shop before → after is shown against the line.'
  ],
  opening: [
    '1. Starting counts recorded as at the date above.',
    '2. Every product and variant of this batch is listed on this single challan.'
  ]
};

/** A return challan carries the wording of its own flavor (see return-naming.ts). */
function returnTerms(movement: StockMovement): string[] {
  return RETURN_TERMS[movement.returnKind];
}

/**
 * Printable challan for a History slip that is not an invoice delivery:
 * purchase (receive), delivery (a delivery without an invoice), a quick-count
 * adjustment, the starting counts - which are printed as one batched challan
 * per start-date run instead of one slip per product - and the returns (a
 * purchase return, a sales return or a correction), which name their own flavor.
 */
export function StockChallanDialog({ movement, open, onOpenChange }: StockChallanDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<StockChallanData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const movementId = movement?.movementId;

  useEffect(() => {
    if (!open || !movementId) return;
    let cancelled = false;
    setIsLoading(true);
    setData(null);
    getStockChallan({ movementId })
      .then(result => {
        if (cancelled) return;
        setData(result);
        if (!result) toast.error('This slip cannot be printed as a challan');
      })
      .catch(error => {
        console.error('Failed to load stock challan:', error);
        if (!cancelled) toast.error('Could not load the challan');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, movementId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    preserveAfterPrint: true,
    documentTitle: `Stock-Challan-${movement?.movementId ?? 'slip'}`,
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print\\:hidden { display: none !important; }
      }
    `
  });

  if (!movement) return null;

  const lines: ChallanLine[] = (data?.lines ?? []).map(line => ({
    description: line.description,
    note: line.note,
    quantity: line.quantity,
    rate: line.rate
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader className="pt-12 lg:pl-12">
          <SheetTitle className="text-lg font-semibold text-primary inline-flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {data
              ? data.kind === 'reversal'
                ? returnLabels(movement).challan
                : SHEET_TITLES[data.kind]
              : 'Stock challan'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <Button size="sm" onClick={handlePrint} disabled={isLoading || !data}>
            <Printer className="mr-1 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : data ? (
            <StockChallanTemplate
              ref={printRef}
              data={{
                challanNumber: data.challanNumber,
                date: data.date,
                title: data.title,
                reference: data.reference,
                market: data.market,
                client: { ...data.client, name: data.client.name || '—' },
                lines,
                totalQuantity: data.totalQuantity,
                note: data.note,
                showContact: data.showContact,
                terms: data.kind === 'reversal' ? returnTerms(movement) : TERMS[data.kind]
              }}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Nothing to print for this slip.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
