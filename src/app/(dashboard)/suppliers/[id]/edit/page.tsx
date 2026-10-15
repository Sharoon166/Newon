import { SupplierFormWrapper } from '@/features/suppliers/components/supplier-form-wrapper';
import { PageHeader } from '@/components/general/page-header';
import { getSupplier } from '@/features/suppliers/actions';
import { notFound } from 'next/navigation';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let supplier;
  try {
    supplier = await getSupplier(id);
  } catch {
    notFound();
  }

  if (!supplier) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader title="Edit Supplier" description={`Edit ${supplier.name}'s information`} backLink="/suppliers" />

      <div className="mt-8 max-w-xl mx-auto">
        <SupplierFormWrapper initialData={supplier} />
      </div>
    </div>
  );
}
