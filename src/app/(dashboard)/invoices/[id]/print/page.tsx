'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { getInvoice } from '@/features/invoices/actions';
import { Invoice } from '@/features/invoices/types';
import { NewonInvoiceTemplate } from '@/features/invoices/components/newon-invoice-template';
import QuotationTemplate from '@/features/invoices/components/quotation-template';
import { InvoiceTemplateData, QuotationTemplateData } from '@/features/invoices/components/template-types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PrintInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setIsLoading(true);
        const data = await getInvoice(params.id as string);
        setInvoice(data);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        alert('Failed to load document');
        router.push('/invoices');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchInvoice();
    }
  }, [params.id, router]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice?.type === 'invoice' 
      ? `Invoice-${invoice.invoiceNumber}`
      : `Quotation-${invoice?.invoiceNumber}`,
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-muted-foreground">Document not found</p>
          <Button onClick={() => router.push('/invoices')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  // Transform invoice data to template format
  const templateData = invoice.type === 'invoice' ? {
    logo: undefined,
    company: {
      name: 'Newon', // This should come from your brand store
      address: 'Your Address',
      city: 'City',
      state: 'State',
      zip: '12345',
      phone: '+1234567890',
      email: 'info@company.com',
      website: 'www.company.com'
    },
    client: {
      name: invoice.customerName,
      company: invoice.customerCompany,
      address: invoice.customerAddress,
      city: invoice.customerCity || '',
      state: invoice.customerState || '',
      zip: invoice.customerZip || '',
      email: invoice.customerEmail,
      phone: invoice.customerPhone
    },
    invoiceNumber: invoice.invoiceNumber,
    date: typeof invoice.date === 'string' ? invoice.date : invoice.date.toISOString(),
    dueDate: invoice.dueDate ? (typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString()) : '',
    items: invoice.items.map(item => ({
      id: item.productId,
      description: item.productName,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.totalPrice,
      productId: item.productId,
      variantId: item.variantId,
      variantSKU: item.variantSKU,
      purchaseId: item.purchaseId
    })),
    taxRate: invoice.gstValue || 0,
    discount: invoice.discountAmount,
    discountType: invoice.discountType || 'fixed',
    notes: invoice.notes,
    terms: invoice.termsAndConditions,
    paymentDetails: {
      bankName: 'Bank Name',
      accountNumber: '1234567890',
      iban: 'IBAN1234567890'
    },
    previousBalance: 0,
    paid: invoice.paidAmount,
    remainingPayment: invoice.balanceAmount,
    amountInWords: 'Amount in words',
    billingType: invoice.billingType,
    market: invoice.market,
    customerId: invoice.customerId
  } as InvoiceTemplateData : {
    logo: undefined,
    company: {
      name: 'Newon',
      address: 'Your Address',
      city: 'City',
      state: 'State',
      zip: '12345',
      phone: '+1234567890',
      email: 'info@company.com',
      website: 'www.company.com'
    },
    client: {
      name: invoice.customerName,
      company: invoice.customerCompany,
      address: invoice.customerAddress,
      city: invoice.customerCity || '',
      state: invoice.customerState || '',
      zip: invoice.customerZip || '',
      email: invoice.customerEmail,
      phone: invoice.customerPhone
    },
    quotationNumber: invoice.invoiceNumber,
    date: typeof invoice.date === 'string' ? invoice.date : invoice.date.toISOString(),
    validUntil: invoice.validUntil ? (typeof invoice.validUntil === 'string' ? invoice.validUntil : invoice.validUntil.toISOString()) : '',
    items: invoice.items.map(item => ({
      id: item.productId,
      description: item.productName,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.totalPrice,
      productId: item.productId,
      variantId: item.variantId,
      variantSKU: item.variantSKU,
      purchaseId: item.purchaseId
    })),
    taxRate: invoice.gstValue || 0,
    discount: invoice.discountAmount,
    discountType: invoice.discountType || 'fixed',
    notes: invoice.notes,
    terms: invoice.termsAndConditions,
    amountInWords: 'Amount in words',
    billingType: invoice.billingType,
    market: invoice.market,
    customerId: invoice.customerId
  } as QuotationTemplateData;

  return (
    <div className="container mx-auto py-10">
      <div ref={printRef}>
        {invoice.type === 'invoice' ? (
          <NewonInvoiceTemplate
            invoiceData={templateData as InvoiceTemplateData}
            onBack={() => router.push('/invoices')}
            onPrint={handlePrint}
          />
        ) : (
          <QuotationTemplate
            quotationData={templateData as QuotationTemplateData}
            onBack={() => router.push('/invoices')}
            onPrint={handlePrint}
          />
        )}
      </div>
    </div>
  );
}
