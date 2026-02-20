import { getStaffMembers } from '../actions';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { StaffTable } from './staff-table';
import { AdminGate } from '@/components/auth/permission-gate';
import { PageHeader } from '@/components/general/page-header';
import Link from 'next/link';

// Maximum number of staff members allowed
const MAX_STAFF_LIMIT = 10;

export async function StaffManager() {
  const staff = await getStaffMembers();
  const isLimitReached = staff.length >= MAX_STAFF_LIMIT;

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" description="Manage staff members and their permissions">
        <AdminGate>
          {!isLimitReached && (
            <Button asChild>
              <Link href="/staff/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Link>
            </Button>
          )}
        </AdminGate>
      </PageHeader>

      <StaffTable staff={staff} />
    </div>
  );
}
