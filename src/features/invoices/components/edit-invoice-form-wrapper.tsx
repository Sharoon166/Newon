'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NewInvoiceForm } from './new-invoice-form';
import { NewQuotationForm } from './new-quotation-form';
import { updateInvoiceFull } from '../actions';
import type { Invoice } from '../types';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { PaymentDetails } from '@/features/settings/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

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
      category: 'labor' | 'materials' | 'overhead' | 'packaging' | 'shipping' | 'other';
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

interface EditInvoiceFormWrapperProps {
  invoice: Invoice;
  customers: Customer[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  virtualProducts: EnhancedVirtualProduct[];
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  requiresStockRestore: boolean;
  warning?: string;
}

export function EditInvoiceFormWrapper({
  invoice,
  customers,
  variants,
  purchases,
  virtualProducts,
  paymentDetails,
  invoiceTerms,
  requiresStockRestore,
  warning
}: EditInvoiceFormWrapperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Stable empty function for onPreview
  const handlePreview = useCallback(() => {}, []);

  // Transform invoice to form data
  const initialData: Partial<FormData> = {
    invoiceNumber: invoice.invoiceNumber,
    date: typeof invoice.date === 'string' ? invoice.date : invoice.date.toISOString().split('T')[0],
    dueDate: invoice.dueDate
      ? typeof invoice.dueDate === 'string'
        ? invoice.dueDate
        : invoice.dueDate.toISOString().split('T')[0]
      : undefined,
    validUntil: invoice.validUntil
      ? typeof invoice.validUntil === 'string'
        ? invoice.validUntil
        : invoice.validUntil.toISOString().split('T')[0]
      : undefined,
    billingType: invoice.billingType,
    market: invoice.market,
    customerId: invoice.customerId,
    client: {
      name: invoice.customerName,
      company: invoice.customerCompany,
      email: invoice.customerEmail,
      phone: invoice.customerPhone,
      address: invoice.customerAddress,
      city: invoice.customerCity,
      state: invoice.customerState,
      zip: invoice.customerZip
    },
    items: invoice.items.map((item, index) => ({
      id: `${item.variantId || item.productId}-${index}`,
      productId: item.productId,
      description: item.productName,
      variantId: item.variantId,
      variantSKU: item.variantSKU,
      virtualProductId: item.virtualProductId,
      isVirtualProduct: item.isVirtualProduct,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.totalPrice,
      purchaseId: item.purchaseId,
      originalRate: item.originalRate,
      saleRate: item.unitPrice,
      componentBreakdown: item.componentBreakdown,
      customExpenses: item.customExpenses,
      totalComponentCost: item.totalComponentCost,
      totalCustomExpenses: item.totalCustomExpenses
    })),
    discountType: invoice.discountType,
    discount: invoice.discountValue || 0,
    taxRate: invoice.gstValue || 0,
    description: invoice.description,
    notes: invoice.notes,
    terms: invoice.termsAndConditions,
    profit: invoice.profit
  };

  const handleSaveInvoice = useCallback(
    async (formData: FormData) => {
      try {
        setIsLoading(true);
        const subtotal = formData.items.reduce((sum: number, item) => sum + item.amount, 0);

        const discountAmount =
          formData.discountType === 'percentage' ? (subtotal * formData.discount) / 100 : formData.discount;

        const taxAmount = (subtotal * formData.taxRate) / 100;
        const totalAmount = subtotal + taxAmount - discountAmount;

        // Check if invoice has custom items
        const hasCustomItems = formData.items.some(
          item =>
            !item.productId ||
            item.productId === 'manual-entry' ||
            (item.saleRate !== undefined && item.rate !== item.saleRate)
        );

        const updateData = {
          date: new Date(formData.date),
          dueDate: invoice.type === 'invoice' && formData.dueDate ? new Date(formData.dueDate) : undefined,
          validUntil: invoice.type === 'quotation' && formData.validUntil ? new Date(formData.validUntil) : undefined,
          billingType: (formData.billingType || 'retail') as 'retail' | 'wholesale',
          market: (formData.market || 'newon') as 'newon' | 'waymor',
          customerId: formData.customerId || invoice.customerId,
          customerName: formData.client.name,
          customerCompany: formData.client.company || undefined,
          customerEmail: formData.client.email || undefined,
          customerPhone: formData.client.phone || undefined,
          customerAddress: formData.client.address || undefined,
          customerCity: formData.client.city || undefined,
          customerState: formData.client.state || undefined,
          customerZip: formData.client.zip || undefined,
          items: formData.items.map(item => ({
            productId: item.productId || 'manual-entry',
            productName: item.description,
            variantId: item.variantId,
            variantSKU: item.variantSKU,
            ...(item.isVirtualProduct && {
              virtualProductId: item.virtualProductId,
              isVirtualProduct: true,
              componentBreakdown: item.componentBreakdown,
              customExpenses: item.customExpenses,
              totalComponentCost: item.totalComponentCost,
              totalCustomExpenses: item.totalCustomExpenses
            }),
            quantity: item.quantity,
            unit: 'pcs',
            unitPrice: item.rate,
            discountType: undefined,
            discountValue: undefined,
            discountAmount: 0,
            totalPrice: item.amount,
            purchaseId: item.purchaseId,
            originalRate: item.originalRate
          })),
          subtotal,
          discountType: formData.discountType as 'fixed' | 'percentage' | undefined,
          discountValue: formData.discount,
          discountAmount,
          gstType: formData.taxRate > 0 ? ('percentage' as const) : undefined,
          gstValue: formData.taxRate,
          gstAmount: taxAmount,
          totalAmount,
          balanceAmount: totalAmount - invoice.paidAmount,
          description: formData.description,
          notes: formData.notes,
          termsAndConditions: formData.terms,
          amountInWords: formData.amountInWords,
          profit: formData.profit || 0,
          custom: hasCustomItems
        };

        await updateInvoiceFull(invoice.id, updateData);
        toast.success(`${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'} updated successfully!`);
        router.push(`/invoices/${invoice.id}`);
      } catch (error) {
        console.error('Error updating invoice:', error);
        toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [invoice, router]
  );

  return (
    <div className="space-y-4">
      {requiresStockRestore && warning && (
        <Alert className="border-amber-500 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{warning}</AlertDescription>
        </Alert>
      )}

      {invoice.type === 'invoice' ? (
        <NewInvoiceForm
          isLoading={isLoading}
          onPreview={handlePreview}
          onSave={handleSaveInvoice}
          customers={customers}
          variants={variants}
          purchases={purchases}
          virtualProducts={virtualProducts}
          paymentDetails={paymentDetails}
          invoiceTerms={invoiceTerms}
          initialData={initialData}
          isEditMode={true}
        />
      ) : (
        <NewQuotationForm
          isLoading={isLoading}
          onPreview={handlePreview}
          onSave={handleSaveInvoice}
          customers={customers}
          variants={variants}
          purchases={purchases}
          virtualProducts={virtualProducts}
          invoiceTerms={invoiceTerms}
          initialData={initialData}
          isEditMode={true}
        />
      )}
    </div>
  );
}
