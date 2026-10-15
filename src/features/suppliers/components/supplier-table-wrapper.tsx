'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SupplierTable } from './supplier-table';
import { SupplierActions } from './supplier-actions';
import type { Supplier } from '../types';
import { Row } from '@tanstack/react-table';

export function SupplierTableWrapper({
  initialData,
  deleteSupplierAction,
  toggleDisabledAction
}: {
  initialData: Supplier[];
  deleteSupplierAction: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleDisabledAction: (id: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteSupplierAction(id);

      if (result.success) {
        setData(prevData => prevData.filter(supplier => supplier.supplierId !== id));
        toast.success('Supplier deleted successfully');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const handleToggleDisabled = async (id: string) => {
    try {
      const result = await toggleDisabledAction(id);

      if (result.success) {
        setData(prevData =>
          prevData.map(supplier => (supplier.supplierId === id ? { ...supplier, disabled: !supplier.disabled } : supplier))
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      throw error;
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/suppliers/${id}/edit`);
  };

  const actions = (row: Row<Supplier>) => (
    <SupplierActions
      id={row.original.supplierId ?? row.original.id}
      disabled={row.original.disabled}
      onDelete={() => handleDelete(row.original.supplierId ?? row.original.id)}
      onToggleDisabled={() => handleToggleDisabled(row.original.supplierId ?? row.original.id)}
    />
  );

  return <SupplierTable data={data} onEdit={handleEdit} actions={actions} />;
}
