'use client';

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Invoice, InvoiceStatus } from "@/features/invoices/types";
import { ArrowRight, Download, FileText, Search, ArrowUpDown, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { TablePagination } from "@/components/general/table-pagination";

const statusVariant: Partial<Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'>> = {
  draft: 'outline',
  sent: 'secondary',
  accepted: 'default',
  rejected: 'destructive',
  expired: 'destructive'
};

const statusText: Partial<Record<InvoiceStatus, string>> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired'
};

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.customerName}</div>
        <div className="text-sm text-muted-foreground">{row.original.invoiceNumber}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status] || 'secondary'}>
        {statusText[row.original.status] || row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="p-0 hover:bg-transparent"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(new Date(row.original.date)),
  },
  {
    accessorKey: 'validUntil',
    header: 'Expires',
    cell: ({ row }) => row.original.validUntil ? formatDate(new Date(row.original.validUntil)) : '-',
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.totalAmount)}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: () => (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FileText className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
          <span className="sr-only">Download</span>
        </Button>
      </div>
    ),
  },
];

interface QuotationListProps {
  quotations: Invoice[];
}

export function QuotationList({ quotations }: QuotationListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: quotations,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  });

  if (quotations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No quotations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating a new quotation.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/invoices/new?type=quotation">
              New Quotation <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">
            Recent quotations from your business
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <InputGroup className="w-full sm:w-64">
            <InputGroupInput
              placeholder="Search..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            </div>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination table={table} />
    </div>
  );
}
