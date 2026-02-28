import { notFound } from 'next/navigation';
import { getInvoice, canEditInvoice } from '@/features/invoices/actions';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { getAllPurchases } from '@/features/purchases/actions';
import { getVirtualProducts } from '@/features/virtual-products/actions';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';
import { EditInvoiceFormWrapper } from '@/features/invoices/components/edit-invoice-form-wrapper';
import { PageHeader } from '@/components/general/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface EditInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  try {
    const { id } = await params;
    
    // Fetch the invoice
    const invoice = await getInvoice(id);

    if (!invoice) {
      notFound();
    }

    // Check if editing is allowed
    const editCheck = await canEditInvoice(id);

    if (!editCheck.allowed) {
      return (
        <div className="container mx-auto py-10">
          <PageHeader
            title={`Edit ${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'}`}
          />
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Edit</AlertTitle>
            <AlertDescription>{editCheck.reason || 'This document cannot be edited.'}</AlertDescription>
          </Alert>
        </div>
      );
    }

    // Restore stock if needed (so form shows correct available quantities)
    if (editCheck.requiresStockRestore && invoice.stockDeducted) {
      const { restoreInvoiceStock } = await import('@/features/invoices/actions');
      await restoreInvoiceStock(id,true); // Skip revalidation during render
    }

    // Fetch all required data (AFTER stock restoration so we get updated quantities)
    const [customersResult, variants, purchases, virtualProducts, paymentDetails, invoiceTermsData] = await Promise.all([
      getCustomers({ limit: 1000, includeDisabled: false }),
      getProducts(),
      getAllPurchases(),
      getVirtualProducts(),
      getPaymentDetails(),
      getInvoiceTerms()
    ]);

    const customers = customersResult.docs;

    return (
      <div className="container mx-auto py-10">
        <PageHeader
          title={`Edit ${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'} ${invoice.invoiceNumber}`}
        />

        <div className="mt-6">
          <EditInvoiceFormWrapper
            invoice={invoice}
            customers={customers}
            variants={variants}
            purchases={purchases}
            virtualProducts={virtualProducts}
            paymentDetails={paymentDetails}
            invoiceTerms={invoiceTermsData}
            requiresStockRestore={editCheck.requiresStockRestore}
            warning={editCheck.warning}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading edit page:', error);
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load invoice for editing. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }
}
