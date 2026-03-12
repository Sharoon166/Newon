import { getInvoices, getInvoiceStats } from '@/features/invoices/actions';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Receipt, TrendingUp, TrendingDown, ShoppingCart, Coins, Wallet, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuotationsTable } from '@/features/invoices/components/quotations-table';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTable } from '@/features/invoices/components/invoices-table';
import { InvoiceFilter } from '@/features/invoices/components/invoice-filter';

interface InvoicesPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    market?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 10;
  const search = params.search;
  const status = params.status === 'all' ? undefined : params.status as 'pending' | 'paid' | 'overdue' | 'cancelled' | 'draft' | undefined;
  const market = params.market === 'all' ? undefined : params.market as 'newon' | 'waymor' | undefined;

  const [invoicesData, quotationsData, stats] = await Promise.all([
    getInvoices({ type: 'invoice', page, limit, dateFrom, dateTo, search, status, market }),
    getInvoices({ type: 'quotation', limit: 1000, dateFrom, dateTo, search, status, market }),
    getInvoiceStats({ dateFrom, dateTo })
  ]);

  return (
    <>
      <div className="container mx-auto py-10">
        <PageHeader title="Invoices & Quotations" description="View and manage your invoies and quotations">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Link>
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.dailySales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Today&apos;s revenue</p>
              {stats.dailySalesTrend !== 0 && (
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${stats.dailySalesTrend > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stats.dailySalesTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.dailySalesTrend).toFixed(1)}% vs yesterday</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlySales)}</div>
              <p className="text-xs text-muted-foreground mt-1">This month&apos;s revenue</p>
              {stats.monthlySalesTrend !== 0 && (
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${stats.monthlySalesTrend > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stats.monthlySalesTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.monthlySalesTrend).toFixed(1)}% vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Coins className="h-6 w-6 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">This month&apos;s profit</p>
              {stats.monthlyProfitTrend !== 0 && (
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${stats.monthlyProfitTrend > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stats.monthlyProfitTrend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.monthlyProfitTrend).toFixed(1)}% vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Wallet className="h-6 w-6 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.pendingInvoices} invoices</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-6 w-6 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.cancelledRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.cancelledInvoices} invoices</p>
            </CardContent>
          </Card>
        </div>
        <div className="w-full flex justify-end mb-2">
          <InvoiceFilter />
        </div>

        {/* Tabs for Invoices and Quotations */}
        <Tabs defaultValue={params.tab || 'invoices'} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Invoices ({invoicesData.totalDocs})
            </TabsTrigger>
            <TabsTrigger value="quotations" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quotations ({quotationsData.totalDocs})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <InvoicesTable invoicesData={invoicesData} />
          </TabsContent>

          <TabsContent value="quotations">
            <QuotationsTable quotations={quotationsData.docs} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
