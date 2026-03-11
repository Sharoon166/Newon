'use client';

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ServerPagination } from '@/components/general/server-pagination';
import type { Expense, ExpenseCategory, PaginatedExpenses } from '../types';
import Link from 'next/link';

interface ExpenseTableProps {
  expensesData: PaginatedExpenses;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  mode?: 'manual' | 'project' | 'invoice';
}

const categoryLabels: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  labor: 'Labor',
  equipment: 'Equipment',
  transport: 'Transport',
  rent: 'Rent',
  utilities: 'Utilities',
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  'office-supplies': 'Office Supplies',
  'professional-services': 'Professional Services',
  insurance: 'Insurance',
  taxes: 'Taxes',
  salary: 'Salary',
  other: 'Other'
};

export function ExpenseTable({ expensesData, onEdit, onDelete, mode = 'manual' }: ExpenseTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'expenseId',
      header: 'Expense ID',
      cell: ({ row }) => <div className="font-mono text-sm">{row.original.expenseId}</div>
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(new Date(row.original.date))
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.description}</div>
          {row.original.vendor && (
            <div className="text-sm text-muted-foreground">{row.original.vendor}</div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <div className="text-sm">{categoryLabels[row.original.category as ExpenseCategory]}</div>
      )
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const totalAmount = row.original.amount;
        const paidAmount =
          mode === 'invoice' || mode === 'manual'
            ? totalAmount
            : (row.original.transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

        if (mode === 'invoice' || mode === 'manual') {
          return <div className="text-right font-medium">{formatCurrency(totalAmount)}</div>;
        }

        return (
          <div className="space-y-1 text-right">
            <div className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
              {formatCurrency(totalAmount)}
            </div>
            <div className={`font-bold ${isFullyPaid ? 'text-green-600' : 'text-amber-600'}`}>
              {formatCurrency(paidAmount)}
            </div>
          </div>
        );
      }
    },
    ...(mode === 'project'
      ? [
          {
            id: 'status',
            header: 'Status',
            cell: ({ row }: { row: { original: Expense } }) => {
              const totalAmount = row.original.amount;
              const paidAmount = (row.original.transactions || []).reduce(
                (sum, t) => sum + (t.amount || 0),
                0
              );
              if (paidAmount >= totalAmount && totalAmount > 0) {
                return (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                  </Badge>
                );
              }
              if (paidAmount > 0) {
                return (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                    <Clock className="h-3 w-3" />
                    Partial
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              );
            }
          } as ColumnDef<Expense>
        ]
      : []),
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => {
        const expense = row.original;
        if (expense.source === 'invoice' && expense.invoiceNumber) {
          return (
            <Link
              href={`/invoices?search=${expense.invoiceNumber}`}
              className="text-sm text-primary hover:underline block"
            >
              {expense.invoiceNumber}
            </Link>
          );
        }
        if (expense.source === 'project' && expense.projectId) {
          return (
            <Link href={`/projects/${expense.projectId}`} className="text-sm text-primary hover:underline block">
              {expense.projectId}
            </Link>
          );
        }
        return <div className="text-sm text-muted-foreground">{expense.addedByName || '-'}</div>;
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const expense = row.original;
        const isFromInvoiceOrExpense = expense.source === 'invoice' || expense.source === 'project';
        return (
          <div className="flex justify-end gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(expense.expenseId)}
                disabled={isFromInvoiceOrExpense}
                className="h-8 w-8"
                title={isFromInvoiceOrExpense ? 'Cannot edit invoice expense' : 'Edit expense'}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(expense.expenseId)}
                disabled={isFromInvoiceOrExpense}
                className="h-8 w-8 text-red-600 hover:text-red-700"
                title={isFromInvoiceOrExpense ? 'Cannot delete invoice expense' : 'Delete expense'}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: expensesData.docs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ServerPagination
        currentPage={expensesData.page || 1}
        totalPages={expensesData.totalPages}
        totalDocs={expensesData.totalDocs}
        hasNextPage={expensesData.hasNextPage}
        hasPrevPage={expensesData.hasPrevPage}
        pageSize={expensesData.limit}
        itemName="expenses"
      />
    </div>
  );
}