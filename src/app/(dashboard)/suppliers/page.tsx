import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getSuppliers, deleteSupplier, toggleSupplierDisabled } from '@/features/suppliers/actions';
import { PageHeader } from '@/components/general/page-header';
import { SupplierTableWrapper } from '@/features/suppliers/components/supplier-table-wrapper';

export default async function SuppliersPage() {
  // Fetch all suppliers (including disabled) on the server
  const suppliers = await getSuppliers({ includeDisabled: true });

  // Server action for deleting a supplier
  const deleteSupplierAction = async (id: string) => {
    'use server';
    try {
      await deleteSupplier(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: 'Cannot delete suppliers with purchase history. Disable it instead.' };
    }
  };

  // Server action for toggling supplier disabled status
  const toggleDisabledAction = async (id: string) => {
    'use server';
    try {
      await toggleSupplierDisabled(id);
      return { success: true };
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      return { success: false, error: 'Failed to toggle supplier status' };
    }
  };

  return (
    <>
      <PageHeader title="Supplier Management" description="Manage your suppliers and track purchases and payments">
        <Button asChild>
          <Link href="/suppliers/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <SupplierTableWrapper
          initialData={suppliers}
          deleteSupplierAction={deleteSupplierAction}
          toggleDisabledAction={toggleDisabledAction}
        />
      </div>
    </>
  );
}
