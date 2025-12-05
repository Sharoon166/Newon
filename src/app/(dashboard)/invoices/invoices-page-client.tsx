'use client';

import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Receipt, TrendingUp, ShoppingCart, Coins, Wallet, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuotationsTable } from '@/features/invoices/components/quotations-table';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { InvoicesTable } from '@/features/invoices/components/invoices-table';
import type { Invoice } from '@/features/invoices/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface InvoicesPageClientProps {
  invoices: Invoice[];
  quotations: Invoice[];
  initialStats: {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    totalRevenue: number;
    totalOutstanding: number;
    dailySales: number;
    monthlySales: number;
    monthlyProfit: number;
    cancelledInvoices: number;
    cancelledRevenue: number;
  };
  initialDateFrom?: string;
  initialDateTo?: string;
  activeTab?: string;
}

export function InvoicesPageClient({
  invoices,
  quotations,
  initialStats,
  initialDateFrom,
  initialDateTo,
  activeTab
}: InvoicesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState(activeTab === 'quotations' ? 'quotations' : 'invoices');

  useEffect(() => {
    setCurrentTab(activeTab === 'quotations' ? 'quotations' : 'invoices');
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/invoices?${params.toString()}`, { scroll: false });
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(initialStats.dailySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Today&apos;s revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <ShoppingCart className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(initialStats.monthlySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month&apos;s revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Coins className="h-6 w-6 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(initialStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
            <TrendingUp className="h-6 w-6 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(initialStats.monthlyProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month&apos;s profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Wallet className="h-6 w-6 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(initialStats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">{initialStats.pendingInvoices} invoices</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-6 w-6 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(initialStats.cancelledRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{initialStats.cancelledInvoices} invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices and Quotations */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
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
          <InvoicesTable invoices={invoices} initialDateFrom={initialDateFrom} initialDateTo={initialDateTo} />
        </TabsContent>

        <TabsContent value="quotations">
          <QuotationsTable quotations={quotations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
