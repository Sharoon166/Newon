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
import { requirePermission } from '@/lib/auth-utils';

interface EditInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Returned by the loader when the invoice does not exist, so the page can call
 * notFound() outside of try/catch and Next serves a real 404 response.
 */
const NOT_FOUND = Symbol('not-found');

/**
 * Loads everything the edit page needs.
 *
 * No JSX may be constructed in here: React does not render JSX while it is
 * being created, so a try/catch around it would never catch render errors
 * (react-hooks/error-boundaries). Only data-loading errors are handled here.
 */
async function loadEditPageData(id: string) {
  try {
    // Fetch the invoice
    const invoice = await getInvoice(id);

    if (!invoice) {
      return NOT_FOUND;
    }

    // Check if editing is allowed
    const editCheck = await canEditInvoice(id);

    if (!editCheck.allowed) {
      // Short-circuit: the form data below is only fetched for editable
      // documents, exactly as before.
      return { invoice, editCheck, extras: null };
    }

    // Fetch all required data — stock is NOT restored here.
    // The selector simulates restoration client-side via originalItems.
    // updateInvoiceFull owns the full restore → re-deduct cycle on save.
    const [customers, variants, purchases, virtualProducts, paymentDetails, invoiceTerms] = await Promise.all([
      getCustomers({ limit: 1000, includeDisabled: false }),
      getProducts(),
      getAllPurchases({ limit: 1_000_000 }), // to get all the purchases
      getVirtualProducts(),
      getPaymentDetails(),
      getInvoiceTerms()
    ]);

    return {
      invoice,
      editCheck,
      extras: { customers, variants, purchases, virtualProducts, paymentDetails, invoiceTerms }
    };
  } catch (error) {
    console.error('Error loading edit page:', error);
    return null;
  }
}

function LoadErrorAlert() {
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

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  // Outside of any try/catch: redirect() throws a control-flow signal that a
  // catch block would otherwise swallow.
  await requirePermission('edit:invoices');

  const { id } = await params;
  const data = await loadEditPageData(id);

  if (data === NOT_FOUND) {
    notFound();
  }

  if (!data) {
    return <LoadErrorAlert />;
  }

  const { invoice, editCheck, extras } = data;

  if (!editCheck.allowed) {
    return (
      <div className="container mx-auto py-10">
        <PageHeader title={`Edit ${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'}`} backLink="/invoices" />
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Edit</AlertTitle>
          <AlertDescription>{editCheck.reason || 'This document cannot be edited.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Unreachable in practice: extras is null only when editing is blocked,
  // which returns above. Kept so the data is always defined below.
  if (!extras) {
    return <LoadErrorAlert />;
  }

  const { customers, variants, purchases, virtualProducts, paymentDetails, invoiceTerms } = extras;

  return (
    <div className="container mx-auto py-10">
      <PageHeader title={`Edit ${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'} ${invoice.invoiceNumber}`} />

      <div className="mt-6">
        <EditInvoiceFormWrapper
          invoice={invoice}
          customers={customers}
          variants={variants}
          purchases={purchases.docs}
          virtualProducts={virtualProducts}
          paymentDetails={paymentDetails}
          invoiceTerms={invoiceTerms}
          requiresStockRestore={editCheck.requiresStockRestore}
          originalItems={invoice.items}
          warning={editCheck.warning}
        />
      </div>
    </div>
  );
}
