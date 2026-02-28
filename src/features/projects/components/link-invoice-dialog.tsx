'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { linkInvoiceToProject } from '../actions';

interface LinkInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  customerId: string;
  onSuccess: () => void;
}

export function LinkInvoiceDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess
}: LinkInvoiceDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setInvoiceNumber('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }

    setIsSubmitting(true);

    try {
      await linkInvoiceToProject(projectId, invoiceNumber.trim());
      toast.success('Invoice linked successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to link invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Invoice to Project</DialogTitle>
          <DialogDescription>
            Enter the invoice number to link it to this project. The invoice must belong to the same customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">
              Invoice Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2026-0001"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
