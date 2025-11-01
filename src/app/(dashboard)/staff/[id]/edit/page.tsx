'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StaffForm } from '@/features/staff/components/staff-form';
import { StaffMember } from '@/features/staff/types';
import { getStaffMember } from '@/features/staff/actions';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const data = await getStaffMember(params.id as string);
        setStaff(data);
      } catch (error) {
        console.error('Error loading staff member:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadStaff();
    }
  }, [params.id]);

  const handleSuccess = () => {
    router.push('/staff');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto grow grid place-content-center space-y-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Staff member not found</h2>
          <p className="text-muted-foreground mt-2">The requested staff member could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader
        title="Edit Staff Member"
        description="Update staff member details"
        backLink="/staff"
      />
      
      <div className="mt-8 max-w-xl mx-auto">
        <StaffForm 
          initialData={staff} 
          onSuccess={handleSuccess} 
        />
      </div>
    </div>
  );
}
