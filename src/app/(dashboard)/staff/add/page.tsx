'use client';

import { useRouter } from 'next/navigation';
import { StaffForm } from '@/features/staff/components/staff-form';
import { PageHeader } from '@/components/general/page-header';

export default function AddStaffPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/staff');
    router.refresh();
  };

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader
        title="Add Staff Member"
        description="Add a new staff member to your organization"
        backLink="/staff"
      />
      
      <div className="mt-8 max-w-xl mx-auto">
        <StaffForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
