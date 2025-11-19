'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { StaffTable } from './staff-table';
import type { StaffMember } from '../types';

export function StaffTableWrapper({ 
  initialData,
  toggleStatusAction
}: { 
  initialData: StaffMember[];
  toggleStatusAction: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
}) {
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



  return (
    <StaffTable 
      staff={data}
      isLoading={false}
      onStatusChange={handleStatusChange}
    />
  );
}
