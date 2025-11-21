import { notFound } from 'next/navigation';
import { getCustomerLedgerEntries } from '@/features/ledger/actions';
import { getInvoices } from '@/features/invoices/actions';
import { CustomerLedgerDetails } from '@/features/ledger/components/customer-ledger-details';

interface CustomerLedgerPageProps {
  params: Promise<{
    customerId: string;
  }>;
}

export default async function CustomerLedgerPage({ params }: CustomerLedgerPageProps) {
  const { customerId } = await params;

  try {
    // Get ledger entries for the customer
    const ledgerEntries = await getCustomerLedgerEntries(customerId);

    if (ledgerEntries.length === 0) {
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

    return (
      <CustomerLedgerDetails
        customerInfo={customerInfo}
        ledgerEntries={ledgerEntries}
        invoices={invoicesResult.docs}
        summary={{
          totalDebit,
          totalCredit,
          currentBalance
        }}
      />
    );
  } catch (error) {
    console.error('Error loading customer ledger:', error);
    return notFound();
  }
}
