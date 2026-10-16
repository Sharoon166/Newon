import { notFound } from 'next/navigation';
import { getCustomerLedgerEntries } from '@/features/ledger/actions';
import { getInvoices } from '@/features/invoices/actions';
import { CustomerLedgerDetails } from '@/features/ledger/components/customer-ledger-details';

interface CustomerLedgerPageProps {
  params: Promise<{
    customerId: string;
  }>;
}

/**
 * Loads the ledger data for a customer.
 *
 * No JSX may be constructed in here: React does not render JSX while it is
 * being created, so a try/catch around it would never catch render errors
 * (react-hooks/error-boundaries). Only data-loading errors are handled here.
 */
async function loadCustomerLedger(customerId: string) {
  try {
    // Get ledger entries for the customer
    const ledgerEntries = await getCustomerLedgerEntries(customerId);

    if (ledgerEntries.length === 0) {
      // Thrown inside the try on purpose: it is caught (and logged) below, and
      // the page turns the null into notFound() — same 404 as before.
      return notFound();
    }

    // Get all invoices for the customer
    const invoicesResult = await getInvoices({
      customerId,
      limit: 1000 // Get all invoices
    });

    const customerInfo = {
      customerId,
      customerName: ledgerEntries[0].customerName,
      customerCompany: ledgerEntries[0].customerCompany,
      customerEmail: '',
      customerPhone: ''
    };

    // Calculate totals
    const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const currentBalance = totalDebit - totalCredit;

    return {
      customerInfo,
      ledgerEntries,
      invoices: invoicesResult.docs,
      summary: {
        totalDebit,
        totalCredit,
        currentBalance
      }
    };
  } catch (error) {
    console.error('Error loading customer ledger:', error);
    return null;
  }
}

export default async function CustomerLedgerPage({ params }: CustomerLedgerPageProps) {
  const { customerId } = await params;

  const data = await loadCustomerLedger(customerId);

  if (!data) {
    return notFound();
  }

  return (
    <CustomerLedgerDetails
      customerInfo={data.customerInfo}
      ledgerEntries={data.ledgerEntries}
      invoices={data.invoices}
      summary={data.summary}
    />
  );
}
