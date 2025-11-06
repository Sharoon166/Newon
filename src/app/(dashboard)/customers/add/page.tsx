'use client';

import { useRouter } from 'next/navigation';
import { CustomerForm } from '@/features/customers/components/customer-form';
import { PageHeader } from '@/components/general/page-header';

export default function AddCustomerPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/customers');
    router.refresh();
  };

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader
        title="Add Customer"
        description="Add a new customer to your database"
        backLink="/customers"
      />
      
      <div className="mt-8 max-w-xl mx-auto">
        <CustomerForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}