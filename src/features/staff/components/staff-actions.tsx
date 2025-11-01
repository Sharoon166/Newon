'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Power } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

export function StaffActions({
  id,
  isActive,
  onStatusChange,
  onDelete,
}: {
  id: string;
  isActive: boolean;
  onStatusChange: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async () => {
    try {
      setIsProcessing(true);
      await onStatusChange(id, !isActive);
      setShowDeactivateDialog(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(`Failed to ${isActive ? 'deactivate' : 'activate'} staff member`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await onDelete(id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff member');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setShowDeactivateDialog(true)}
            className="cursor-pointer"
          >
            <Power className="mr-2 h-4 w-4" />
            {isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate Confirmation */}
      <ConfirmationDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        title={isActive ? 'Deactivate Staff Member' : 'Activate Staff Member'}
        description={
          isActive 
            ? 'Are you sure you want to deactivate this staff member? They will no longer be able to access the system.'
            : 'Are you sure you want to activate this staff member? They will be able to access the system.'
        }
        confirmText={isActive ? 'Deactivate' : 'Activate'}
        onConfirm={handleStatusChange}
        isProcessing={isProcessing}
        variant={isActive ? 'destructive' : 'default'}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Staff Member"
        description="This action cannot be undone. This will permanently delete the staff member and all associated data."
        confirmText="Delete"
        onConfirm={handleDelete}
        isProcessing={isProcessing}
        variant="destructive"
      />
    </>
  );
}
