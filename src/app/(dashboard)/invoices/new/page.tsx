import { PageHeader } from '@/components/general/page-header';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { NewInvoiceFormWrapper } from '@/features/invoices/components/new-invoice-form-wrapper';
import { getAllPurchases } from '@/features/purchases/actions';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';

interface NewDocumentProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function NewDocument({ searchParams }: NewDocumentProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'quotation' ? 'quotation' : 'invoice';

  const [customersData, variants, purchases, paymentDetails, invoiceTerms] = await Promise.all([
    getCustomers({ limit: 1000, includeDisabled: false }), // Exclude disabled customers from invoice creation
    getProducts(),
    getAllPurchases(),
    getPaymentDetails(),
    getInvoiceTerms()
  ]);

  const customers = customersData.docs;

  return (
    <div className="container mx-auto py-10">
      <PageHeader title="New Invoice or Quotation" />
      
      <NewInvoiceFormWrapper
        customers={customers}
        variants={variants}
        purchases={purchases}
        paymentDetails={paymentDetails}
        invoiceTerms={invoiceTerms}
        initialTab={activeTab}
      />
    </div>
  );
}
