'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { deliverInvoice } from '../actions';
import { toast } from 'sonner';

export interface DeliverLineTarget {
  index: number;
  productName: string;
  sku?: string;
  unit: string;
  quantity: number;
  delivered: number;
  pending: number;
}

export interface DeliverTarget {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  lines: DeliverLineTarget[];
}

interface DeliverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DeliverTarget | null;
  onSuccess?: () => void;
}

export function DeliverDialog({ open, onOpenChange, target, onSuccess }: DeliverDialogProps) {
  const [quantities, setQuantities] = useState<Array<{ index: number; qty: number }>>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && target) {
      setQuantities(target.lines.map(line => ({ index: line.index, qty: line.pending })));
      setNote('');
    }
  }, [open, target]);

  const setLineQty = (index: number, qty: number) => {
    setQuantities(prev => prev.map(item => (item.index === index ? { ...item, qty } : item)));
  };

  const totalToDeliver = quantities.reduce((sum, q) => sum + q.qty, 0);
  const hasInvalid = quantities.some(q => q.qty < 0 || q.qty > (target?.lines.find(l => l.index === q.index)?.pending ?? 0));

  const handleConfirm = async () => {
    if (!target) return;
    if (totalToDeliver <= 0) {
      toast.error('Enter a quantity to deliver');
      return;
    }
    try {
      setIsSubmitting(true);
      const clientRef = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined;
      await deliverInvoice({
        invoiceId: target.id,
        lines: quantities.filter(q => q.qty > 0).map(q => ({ itemIndex: q.index, quantity: q.qty })),
        note: note.trim() || undefined,
        clientRef
      });
      toast.success(`Delivered ${totalToDeliver} unit(s) for invoice ${target.invoiceNumber}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Record delivery</DialogTitle>
          <DialogDescription>
            Record how many units actually left the shop for this invoice.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {target.invoiceNumber}
              </Badge>
              {target.customerName && <span className="font-medium">{target.customerName}</span>}
            </div>

            <div className="space-y-3">
              {target.lines.map(line => (
                <div key={line.index} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{line.productName}</div>
                      {line.sku && <div className="text-xs text-muted-foreground font-mono">{line.sku}</div>}
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {line.delivered} / {line.quantity} {line.unit} delivered
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      className="w-24"
                      value={quantities.find(q => q.index === line.index)?.qty ?? 0}
                      onChange={v => setLineQty(line.index, v)}
                      min={0}
                      max={line.pending}
                      placeholder="Qty"
                    />
                    <span className="text-sm text-muted-foreground">
                      of {line.pending} pending
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. handed to courier"
                rows={2}
              />
            </div>

            {hasInvalid && (
              <p className="text-xs text-destructive">
                A line exceeds its pending quantity — it cannot deliver more than was invoiced.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || totalToDeliver <= 0 || hasInvalid}>
            {isSubmitting ? 'Recording...' : `Deliver ${totalToDeliver || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}