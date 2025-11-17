import { requirePermission } from '@/lib/auth-utils';
import { StaffForm } from '@/features/staff/components/staff-form';
import { PageHeader } from '@/components/general/page-header';

export default async function NewStaffPage() {
  await requirePermission('create:staff');

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Add New Staff Member"
        description="Create a new staff member account"
        backLink="/staff"
      />
      
      <div className="mt-8 max-w-2xl mx-auto bg-white rounded-lg border p-6">
        <StaffForm />
      </div>
    </div>
  );
}
