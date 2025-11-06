'use client';

import { useRouter } from 'next/navigation';
import { CustomerForm } from './customer-form';
import { Customer } from '../types';

interface CustomerFormWrapperProps {
  initialData?: Customer;
}

export function CustomerFormWrapper({ initialData }: CustomerFormWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/customers');
    router.refresh();
  };

  return <CustomerForm initialData={initialData} onSuccess={handleSuccess} />;
}