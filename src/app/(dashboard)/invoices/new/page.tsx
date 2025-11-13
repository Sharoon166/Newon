import { PageHeader } from '@/components/general/page-header';
import { getCustomers } from '@/features/customers/actions';
import { getProducts } from '@/features/inventory/actions';
import { NewInvoiceFormWrapper } from '@/features/invoices/components/new-invoice-form-wrapper';
import { getAllPurchases } from '@/features/purchases/actions';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';


export default async function NewDocument() {
  const [customersData, variantsData, purchasesData, paymentDetails, invoiceTerms] = await Promise.all([
    getCustomers({ limit: 1000 }),
    getProducts(),
    getAllPurchases(),
    getPaymentDetails(),
    getInvoiceTerms()
  ]);

  const customers = customersData.docs;
  const variants = variantsData;
  const purchases = purchasesData;

  return (
    <div className="container mx-auto py-10">
      <PageHeader title="New Document" />
      
      <NewInvoiceFormWrapper
        customers={customers}
        variants={variants}
        purchases={purchases}
        paymentDetails={paymentDetails}
        invoiceTerms={invoiceTerms}
      />
    </div>
  );
}
