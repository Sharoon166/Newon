import { SupplierFormWrapper } from '@/features/suppliers/components/supplier-form-wrapper';
import { PageHeader } from '@/components/general/page-header';
import { requirePermission } from '@/lib/auth-utils';

export default async function AddSupplierPage() {
  await requirePermission('create:suppliers');

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader title="Add Supplier" description="Add a new supplier to your database" backLink="/suppliers" />

      <div className="mt-8 max-w-xl mx-auto">
        <SupplierFormWrapper />
      </div>
    </div>
  );
}
