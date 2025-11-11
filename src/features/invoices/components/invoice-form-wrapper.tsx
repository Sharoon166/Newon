'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice } from '../actions';
import { CreateInvoiceDto } from '../types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FormItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  productId?: string;
  variantId?: string;
  variantSKU?: string;
  purchaseId?: string;
  unit?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  stockLocation?: string;
}

interface ClientInfo {
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface InvoiceFormData {
  date: string;
  dueDate?: string;
  validUntil?: string;
  billingType?: 'wholesale' | 'retail';
  market?: 'newon' | 'waymor';
  customerId?: string;
  client: ClientInfo;
  items: FormItem[];
  taxRate: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  paid?: number;
  notes?: string;
  terms?: string;
}

interface InvoiceFormWrapperProps {
  type: 'invoice' | 'quotation';
  formData: InvoiceFormData;
  userId: string;
}

export function InvoiceFormWrapper({ type, formData, userId }: InvoiceFormWrapperProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Transform form data to match database schema
      const invoiceData: CreateInvoiceDto = {
        type,
        date: new Date(formData.date),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        billingType: formData.billingType || 'retail',
        market: formData.market || 'newon',
        customerId: formData.customerId || 'temp-customer-id',
        customerName: formData.client.name,
        customerCompany: formData.client.company,
        customerEmail: formData.client.email,
        customerPhone: formData.client.phone,
        customerAddress: formData.client.address,
        customerCity: formData.client.city,
        customerState: formData.client.state,
        customerZip: formData.client.zip,
        items: formData.items.map((item) => ({
          productId: item.productId || 'manual-entry',
          productName: item.description,
          variantId: item.variantId,
          variantSKU: item.variantSKU,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          unitPrice: item.rate,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountAmount: item.discountAmount || 0,
          totalPrice: item.amount,
          stockLocation: item.stockLocation,
          purchaseId: item.purchaseId
        })),
        subtotal: formData.items.reduce((sum, item) => sum + item.amount, 0),
        discountType: formData.discountType,
        discountValue: formData.discount,
        discountAmount: formData.discountType === 'percentage' 
          ? (formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.discount) / 100
          : formData.discount,
        gstType: formData.taxRate > 0 ? 'percentage' : undefined,
        gstValue: formData.taxRate,
        gstAmount: (formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.taxRate) / 100,
        totalAmount: formData.items.reduce((sum, item) => sum + item.amount, 0) 
          + ((formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.taxRate) / 100)
          - (formData.discountType === 'percentage' 
            ? (formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.discount) / 100
            : formData.discount),
        status: type === 'quotation' ? 'draft' : 'pending',
        paidAmount: formData.paid || 0,
        balanceAmount: (formData.items.reduce((sum, item) => sum + item.amount, 0) 
          + ((formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.taxRate) / 100)
          - (formData.discountType === 'percentage' 
            ? (formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.discount) / 100
            : formData.discount)) - (formData.paid || 0),
        notes: formData.notes,
        termsAndConditions: formData.terms,
        createdBy: userId
      };

      const result = await createInvoice(invoiceData);
      
      toast.success(`${type === 'invoice' ? 'Invoice' : 'Quotation'} created successfully!`);
      router.push(`/invoices/${result.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
      {isSubmitting ? 'Creating...' : `Create ${type === 'invoice' ? 'Invoice' : 'Quotation'}`}
    </Button>
  );
}
