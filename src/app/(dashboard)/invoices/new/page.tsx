'use client';

import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { NewInvoiceForm } from '@/features/invoices/components/new-invoice-form';
import { NewonInvoiceTemplate } from '@/features/invoices/components/newon-invoice-template';
import { NewQuotationForm } from '@/features/invoices/components/new-quotation-form';
import { PageHeader } from '@/components/general/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuotationTemplate from '@/features/invoices/components/quotation-template';
import { InvoiceTemplateData, QuotationTemplateData } from '@/features/invoices/components/template-types';
import { getCustomers } from '@/features/customers/actions';
import { Customer } from '@/features/customers/types';
import { getProducts } from '@/features/inventory/actions';
import { getAllPurchases } from '@/features/purchases/actions';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';

type ViewMode = 'form' | 'preview';
type DocumentType = 'invoice' | 'quotation';

export default function NewDocument() {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [documentData, setDocumentData] = useState<InvoiceTemplateData | QuotationTemplateData>({} as InvoiceTemplateData);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<EnhancedVariants[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref for the printable component
  const printRef = useRef<HTMLDivElement>(null);

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
        setPurchases(purchasesData as unknown as Purchase[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePreview = (data: Record<string, unknown>) => {
    if (documentType === 'invoice') {
      setDocumentData(data as InvoiceTemplateData);
    } else {
      setDocumentData(data as QuotationTemplateData);
    }
    setViewMode('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Configure react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: documentType === 'invoice' 
      ? `Invoice-${(documentData as InvoiceTemplateData).invoiceNumber || 'draft'}`
      : `Quotation-${(documentData as QuotationTemplateData).quotationNumber || 'draft'}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print\\:hidden {
          display: none !important;
        }
      }
    `
  });

  const handleSave = async () => {
    try {
      // Import and use the create invoice action
      const { createInvoice } = await import('@/features/invoices/actions');
      
      // Calculate subtotal
      const subtotal = documentData.items.reduce((sum: number, item: any) => sum + item.amount, 0);
      
      // Calculate discount amount
      const discountAmount = documentData.discountType === 'percentage' 
        ? (subtotal * documentData.discount) / 100
        : documentData.discount;
      
      // Calculate tax amount
      const taxAmount = (subtotal * documentData.taxRate) / 100;
      
      // Calculate total
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      // Type-safe access to optional properties
      const isInvoice = documentType === 'invoice';
      const invoiceData = documentData as InvoiceTemplateData;
      const quotationData = documentData as QuotationTemplateData;
      
      // Transform the document data to match the database schema
      const createData = {
        type: documentType,
        date: new Date(documentData.date),
        dueDate: isInvoice && invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        validUntil: !isInvoice && quotationData.validUntil ? new Date(quotationData.validUntil) : undefined,
        billingType: (documentData.billingType || 'retail') as 'retail' | 'wholesale',
        market: (documentData.market || 'newon') as 'newon' | 'waymor',
        customerId: documentData.customerId || 'manual-entry',
        customerName: documentData.client.name,
        customerCompany: documentData.client.company,
        customerEmail: documentData.client.email,
        customerPhone: documentData.client.phone,
        customerAddress: documentData.client.address,
        customerCity: documentData.client.city,
        customerState: documentData.client.state,
        customerZip: documentData.client.zip,
        items: documentData.items.map((item: any) => ({
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
        discountType: documentData.discountType,
        discountValue: documentData.discount,
        discountAmount,
        gstType: documentData.taxRate > 0 ? 'percentage' as const : undefined,
        gstValue: documentData.taxRate,
        gstAmount: taxAmount,
        totalAmount,
        status: documentType === 'quotation' ? 'draft' as const : 'pending' as const,
        paidAmount: isInvoice ? (invoiceData.paid || 0) : 0,
        balanceAmount: totalAmount - (isInvoice ? (invoiceData.paid || 0) : 0),
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

  const handleDownload = () => {
    // TODO: Implement download as PDF functionality
    console.log(`Downloading ${documentType} as PDF`);
  };

  return (
    <div className="container mx-auto py-10">
      <PageHeader title={viewMode === 'form' ? `New ${documentType}` : `Preview ${documentType}`} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : viewMode === 'form' ? (
        <Tabs defaultValue="invoice" className="w-full" onValueChange={value => setDocumentType(value as DocumentType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quotation">Quotation</TabsTrigger>
          </TabsList>

          <TabsContent value="invoice">
            <NewInvoiceForm 
              onPreview={handlePreview} 
              customers={customers}
              variants={variants}
              purchases={purchases}
            />
          </TabsContent>

          <TabsContent value="quotation">
            <NewQuotationForm 
              onPreview={handlePreview} 
              customers={customers}
              variants={variants}
              purchases={purchases}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div ref={printRef} className="space-y-6">
          {documentType === 'invoice' ? (
            <NewonInvoiceTemplate
              invoiceData={documentData as InvoiceTemplateData}
              onBack={() => setViewMode('form')}
              onPrint={handlePrint}
              onSave={handleSave}
            />
          ) : (
            <QuotationTemplate
              quotationData={documentData as QuotationTemplateData}
              onBack={() => setViewMode('form')}
              onPrint={handlePrint}
              onSave={handleSave}
            />
          )}
        </div>
      )}
    </div>
  );
}
