'use client';

import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { COMPANY_DETAILS } from '@/constants';
import { getInvoice } from '@/features/invoices/actions';
import type { Invoice } from '@/features/invoices/types';
import { DeliveryChallanTemplate, type ChallanLine } from '../components/delivery-challan-template';
import type { StockMovement } from '../types';

interface DeliveryChallanDialogProps {
  /** The delivery movement the challan is generated for (null = closed). */
  movement: StockMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const addressLine = (invoice?: Invoice | null) => {
  if (!invoice) return undefined;
  return [invoice.customerAddress, invoice.customerCity].filter(Boolean).join(', ') || undefined;
};

/**
 * Printable delivery challan for a single History delivery slip. The slip's own
 * lines are what actually left the shop, so those become the goods list; the
 * linked invoice supplies the party details and, where the line still maps back
 * to an invoice item, the rate/amount columns.
 */
export function DeliveryChallanDialog({ movement, open, onOpenChange }: DeliveryChallanDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !movement?.invoiceId) return;
    let cancelled = false;
    setIsLoading(true);
    setInvoice(null);
    getInvoice(movement.invoiceId)
      .then(result => {
        if (!cancelled) setInvoice(result);
      })
      .catch(error => {
        console.error('Failed to load invoice for delivery challan:', error);
        toast.error('Could not load the linked invoice — showing basic details');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, movement?.invoiceId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    preserveAfterPrint: true,
    documentTitle: `Delivery-Challan-${movement?.movementId ?? 'slip'}`,
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print\\:hidden { display: none !important; }
      }
    `
  });

  if (!movement) return null;

  const lines = movement.lines ?? [];
  const challanLines: ChallanLine[] = (
    lines.length > 0
      ? lines.map(line => ({ description: line.productName, quantity: line.quantity, note: line.sku }))
      : [{ description: movement.productName, quantity: movement.quantity, note: movement.sku }]
  ).map((line, index) => {
    const source = lines.length > 0 ? lines[index] : undefined;
    const item = source?.itemIndex !== undefined ? invoice?.items?.[source.itemIndex] : undefined;
    const components = source?.components?.length
      ? `= ${source.components.map(component => `${component.quantity} × ${component.productName}`).join(', ')}`
      : undefined;
    return {
      ...line,
      note: [line.note, components].filter(Boolean).join('  '),
      rate: item?.unitPrice
    };
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader className="pt-12 lg:pl-12">
          <SheetTitle className="text-lg font-semibold text-primary inline-flex items-center gap-2">
            <Printer /> Delivery challan
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <Button size="sm" onClick={handlePrint} disabled={isLoading}>
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
          ) : (
            <DeliveryChallanTemplate
              ref={printRef}
              data={{
                challanNumber: movement.movementId,
                date: movement.createdAt,
                invoiceNumber: invoice?.invoiceNumber ?? movement.invoiceNumber,
                market: invoice?.market ?? 'newon',
                client: {
                  name: invoice?.customerName || movement.customerName || '',
                  company: invoice?.customerCompany,
                  address: addressLine(invoice),
                  phone: invoice?.customerPhone || ''
                },
                lines: challanLines,
                company: COMPANY_DETAILS
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
