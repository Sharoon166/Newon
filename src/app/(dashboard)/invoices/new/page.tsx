'use client';

import { useEffect, useState } from 'react';
import { NewInvoiceForm } from '@/features/invoices/components/new-invoice-form';
import { InvoiceData, NewonInvoiceTemplate } from '@/features/invoices/components/newon-invoice-template';
import { NewQuotationForm } from '@/features/invoices/components/new-quotation-form';
import { PageHeader } from '@/components/general/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuotationTemplate from '@/features/invoices/components/quotation-template';
import { getCustomers } from '@/features/customers/actions';
import { Customer } from '@/features/customers/types';

type ViewMode = 'form' | 'preview';
type DocumentType = 'invoice' | 'quotation';

export default function NewDocument() {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [documentType, setDocumentType] = useState<DocumentType>('invoice');
  const [documentData, setDocumentData] = useState<InvoiceData>({} as InvoiceData);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const retrieveCustomers = async () => {
      setCustomers(await getCustomers());
    };
    retrieveCustomers();
  }, []);

  const handlePreview = (data: Record<string, unknown>) => {
    setDocumentData(data as InvoiceData);
    setViewMode('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log(`Saving ${documentType}:`, documentData);
    // You can add API call to save the document
  };

  const handleDownload = () => {
    // TODO: Implement download as PDF functionality
    console.log(`Downloading ${documentType} as PDF`);
  };

  return (
    <div className="container mx-auto py-10">
      <PageHeader title={viewMode === 'form' ? `New ${documentType}` : `Preview ${documentType}`} />

      {viewMode === 'form' ? (
        <Tabs defaultValue="invoice" className="w-full" onValueChange={value => setDocumentType(value as DocumentType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quotation">Quotation</TabsTrigger>
          </TabsList>

          <TabsContent value="invoice">
            <NewInvoiceForm onPreview={handlePreview} customers={customers} />
          </TabsContent>

          <TabsContent value="quotation">
            <NewQuotationForm onPreview={handlePreview} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {documentType === 'invoice' ? (
            <NewonInvoiceTemplate
              invoiceData={documentData}
              onBack={() => setViewMode('form')}
              onPrint={handlePrint}
              onSave={handleSave}
            />
          ) : (
            <QuotationTemplate
              quotationData={documentData}
              onBack={() => setViewMode('form')}
              onPrint={handlePrint}
              onDownload={handleDownload}
            />
          )}
        </div>
      )}
    </div>
  );
}
