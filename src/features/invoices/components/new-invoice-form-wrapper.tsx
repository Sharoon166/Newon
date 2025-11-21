'use client';

import { useState } from 'react';
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
  }>;
  discountType?: string;
  discount: number;
  taxRate: number;
  notes?: string;
  terms?: string;
  paid?: number;
}

interface NewInvoiceFormWrapperProps {
  customers: Customer[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
}

export function NewInvoiceFormWrapper({
  customers,
  variants,
  purchases,
  paymentDetails,
  invoiceTerms
}: NewInvoiceFormWrapperProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveInvoice = async (formData: FormData) => {
    const documentData: FormData = {
      ...formData,
      invoiceNumber: formData.invoiceNumber || 'DRAFT'
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

      const createData = {
        type: documentType,
        date: new Date(documentData.date),
        dueDate: isInvoice && documentData.dueDate ? new Date(documentData.dueDate) : undefined,
        validUntil: !isInvoice && documentData.validUntil ? new Date(documentData.validUntil) : undefined,
        billingType: (documentData.billingType || 'retail') as 'retail' | 'wholesale',
        market: (documentData.market || 'newon') as 'newon' | 'waymor',
        customerId,
        customerName: documentData.client.name,
        customerCompany: documentData.client.company || '',
        customerEmail: documentData.client.email || '',
        customerPhone: documentData.client.phone || '',
        customerAddress: documentData.client.address || '',
        customerCity: documentData.client.city || '',
        customerState: documentData.client.state || '',
        customerZip: documentData.client.zip || '',
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
        paidAmount: isInvoice ? documentData.paid || 0 : 0,
        balanceAmount: totalAmount - (isInvoice ? documentData.paid || 0 : 0),
        notes: documentData.notes,
        termsAndConditions: documentData.terms,
        createdBy: 'system-user'
      };

      const result = await createInvoice(createData);
      toast.info(
        `${documentType === 'invoice' ? 'Invoice' : 'Quotation'} created successfully! Number: ${result.invoiceNumber}`
      );
      window.location.href = '/invoices';
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error(`Failed to save ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="invoice" className="w-full" onValueChange={value => setDocumentType(value as DocumentType)}>
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
