'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCcw, Pencil } from 'lucide-react';
import Link from 'next/link';
import { UpdateStatusDialog } from './update-status-dialog';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { cancelProject } from '../actions';
import { toast } from 'sonner';
import { ProjectStatus } from '../types';

interface ProjectActionsProps {
  projectId: string;
  projectTitle: string;
  projectStatus: ProjectStatus;
  canEdit: boolean;
  canCancel: boolean;
  userRole: string;
}

export function ProjectActions({
  projectId,
  projectTitle,
  projectStatus,
  canEdit,
  canCancel,
  userRole
}: ProjectActionsProps) {
  const router = useRouter();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await cancelProject(projectId);
      toast.success('Project cancelled successfully');
      setCancelDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to cancel project');
      console.error(error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-3">
        {canCancel && projectStatus !== 'cancelled' && (
          <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
            <XCircle />
            Cancel Project
          </Button>
        )}
        {canEdit && userRole === 'admin' && (
          <Button variant="secondary" onClick={() => setStatusDialogOpen(true)}>
            <RefreshCcw /> Update Status
          </Button>
        )}
        {canEdit && (
          <Button asChild>
            <Link href={`/projects/${projectId}/edit`}>
              <Pencil />
              Edit Project
            </Link>
          </Button>
        )}
      </div>

      {canEdit && (
        <UpdateStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          projectId={projectId}
          currentStatus={projectStatus}
        />
      )}

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title="Cancel Project"
        description={`Are you sure you want to cancel project "${projectTitle}"? This will delete all project expenses, unlink the invoice, and recreate the invoice expenses in the Expense collection.`}
        confirmText="Cancel Project"
        variant="destructive"
        isProcessing={isCancelling}
      />
    </>
  );
}
