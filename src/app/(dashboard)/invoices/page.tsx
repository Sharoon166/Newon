import { getInvoices, getInvoiceStats } from '@/features/invoices/actions';
import { InvoicesPageClient } from './invoices-page-client';

interface InvoicesPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

  const [invoicesData, quotationsData, stats] = await Promise.all([
    getInvoices({ type: 'invoice', limit: 1000, dateFrom, dateTo }),
    getInvoices({ type: 'quotation', limit: 1000 }),
    getInvoiceStats({ dateFrom, dateTo })
  ]);

  const invoices = invoicesData.docs;
  const quotations = quotationsData.docs;

  return (
    <InvoicesPageClient
      invoices={invoices}
      quotations={quotations}
      initialStats={stats}
      initialDateFrom={params.dateFrom}
      initialDateTo={params.dateTo}
    />
  );
}
