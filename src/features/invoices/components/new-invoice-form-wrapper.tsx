'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewInvoiceForm } from './new-invoice-form';
import { NewQuotationForm } from './new-quotation-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createInvoice } from '../actions';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { PaymentDetails } from '@/features/settings/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import { toast } from 'sonner';

type DocumentType = 'invoice' | 'quotation';

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
      category: string;
      description?: string;
      expenseId?: string;
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

interface NewInvoiceFormWrapperProps {
  customers: Customer[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  virtualProducts: EnhancedVirtualProduct[];
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  initialTab?: DocumentType;
  initialData?: Partial<FormData>;
  fromProject?: boolean;
  projectId?: string;
}

export function NewInvoiceFormWrapper({
  customers,
  variants,
  purchases,
  virtualProducts,
  paymentDetails,
  invoiceTerms,
  initialTab = 'invoice',
  initialData,
  fromProject = false,
  projectId
}: NewInvoiceFormWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documentType, setDocumentType] = useState<DocumentType>(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDocumentType(initialTab);
  }, [initialTab]);

  // Stable empty function for onPreview
  const handlePreview = useCallback(() => {}, []);

  const handleSaveInvoice = useCallback(async (formData: FormData) => {
    // Note: invoiceNumber is not included in documentData - it will be auto-generated to avoid race conditions
    const documentData: FormData = {
      ...formData
    };

    try {
      setIsLoading(true);
      const subtotal = documentData.items.reduce((sum: number, item) => sum + item.amount, 0);

      const discountAmount =
        documentData.discountType === 'percentage' ? (subtotal * documentData.discount) / 100 : documentData.discount;

      const taxAmount = (subtotal * documentData.taxRate) / 100;
      const totalAmount = subtotal + taxAmount - discountAmount;
      const isInvoice = documentType === 'invoice';

      // Generate a unique customer ID if not provided
      const customerId =
        documentData.customerId ||
        `manual-${
          documentData.client.email?.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
          documentData.client.phone?.replace(/[^0-9]/g, '') ||
          documentData.client.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        }`;

      // Create payments array if paid amount is provided
      const paidAmount = isInvoice ? documentData.paid || 0 : 0;
      const payments = paidAmount > 0 ? [{
        amount: paidAmount,
        method: 'cash' as const,
        date: new Date(documentData.date),
        reference: 'Initial payment',
        notes: 'Payment recorded during invoice creation'
      }] : [];

      // Check if invoice has custom items
      // An item is custom if:
      // 1. It has no productId (custom item)
      // 2. It has productId === 'manual-entry' (manually entered)
      // 3. The rate has been modified from the original rate
      const hasCustomItems = documentData.items.some(
        item => !item.productId || 
                item.productId === 'manual-entry' || 
                (item.saleRate !== undefined && item.rate !== item.saleRate)
      );

      const createData = {
        type: documentType,
        date: new Date(documentData.date),
        dueDate: isInvoice && documentData.dueDate ? new Date(documentData.dueDate) : undefined,
        validUntil: !isInvoice && documentData.validUntil ? new Date(documentData.validUntil) : undefined,
        billingType: (documentData.billingType || 'retail') as 'retail' | 'wholesale',
        market: (documentData.market || 'newon') as 'newon' | 'waymor',
        customerId,
        customerName: documentData.client.name,
        customerCompany: documentData.client.company || undefined,
        customerEmail: documentData.client.email || undefined,
        customerPhone: documentData.client.phone || undefined,
        customerAddress: documentData.client.address || undefined,
        customerCity: documentData.client.city || undefined,
        customerState: documentData.client.state || undefined,
        customerZip: documentData.client.zip || undefined,
        items: documentData.items.map(item => ({
          productId: item.productId || 'manual-entry',
          productName: item.description,
          variantId: item.variantId,
          variantSKU: item.variantSKU,
          ...(item.isVirtualProduct && {
            virtualProductId: item.virtualProductId,
            isVirtualProduct: true,
            componentBreakdown: item.componentBreakdown,
            totalComponentCost: item.totalComponentCost,
            totalCustomExpenses: item.totalCustomExpenses
          }),
          ...(item.customExpenses && item.customExpenses.length > 0 && {
            customExpenses: item.customExpenses.map(expense => ({
              name: expense.name,
              amount: expense.clientCost,
              actualCost: expense.actualCost,
              clientCost: expense.clientCost,
              category: expense.category,
              description: expense.description
            })),
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
        discountType: documentData.discountType as 'fixed' | 'percentage' | undefined,
        discountValue: documentData.discount,
        discountAmount,
        gstType: documentData.taxRate > 0 ? ('percentage' as const) : undefined,
        gstValue: documentData.taxRate,
        gstAmount: taxAmount,
        totalAmount,
        status: documentType === 'quotation' ? ('draft' as const) : ('pending' as const),
        paidAmount,
        balanceAmount: totalAmount - paidAmount,
        payments,
        description: documentData.description,
        notes: documentData.notes,
        termsAndConditions: documentData.terms,
        amountInWords: documentData.amountInWords,
        profit: documentData.profit || 0,
        custom: hasCustomItems,
        createdBy: 'system-user',
        // Project-specific fields
        ...(fromProject && {
          stockDeducted: false,
          projectId: projectId
        })
      };

      const result = await createInvoice(createData);
      toast.info(
        `${documentType === 'invoice' ? 'Invoice' : 'Quotation'} created successfully! Number: ${result.invoiceNumber}`
      );
      
      // Route to the correct tab based on document type
      const targetUrl = documentType === 'quotation' ? '/invoices?tab=quotations' : '/invoices';
      router.push(targetUrl);
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(`Failed to save ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [documentType, router, fromProject, projectId]);

  const handleTabChange = useCallback((value: string) => {
    const newType = value as DocumentType;
    setDocumentType(newType);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newType);
    router.push(`/invoices/new?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <Tabs value={documentType} className="w-full" onValueChange={handleTabChange}>
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="invoice">Invoice</TabsTrigger>
        <TabsTrigger value="quotation">Quotation</TabsTrigger>
      </TabsList>

      <TabsContent value="invoice">
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
          fromProject={fromProject}
          projectId={projectId}
        />
      </TabsContent>

      <TabsContent value="quotation">
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
          fromProject={fromProject}
          projectId={projectId}
        />
      </TabsContent>
    </Tabs>
  );
}
