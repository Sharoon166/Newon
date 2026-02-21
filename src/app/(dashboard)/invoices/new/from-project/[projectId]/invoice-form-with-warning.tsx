'use client';

import { useEffect } from 'react';
import { NewInvoiceFormWrapper } from '@/features/invoices/components/new-invoice-form-wrapper';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { PaymentDetails } from '@/features/settings/types';
import { toast } from 'sonner';

interface InvoiceFormWithWarningProps {
  customers: Customer[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  virtualProducts: EnhancedVirtualProduct[];
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  initialData: any;
  projectId: string;
  existingInvoicesCount: number;
  existingInvoiceNumbers: string[];
}

export function InvoiceFormWithWarning({
  customers,
  variants,
  purchases,
  virtualProducts,
  paymentDetails,
  invoiceTerms,
  initialData,
  projectId,
  existingInvoicesCount,
  existingInvoiceNumbers
}: InvoiceFormWithWarningProps) {
  // Show warning toast on mount if there are existing invoices
  useEffect(() => {
    if (existingInvoicesCount > 0) {
      const invoiceList = existingInvoiceNumbers.slice(0, 3).join(', ');
      const moreText = existingInvoicesCount > 3 ? ` and ${existingInvoicesCount - 3} more` : '';
      
      toast.warning('Existing Invoices Found', {
        description: `This project already has ${existingInvoicesCount} active invoice${existingInvoicesCount > 1 ? 's' : ''}: ${invoiceList}${moreText}. You can still create a new invoice if needed.`,
        duration: 6000
      });
    }
  }, [existingInvoicesCount, existingInvoiceNumbers]);

  return (
    <NewInvoiceFormWrapper
      customers={customers}
      variants={variants}
      purchases={purchases}
      virtualProducts={virtualProducts}
      paymentDetails={paymentDetails}
      invoiceTerms={invoiceTerms}
      initialTab="invoice"
      initialData={initialData}
      fromProject={true}
      projectId={projectId}
    />
  );
}
