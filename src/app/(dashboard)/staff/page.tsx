import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getStaffMembers, toggleStaffStatus, deleteStaffMember } from '@/features/staff/actions';
import { PageHeader } from '@/components/general/page-header';
import { StaffTableWrapper } from '@/features/staff/components/staff-table-wrapper';

export default async function StaffPage() {
  // Fetch staff members on the server
  const staffMembers = await getStaffMembers({});

  // Server action for toggling staff status
  const toggleStatusAction = async (id: string, isActive: boolean) => {
    'use server';
    try {
      await toggleStaffStatus(id, isActive);
      return { success: true };
    } catch (error) {
      console.error('Error toggling staff status:', error);
      return { success: false, error: 'Failed to update staff status' };
    }
  };

  // Server action for deleting a staff member
  const deleteStaffAction = async (id: string) => {
    'use server';
    try {
      await deleteStaffMember(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting staff member:', error);
      return { success: false, error: 'Failed to delete staff member' };
    }
  };

  return (
    <>
      <PageHeader
        title="Staff Management"
        description="Manage your staff members and their permissions"
      >
        <Button asChild>
          <Link href="/staff/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <StaffTableWrapper 
          initialData={staffMembers}
          toggleStatusAction={toggleStatusAction}
          deleteStaffAction={deleteStaffAction}
        />
      </div>
    </>
  );
}
