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
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { markDamaged } from '../actions';
import { toast } from 'sonner';

export interface MarkDamagedTarget {
  id: string;
  purchaseId: string;
  productName: string;
  sku: string;
  quantity: number;
  remaining: number;
}

interface MarkDamagedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MarkDamagedTarget | null;
  onSuccess?: () => void;
}

export function MarkDamagedDialog({ open, onOpenChange, target, onSuccess }: MarkDamagedDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && target) {
      setQuantity(1);
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  const maxDamageable = target?.remaining ?? 0;

  const handleConfirm = async () => {
    if (!target) return;
    if (quantity <= 0) {
      toast.error('Enter a quantity to mark as damaged');
      return;
    }
    if (quantity > maxDamageable) {
      toast.error(`Cannot exceed remaining units (${maxDamageable})`);
      return;
    }
    try {
      setIsSubmitting(true);
      const clientRef = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined;
      const result = await markDamaged({ purchaseId: target.id, quantity, note: note || undefined, clientRef });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${quantity} damaged unit(s) written off from ${target.purchaseId}`);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Failed to record damaged stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as damaged</DialogTitle>
          <DialogDescription>
            Write off units that are damaged and no longer sellable. This decrements the batch remaining and the
            in‑shop count.
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
                <div className="text-lg font-semibold">{target.quantity}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="text-lg font-semibold">{target.remaining}</div>
              </div>
              <div className="rounded-md border bg-destructive/5 p-2">
                <div className="text-xs text-muted-foreground">Max damageable</div>
                <div className="text-lg font-bold text-destructive">{maxDamageable}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Units damaged</label>
              <NumberInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={maxDamageable}
                placeholder="Qty"
              />
              {quantity > maxDamageable && (
                <p className="text-xs text-destructive">
                  Cannot exceed remaining units ({maxDamageable}).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Note <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. dropped in transit, water damage..."
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || quantity <= 0 || quantity > maxDamageable}
          >
            {isSubmitting ? 'Saving...' : `Write off ${quantity || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
