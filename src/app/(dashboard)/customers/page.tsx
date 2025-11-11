import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getCustomers, deleteCustomer } from '@/features/customers/actions';
import { PageHeader } from '@/components/general/page-header';
import { CustomerTableWrapper } from '@/features/customers/components/customer-table-wrapper';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;

  // Fetch customers on the server with pagination
  const customers = await getCustomers({ page, limit });

  // Server action for deleting a customer
  const deleteCustomerAction = async (id: string) => {
    'use server';
    try {
      await deleteCustomer(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error: 'Failed to delete customer' };
    }
  };

  return (
    <>
      <PageHeader title="Customer Management" description="Manage your customers and track their invoices and payments">
        <Button asChild>
          <Link href="/customers/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <CustomerTableWrapper
          initialData={customers}
          deleteCustomerAction={deleteCustomerAction}
        />
      </div>
    </>
  );
}
