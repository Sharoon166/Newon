'use client';

import { useEffect } from 'react';
import { NewInvoiceFormWrapper } from '@/features/invoices/components/new-invoice-form-wrapper';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { PaymentDetails } from '@/features/settings/types';
import type { ExpenseCategory } from '@/features/expenses/types';
import { toast } from 'sonner';

interface FormData {
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  billingType?: 'retail' | 'wholesale';
  market?: 'newon' | 'waymor';
  customerId?: string;
  client: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  items: Array<{
    id: string;
    productId?: string;
    description: string;
    variantId?: string;
    variantSKU?: string;
    virtualProductId?: string;
    isVirtualProduct?: boolean;
    quantity: number;
    rate: number;
    amount: number;
    purchaseId?: string;
    originalRate?: number;
    saleRate?: number;
    componentBreakdown?: Array<{
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      quantity: number;
      purchaseId: string;
      unitCost: number;
      totalCost: number;
    }>;
    customExpenses?: Array<{
      name: string;
      amount: number;
      actualCost: number;
      clientCost: number;
      category: ExpenseCategory;
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
  }>;
  discountType?: 'percentage' | 'fixed';
  discount: number;
  taxRate: number;
  description?: string;
  notes?: string;
  terms?: string;
  paid?: number;
  profit?: number;
  amountInWords?: string;
}

interface InvoiceFormWithWarningProps {
  customers: Customer[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  virtualProducts: EnhancedVirtualProduct[];
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  initialData: Partial<FormData>;
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
