'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StaffTable } from './staff-table';
import { StaffActions } from './staff-actions';
import type { StaffMember } from '../types';
import { Row } from '@tanstack/react-table';

export function StaffTableWrapper({ 
  initialData,
  toggleStatusAction,
  deleteStaffAction 
}: { 
  initialData: StaffMember[];
  toggleStatusAction: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteStaffAction: (id: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  const handleStatusChange = async (id: string, isActive: boolean) => {
    try {
      const result = await toggleStatusAction(id, isActive);
      
      if (result.success) {
        setData(prevData => 
          prevData.map(staff => 
            staff.id === id ? { ...staff, isActive } : staff
          )
        );
        toast.success(`Staff member ${isActive ? 'activated' : 'deactivated'} successfully`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast.error('Failed to update staff status');
    }
  };

  const handleDelete = async (id: string) => {    
    try {
      const result = await deleteStaffAction(id);
      
      if (result.success) {
        setData(prevData => prevData.filter(staff => staff.id !== id));
        toast.success('Staff member deleted successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Failed to delete staff member');
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/staff/${id}/edit`);
  };

  const actions = (row: Row<StaffMember>) => (
    <StaffActions
      id={row.original.id}
      isActive={row.original.isActive}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
    />
  );

  return (
    <StaffTable 
      data={data}
      onEdit={handleEdit}
      actions={actions}
    />
  );
}
