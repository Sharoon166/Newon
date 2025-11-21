'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CustomerTable } from './customer-table';
import { CustomerActions } from './customer-actions';
import type { Customer, PaginatedCustomers } from '../types';
import { Row } from '@tanstack/react-table';

export function CustomerTableWrapper({
  initialData,
  deleteCustomerAction
}: {
  initialData: PaginatedCustomers;
  deleteCustomerAction: (id: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData.docs);

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteCustomerAction(id);

      if (result.success) {
        setData(prevData => prevData.filter(customer => customer.id !== id));
        toast.success('Customer deleted successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/customers/${id}/edit`);
  };

  const actions = (row: Row<Customer>) => (
    <CustomerActions id={row.original.id} onDelete={() => handleDelete(row.original.customerId || 'otc')} />
  );

  return <CustomerTable data={data} onEdit={handleEdit} actions={actions} />;
}
