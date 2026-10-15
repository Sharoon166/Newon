'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Ban, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

export function SupplierActions({
  id,
  disabled,
  onDelete,
  onToggleDisabled
}: {
  id: string;
  disabled?: boolean;
  onDelete: (id: string) => Promise<void>;
  onToggleDisabled: (id: string) => Promise<void>;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await onDelete(id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDisabled = async () => {
    try {
      setIsProcessing(true);
      await onToggleDisabled(id);
      toast.success(disabled ? 'Supplier enabled' : 'Supplier disabled');
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      toast.error('Failed to update supplier status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isProcessing}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleToggleDisabled} className="cursor-pointer">
            {disabled ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                Enable Supplier
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4 text-orange-600" />
                Disable Supplier
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Supplier"
        description="This action cannot be undone. This will permanently delete the supplier. Suppliers with purchase history cannot be deleted - disable them instead."
        confirmText="Delete"
        onConfirm={handleDelete}
        isProcessing={isProcessing}
        variant="destructive"
      />
    </>
  );
}
