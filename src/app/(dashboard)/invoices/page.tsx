import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Receipt } from 'lucide-react';
import Link from 'next/link';
import { getInvoices, getInvoiceStats } from '@/features/invoices/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuotationsTable } from '@/features/invoices/components/quotations-table';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTable } from '@/features/invoices/components/invoices-table';

export default async function InvoicesPage() {
  const [invoicesData, quotationsData, stats] = await Promise.all([
    getInvoices({ type: 'invoice', limit: 100 }),
    getInvoices({ type: 'quotation', limit: 100 }),
    getInvoiceStats()
  ]);

  const invoices = invoicesData.docs;
  const quotations = quotationsData.docs;

  return (
    <div className="container mx-auto py-10">
      <PageHeader title="Invoices & Quotations">
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{stats.totalInvoices}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{stats.paidInvoices}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{stats.pendingInvoices}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{formatCurrency(stats.totalRevenue)}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{formatCurrency(stats.totalOutstanding)}</CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices and Quotations */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quotations ({quotations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesTable invoices={invoices} />
        </TabsContent>

        <TabsContent value="quotations">
          <QuotationsTable quotations={quotations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
