import { PageHeader } from '@/components/general/page-header';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { NewInvoiceFormWrapper } from '@/features/invoices/components/new-invoice-form-wrapper';
import { getAllPurchases } from '@/features/purchases/actions';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';
import { getVirtualProducts } from '@/features/virtual-products/actions';

interface NewDocumentProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function NewDocument({ searchParams }: NewDocumentProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'quotation' ? 'quotation' : 'invoice';

  const [customers, variants, purchasesData, virtualProducts, paymentDetails, invoiceTerms] = await Promise.all([
    getCustomers({ limit: 1000, includeDisabled: false }),
    getProducts(),
    getAllPurchases(),
    getVirtualProducts(),
    getPaymentDetails(),
    getInvoiceTerms()
  ]);

  const purchases = purchasesData.docs;

  return (
    <div className="container mx-auto py-10">
      <PageHeader title="New Invoice or Quotation" />
      
      <NewInvoiceFormWrapper
        customers={customers}
        variants={variants}
        purchases={purchases}
        virtualProducts={virtualProducts}
        paymentDetails={paymentDetails}
        invoiceTerms={invoiceTerms}
        initialTab={activeTab}
      />
    </div>
  );
}
