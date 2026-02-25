'use client';

import { Button } from '@/components/ui/button';
import { Ban, CheckCircle, Loader2 } from 'lucide-react';
import { toggleVariantDisabled } from '../../actions';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface VariantActionsProps {
  productId: string;
  variantId: string;
  disabled: boolean;
  variantSku: string;
}

export function VariantActions({ productId, variantId, disabled, variantSku }: VariantActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const result = await toggleVariantDisabled(productId, variantId);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Failed to update variant status');
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Button
        variant={disabled ? 'default' : 'destructive'}
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : disabled ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Enable
          </>
        ) : (
          <>
            <Ban className="h-4 w-4 mr-2" />
            Disable
          </>
        )}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{disabled ? 'Enable' : 'Disable'} Variant?</DialogTitle>
            <DialogDescription>
              {disabled ? (
                <>
                  Are you sure you want to enable variant <strong>{variantSku}</strong>? It will be available for new
                  purchases and invoices.
                </>
              ) : (
                <>
                  Are you sure you want to disable variant <strong>{variantSku}</strong>? It will no longer be available
                  for new purchases or invoices, but existing purchase history will be preserved.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleToggle} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : disabled ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
