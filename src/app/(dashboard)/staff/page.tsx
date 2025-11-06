import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { getStaffMembers, toggleStaffStatus, deleteStaffMember } from '@/features/staff/actions';
import { PageHeader } from '@/components/general/page-header';
import { StaffTableWrapper } from '@/features/staff/components/staff-table-wrapper';

const MAX_STAFF = 1;

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
        {
          staffMembers.length < MAX_STAFF
            ? <Button asChild>
              <Link href="/staff/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Link>
            </Button>
            : <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>}
      </PageHeader>

      {
        staffMembers.length > MAX_STAFF ? <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            You have reached the maximum number of staff members allowed <strong>{MAX_STAFF}</strong>.
          </p>
        </div> : <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            A max of <strong>{MAX_STAFF} staff members</strong> are allowed.
          </p>
        </div>
      }

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
