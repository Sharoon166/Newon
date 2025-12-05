'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewInvoiceForm } from './new-invoice-form';
import { NewQuotationForm } from './new-quotation-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createInvoice } from '../actions';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { PaymentDetails } from '@/features/settings/types';
import { toast } from 'sonner';

type DocumentType = 'invoice' | 'quotation';

interface FormData {
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  billingType?: string;
  market?: string;
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
    productId?: string;
    description: string;
    variantId?: string;
    variantSKU?: string;
    quantity: number;
    rate: number;
    amount: number;
    purchaseId?: string;
    originalRate?: number;
    saleRate?: number;
  }>;
  discountType?: string;
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
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  initialTab?: DocumentType;
}

export function NewInvoiceFormWrapper({
  customers,
  variants,
  purchases,
  paymentDetails,
  invoiceTerms,
  initialTab = 'invoice'
}: NewInvoiceFormWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documentType, setDocumentType] = useState<DocumentType>(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDocumentType(initialTab);
  }, [initialTab]);

  const handleSaveInvoice = async (formData: FormData) => {
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
          quantity: item.quantity,
          unit: 'pcs',
          unitPrice: item.rate,
          discountType: undefined,
          discountValue: undefined,
          discountAmount: 0,
          totalPrice: item.amount,
          purchaseId: item.purchaseId
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
        createdBy: 'system-user'
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
  };

  const handleTabChange = (value: string) => {
    const newType = value as DocumentType;
    setDocumentType(newType);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newType);
    router.push(`/invoices/new?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={documentType} className="w-full" onValueChange={handleTabChange}>
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="invoice">Invoice</TabsTrigger>
        <TabsTrigger value="quotation">Quotation</TabsTrigger>
      </TabsList>

      <TabsContent value="invoice">
        <NewInvoiceForm
          isLoading={isLoading}
          onPreview={() => {}}
          onSave={handleSaveInvoice}
          customers={customers}
          variants={variants}
          purchases={purchases}
          paymentDetails={paymentDetails}
          invoiceTerms={invoiceTerms}
        />
      </TabsContent>

      <TabsContent value="quotation">
        <NewQuotationForm
          isLoading={isLoading}
          onPreview={() => {}}
          onSave={handleSaveInvoice}
          customers={customers}
          variants={variants}
          purchases={purchases}
          invoiceTerms={invoiceTerms}
        />
      </TabsContent>
    </Tabs>
  );
}
