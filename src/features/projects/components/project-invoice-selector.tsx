'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Invoice } from '@/features/invoices/types';
import { formatCurrency } from '@/lib/utils';
import { Unlink, Loader2 } from 'lucide-react';
import { unlinkInvoiceFromProject } from '../actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProjectInvoiceSelectorProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onInvoiceSelect: (invoice: Invoice | null) => void;
  disabled?: boolean;
  disableUnlink?: boolean;
  projectId?: string;
  showUnlinkButton?: boolean;
  onUnlinked?: () => void;
}

export function ProjectInvoiceSelector({
  invoices,
  selectedInvoice,
  onInvoiceSelect,
  disabled = false,
  disableUnlink = false,
  projectId,
  showUnlinkButton = false,
  onUnlinked
}: ProjectInvoiceSelectorProps) {
  const router = useRouter();
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      onInvoiceSelect(invoice);
    }
  };

  const handleUnlink = async () => {
    if (!selectedInvoice || !projectId) return;

    try {
      setIsUnlinking(true);
      await unlinkInvoiceFromProject(projectId, selectedInvoice.invoiceNumber);
      toast.success('Invoice unlinked successfully. Custom expenses have been recreated.');
      onInvoiceSelect(null); // Clear the selected invoice
      setShowUnlinkDialog(false);
      if (onUnlinked) {
        onUnlinked();
      }
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to unlink invoice');
    } finally {
      setIsUnlinking(false);
    }
  };

  // Filter out OTC customers, cancelled invoices, and quotations - only show actual invoices
  const validInvoices = invoices.filter(
    invoice =>
      invoice.customerId !== 'otc' &&
      invoice.status !== 'cancelled' &&
      invoice.type === 'invoice' &&
      (!invoice.projectId || invoice.projectId === projectId)
  );

  return (
    <div className="space-y-2">
      <Label>
        Select Invoice <span className="text-destructive">*</span>
      </Label>
      <div className="flex gap-2">
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
        {showUnlinkButton && selectedInvoice && projectId && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowUnlinkDialog(true)}
            disabled={disableUnlink}
            title="Unlink invoice from project"
          >
            <Unlink className="h-4 w-4" />
          </Button>
        )}
      </div>
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

      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Invoice from Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink invoice <span className="font-semibold">{selectedInvoice?.invoiceNumber}</span> from this project.
              All custom expenses from the invoice will be recreated in the Expense collection.
              You can then select a different invoice for this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={isUnlinking}>
              {isUnlinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlink Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
