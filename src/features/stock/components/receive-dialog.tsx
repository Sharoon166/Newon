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
import { receivePurchase } from '../actions';
import { toast } from 'sonner';

export interface ReceiveTarget {
  id: string;
  purchaseId: string;
  productName: string;
  sku: string;
  ordered: number;
  received: number;
  supplier?: string;
}

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReceiveTarget | null;
  onSuccess?: () => void;
}

export function ReceiveDialog({ open, onOpenChange, target, onSuccess }: ReceiveDialogProps) {
  const [quantity, setQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pending = target ? Math.max(0, target.ordered - target.received) : 0;

  useEffect(() => {
    if (open && target) {
      setQuantity(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  const handleConfirm = async () => {
    if (!target) return;
    if (quantity <= 0) {
      toast.error('Enter a quantity to receive');
      return;
    }
    try {
      setIsSubmitting(true);
      const clientRef = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined;
      await receivePurchase({ purchaseId: target.id, quantity, clientRef });
      toast.success(`Received ${quantity} unit(s) of ${target.productName}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to receive stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>
            Record how many units of this purchase actually arrived.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {target.purchaseId}
              </Badge>
              <span className="font-medium">{target.productName}</span>
              <Badge variant="outline" className="font-mono">
                {target.sku}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Ordered</div>
                <div className="text-lg font-semibold">{target.ordered}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="text-lg font-semibold">{target.received}</div>
              </div>
              <div className="rounded-md border bg-primary/5 p-2">
                <div className="text-xs text-muted-foreground">To come</div>
                <div className="text-lg font-bold text-primary">{pending}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Units received now</label>
              <NumberInput value={quantity} onChange={setQuantity} min={1} max={pending} placeholder="Qty" />
              {quantity > pending && (
                <p className="text-xs text-destructive">Cannot receive more than was ordered ({pending} to come).</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || quantity <= 0 || quantity > pending}>
            {isSubmitting ? 'Receiving...' : `Receive ${quantity || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}