'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { LedgerEntry } from '../types';
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  Receipt,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Date | string;
  dueDate?: Date | string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  type: string;
}

interface CustomerLedgerDetailsProps {
  customerInfo: {
    customerId: string;
    customerName: string;
    customerCompany?: string;
    customerEmail: string;
    customerPhone: string;
  };
  ledgerEntries: LedgerEntry[];
  invoices: Invoice[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
  };
}

export function CustomerLedgerDetails({ customerInfo, ledgerEntries, invoices, summary }: CustomerLedgerDetailsProps) {
  const router = useRouter();

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'credit_note':
        return 'bg-purple-100 text-purple-800';
      case 'debit_note':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customerInfo.customerName}</h1>
            {customerInfo.customerCompany && <p className="text-muted-foreground">{customerInfo.customerCompany}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/ledger/${customerInfo.customerId}/print`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalDebit)}</div>
            <p className="text-xs text-muted-foreground">All time invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</div>
            <p className="text-xs text-muted-foreground">All time payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.currentBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatCurrency(summary.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">{summary.currentBalance > 0 ? 'Amount due' : 'Fully paid'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(new Date(entry.date))}</TableCell>
                  <TableCell className="font-medium">{entry.transactionNumber}</TableCell>
                  <TableCell>
                    <Badge className={getTransactionTypeColor(entry.transactionType)}>
                      {entry.transactionType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices and Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.type === 'invoice' ? 'default' : 'secondary'} className="capitalize">
                        {invoice.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(new Date(invoice.date))}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {invoice.dueDate ? formatDate(new Date(invoice.dueDate)) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(invoice.paidAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.balanceAmount)}</TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusColor(invoice.status), 'capitalize')}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/invoices/${invoice.id}`}>
                          View <ArrowUpRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
