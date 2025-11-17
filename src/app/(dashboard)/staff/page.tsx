import { requirePermission } from '@/lib/auth-utils';
import { StaffManager } from '@/features/staff/components/staff-manager';

export default async function StaffPage() {
  await requirePermission('view:staff');

  return (
    <div className="container mx-auto py-6">
      <StaffManager />
    </div>
  );
}
