'use client';

import { useRouter } from 'next/navigation';
import { SupplierForm } from '@/features/suppliers/components/supplier-form';
import { PageHeader } from '@/components/general/page-header';

export default function AddSupplierPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/suppliers');
    router.refresh();
  };

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader title="Add Supplier" description="Add a new supplier to your database" backLink="/suppliers" />

      <div className="mt-8 max-w-xl mx-auto">
        <SupplierForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
