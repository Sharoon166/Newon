import { getInvoices, getInvoiceStats } from '@/features/invoices/actions';
import { InvoicesPageClient } from './invoices-page-client';

interface InvoicesPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 10;
  const search = params.search;

  const [invoicesData, quotationsData, stats] = await Promise.all([
    getInvoices({ type: 'invoice', page, limit, dateFrom, dateTo, search }),
    getInvoices({ type: 'quotation', limit: 1000 }),
    getInvoiceStats({ dateFrom, dateTo })
  ]);

  return (
      <InvoicesPageClient
        invoicesData={invoicesData}
        quotations={quotationsData.docs}
        initialStats={stats}
        initialDateFrom={params.dateFrom}
        initialDateTo={params.dateTo}
        activeTab={params.tab}
      />
  );
}
