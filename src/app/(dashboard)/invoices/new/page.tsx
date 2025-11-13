'use client';

import { useEffect, useState } from 'react';
import { NewInvoiceForm } from '@/features/invoices/components/new-invoice-form';
import { NewQuotationForm } from '@/features/invoices/components/new-quotation-form';
import { PageHeader } from '@/components/general/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { getAllPurchases } from '@/features/purchases/actions';
import type { Customer } from '@/features/customers/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';

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

export default function NewDocument() {
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<EnhancedVariants[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [customersData, variantsData, purchasesData] = await Promise.all([
          getCustomers({ limit: 1000 }), // Get all customers for dropdown
          getProducts(),
          getAllPurchases()
        ]);
        setCustomers(customersData.docs); // Extract docs array from paginated result
        setVariants(variantsData);
        setPurchases(purchasesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveInvoice = async (formData: FormData) => {
    // Ensure invoiceNumber is set
    const documentData: FormData = {
      ...formData,
      invoiceNumber: formData.invoiceNumber || 'DRAFT'
    };
    try {
      // Import and use the create invoice action
      const { createInvoice } = await import('@/features/invoices/actions');
      
      // Calculate subtotal
      const subtotal = documentData.items.reduce((sum: number, item) => sum + item.amount, 0);
      
      // Calculate discount amount
      const discountAmount = documentData.discountType === 'percentage' 
        ? (subtotal * documentData.discount) / 100
        : documentData.discount;
      
      // Calculate tax amount
      const taxAmount = (subtotal * documentData.taxRate) / 100;
      
      // Calculate total
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      // Access to optional properties
      const isInvoice = documentType === 'invoice';
      
      // Transform the document data to match the database schema
      const createData = {
        type: documentType,
        date: new Date(documentData.date),
        dueDate: isInvoice && documentData.dueDate ? new Date(documentData.dueDate) : undefined,
        validUntil: !isInvoice && documentData.validUntil ? new Date(documentData.validUntil) : undefined,
        billingType: (documentData.billingType || 'retail') as 'retail' | 'wholesale',
        market: (documentData.market || 'newon') as 'newon' | 'waymor',
        customerId: documentData.customerId || 'manual-entry',
        customerName: documentData.client.name,
        customerCompany: documentData.client.company || '',
        customerEmail: documentData.client.email || '',
        customerPhone: documentData.client.phone || '',
        customerAddress: documentData.client.address || '',
        customerCity: documentData.client.city || '',
        customerState: documentData.client.state || '',
        customerZip: documentData.client.zip || '',
        items: documentData.items.map((item) => ({
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
        gstType: documentData.taxRate > 0 ? 'percentage' as const : undefined,
        gstValue: documentData.taxRate,
        gstAmount: taxAmount,
        totalAmount,
        status: documentType === 'quotation' ? 'draft' as const : 'pending' as const,
        paidAmount: isInvoice ? (documentData.paid || 0) : 0,
        balanceAmount: totalAmount - (isInvoice ? (documentData.paid || 0) : 0),
        notes: documentData.notes,
        termsAndConditions: documentData.terms,
        createdBy: 'system-user'
      };

      const result = await createInvoice(createData);
      alert(`${documentType === 'invoice' ? 'Invoice' : 'Quotation'} created successfully! Number: ${result.invoiceNumber}`);
      window.location.href = '/invoices';
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Failed to save ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <PageHeader title={`New ${documentType}`} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="invoice" className="w-full" onValueChange={value => setDocumentType(value as DocumentType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quotation">Quotation</TabsTrigger>
          </TabsList>

          <TabsContent value="invoice">
            <NewInvoiceForm 
              onPreview={() => {}} 
              onSave={handleSaveInvoice}
              customers={customers}
              variants={variants}
              purchases={purchases}
            />
          </TabsContent>

          <TabsContent value="quotation">
            <NewQuotationForm 
              onPreview={() => {}} 
              customers={customers}
              variants={variants}
              purchases={purchases}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
