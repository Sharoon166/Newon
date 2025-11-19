'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllStaff, updateStaffStatus } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { StaffTable } from './staff-table';
import { toast } from 'sonner';
import { AdminGate } from '@/components/auth/permission-gate';

interface Staff {
  id: string;
  staffId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
}

export function StaffManager() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStaff = async () => {
    setIsLoading(true);
    const result = await getAllStaff();
    if (result.success && result.data) {
      setStaff(result.data);
    } else {
      toast.error(result.error || 'Failed to load staff');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleStatusChange = async (staffId: string, isActive: boolean) => {
    const result = await updateStaffStatus(staffId, isActive);
    if (result.success) {
      toast.success(`Staff ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadStaff();
    } else {
      toast.error(result.error || 'Failed to update staff status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage staff members and their permissions</p>
        </div>
        <AdminGate>
          <Button onClick={() => router.push('/staff/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </AdminGate>
      </div>

      <StaffTable
        staff={staff}
        isLoading={isLoading}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
