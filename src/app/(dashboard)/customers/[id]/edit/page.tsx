import { CustomerFormWrapper } from '@/features/customers/components/customer-form-wrapper';
import { PageHeader } from '@/components/general/page-header';
import { getCustomer } from '@/features/customers/actions';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  if (!customer) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-8">
      <PageHeader title="Edit Customer" description={`Edit ${customer.name}'s information`} backLink="/customers" />

      <div className="mt-8 max-w-xl mx-auto">
        <CustomerFormWrapper initialData={customer} />
      </div>
    </div>
  );
}
