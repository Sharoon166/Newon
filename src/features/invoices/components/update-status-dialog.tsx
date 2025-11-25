'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateInvoiceStatus } from '../actions';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  currentStatus: string;
  type: 'invoice' | 'quotation';
  onSuccess: () => void;
}

type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'delivered'
  | 'cancelled'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired';

export function UpdateStatusDialog({
  open,
  onOpenChange,
  invoiceId,
  currentStatus,
  type,
  onSuccess
}: UpdateStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>(currentStatus as InvoiceStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment statuses (pending, paid, partial) are automatically calculated based on payments
  // Only allow manual status changes for delivery tracking
  const invoiceStatuses = [
    { value: 'delivered', label: 'Delivered' }
    // { value: 'cancelled', label: 'Cancelled' } - Use cancel button instead
  ] as const;

  const quotationStatuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' }
  ] as const;

  const immutableStatuses = ['converted'];
  const statuses = type === 'invoice' ? invoiceStatuses : quotationStatuses;

  const handleSubmit = async () => {
    if (immutableStatuses.includes(currentStatus)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updateInvoiceStatus(invoiceId, selectedStatus);
      toast.success('Status updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>Change the status of this {type}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">
              Status <Badge>{currentStatus}</Badge>
            </Label>
            <Select
              value={selectedStatus}
              onValueChange={value => setSelectedStatus(value as InvoiceStatus)}
              disabled={immutableStatuses.includes(currentStatus)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {immutableStatuses.includes(currentStatus) && (
              <p className="text-sm text-destructive/80">
                Status <span className="font-semibold">{currentStatus}</span> cannot be changed.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedStatus === currentStatus}>
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
