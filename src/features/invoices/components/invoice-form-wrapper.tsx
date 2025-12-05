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
  originalRate?: number;
  saleRate: number
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
  profit: number;
  paid?: number;
  description?: string;
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
      // Generate a unique customer ID if not provided
      const customerId = formData.customerId || 
        `manual-${formData.client.email?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 
        formData.client.phone?.replace(/[^0-9]/g, '') || 
        formData.client.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      // Check if invoice has custom items
      // An item is custom if:
      // 1. It has no productId (custom item)
      // 2. It has productId === 'manual-entry' (manually entered)
      // 3. The rate has been modified from the original rate
      const hasCustomItems = formData.items.some(
        item => !item.productId || 
                item.productId === 'manual-entry' || 
                (item.saleRate !== undefined && item.rate !== item.saleRate)
      );
            
      const invoiceData: CreateInvoiceDto = {
        type,
        date: new Date(formData.date),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        billingType: formData.billingType || 'retail',
        market: formData.market || 'newon',
        customerId,
        customerName: formData.client.name,
        customerCompany: formData.client.company || undefined,
        customerEmail: formData.client.email || undefined,
        customerPhone: formData.client.phone || undefined,
        customerAddress: formData.client.address || undefined,
        customerCity: formData.client.city || undefined,
        customerState: formData.client.state || undefined,
        customerZip: formData.client.zip || undefined,
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
        status: type === 'quotation' ? 'draft' : (customerId === 'otc' ? 'paid' : 'pending'),
        paidAmount: formData.paid || 0,
        balanceAmount: (formData.items.reduce((sum, item) => sum + item.amount, 0) 
          + ((formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.taxRate) / 100)
          - (formData.discountType === 'percentage' 
            ? (formData.items.reduce((sum, item) => sum + item.amount, 0) * formData.discount) / 100
            : formData.discount)) - (formData.paid || 0),
        profit: formData.profit || 0,
        description: formData.description,
        notes: formData.notes,
        termsAndConditions: formData.terms,
        custom: hasCustomItems,
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
