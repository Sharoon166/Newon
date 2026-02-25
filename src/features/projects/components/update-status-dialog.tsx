'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { updateProjectStatus } from '../actions';
import { toast } from 'sonner';

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentStatus: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
}

export function UpdateStatusDialog({
  open,
  onOpenChange,
  projectId,
  currentStatus
}: UpdateStatusDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (status === currentStatus) {
      toast.error('Please select a different status');
      return;
    }

    setIsLoading(true);
    try {
      await updateProjectStatus(projectId, status);
      toast.success('Project status updated successfully');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating project status:', error);
      toast.error((error as Error).message || 'Failed to update project status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Project Status</DialogTitle>
          <DialogDescription>
            Change the status of this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
