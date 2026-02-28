'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Invoice } from '@/features/invoices/types';
import { formatCurrency } from '@/lib/utils';

interface ProjectInvoiceSelectorProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onInvoiceSelect: (invoice: Invoice | null) => void;
  disabled?: boolean;
}

export function ProjectInvoiceSelector({
  invoices,
  selectedInvoice,
  onInvoiceSelect,
  disabled = false
}: ProjectInvoiceSelectorProps) {
  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      onInvoiceSelect(invoice);
    }
  };

  // Filter out OTC customers and cancelled invoices
  const validInvoices = invoices.filter(
    invoice => invoice.customerId !== 'otc' && invoice.status !== 'cancelled'
  );

  return (
    <div className="space-y-2">
      <Label>
        Select Invoice <span className="text-destructive">*</span>
      </Label>
      <Select
        value={selectedInvoice?.id || ''}
        onValueChange={handleInvoiceChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an invoice..." />
        </SelectTrigger>
        <SelectContent>
          {validInvoices.map(invoice => (
            <SelectItem key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {invoice.customerName}
                <span className="text-muted-foreground">{invoice.customerCompany && ` (${invoice.customerCompany})`}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedInvoice && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{selectedInvoice.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(selectedInvoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{selectedInvoice.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
