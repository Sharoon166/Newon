'use client';

import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { COMPANY_DETAILS } from '@/constants';
import { DeliveryNoteTemplate } from '@/features/invoices/components/delivery-note-template';
import { getInvoice } from '@/features/invoices/actions';
import type { Invoice } from '@/features/invoices/types';
import type { StockMovement } from '../types';

interface DeliveryChallanDialogProps {
  /** The delivery movement the challan is generated for (null = closed). */
  movement: StockMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Printable delivery challan for a single History delivery slip. The slip's own
 * lines are what actually left the shop, so those become the item list; the
 * linked invoice only supplies the customer details and market.
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
      @page { size: A4; margin: 18mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print\\:hidden { display: none !important; }
      }
    `
  });

  if (!movement) return null;

  const lines = movement.lines ?? [];
  const items =
    lines.length > 0
      ? lines.map(line => ({
          description: line.productName,
          quantity: line.quantity,
          variantSKU: line.sku
        }))
      : [
          {
            description: movement.productName,
            quantity: movement.quantity,
            variantSKU: movement.sku
          }
        ];

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
            <DeliveryNoteTemplate
              title="DELIVERY CHALLAN"
              data={{
                deliveryNoteNumber: movement.movementId,
                date: movement.createdAt,
                orderNumber: movement.invoiceNumber ?? '—',
                shippingDate: movement.createdAt,
                market: invoice?.market ?? 'newon',
                client: {
                  name: invoice?.customerName || movement.customerName || '',
                  company: invoice?.customerCompany,
                  address: invoice?.customerAddress,
                  city: invoice?.customerCity,
                  state: invoice?.customerState,
                  zip: invoice?.customerZip,
                  phone: invoice?.customerPhone || ''
                },
                items,
                company: COMPANY_DETAILS
              }}
              ref={printRef}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
