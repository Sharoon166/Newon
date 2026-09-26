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
import { quickCount } from '../actions';
import { toast } from 'sonner';

export interface QuickCountTarget {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  currentInShop: number;
  available: number;
}

interface QuickCountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: QuickCountTarget | null;
  onSuccess?: () => void;
}

export function QuickCountDialog({ open, onOpenChange, target, onSuccess }: QuickCountDialogProps) {
  const [count, setCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && target) {
      setCount(target.currentInShop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  const handleConfirm = async () => {
    if (!target) return;
    try {
      setIsSubmitting(true);
      const clientRef = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined;
      const result = await quickCount({ productId: target.productId, variantId: target.variantId, count, clientRef });
      if (!result.success) {
        // Expected failures come back as a value so their wording reaches the toast.
        toast.error(result.error);
        return;
      }
      toast.success(`In shop for ${target.productName} set to ${count}`);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Safety net for auth/network faults - expected problems never throw.
      toast.error('Failed to update count');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick count</DialogTitle>
          <DialogDescription>
            Correct the physical count. Enter the number of units actually in the shop right now.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{target.productName}</span>
              <span className="font-mono text-sm text-muted-foreground">{target.sku}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Available (system)</div>
                <div className="text-lg font-semibold">{target.available}</div>
              </div>
              <div className="rounded-md border bg-primary/5 p-2">
                <div className="text-xs text-muted-foreground">Currently in shop</div>
                <div className="text-lg font-bold text-primary">{target.currentInShop}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Counted in shop</label>
              <NumberInput className="w-32" value={count} onChange={setCount} min={0} placeholder="Count" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || count < 0}>
            {isSubmitting ? 'Saving...' : 'Save count'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}