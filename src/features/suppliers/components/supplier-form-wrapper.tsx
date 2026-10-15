'use client';

import { useRouter } from 'next/navigation';
import { SupplierForm } from './supplier-form';
import { Supplier } from '../types';

interface SupplierFormWrapperProps {
  initialData?: Supplier;
}

export function SupplierFormWrapper({ initialData }: SupplierFormWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/suppliers');
    router.refresh();
  };

  return <SupplierForm initialData={initialData} onSuccess={handleSuccess} />;
}
