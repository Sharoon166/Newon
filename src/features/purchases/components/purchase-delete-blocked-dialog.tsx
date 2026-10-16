'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import type { Purchase } from '../types';
import type { PurchasePaymentBlock } from '../utils/delete-guard';

interface PurchaseDeleteBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
  block: PurchasePaymentBlock | null;
}

/**
 * Shown instead of the destructive confirmation while a purchase still has
 * partial payments recorded against it. Mirrors the invoices table's
 * "Reverse the deliveries first" dialog: deletion stays locked until the
 * related records are adjusted.
 */
export function PurchaseDeleteBlockedDialog({
  open,
  onOpenChange,
  purchase,
  block
}: PurchaseDeleteBlockedDialogProps) {
  const blocked = purchase && block;

  return (
    <AlertDialog open={open && !!blocked} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Adjust the payments first</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked && (
              <>
                <span className="font-medium text-foreground">{purchase.purchaseId || 'This purchase'}</span>{' '}
                {block.count > 0
                  ? `has ${block.count} recorded payment${block.count === 1 ? '' : 's'} totalling ${formatCurrency(block.total)}`
                  : `has recorded payments totalling ${formatCurrency(block.total)}`}
                . Deleting it would remove that payment history too.
                <br />
                <br />
                Remove those payments from the purchase&apos;s payment history first - deletion stays locked
                until the purchase has no recorded payments left.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
