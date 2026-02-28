'use client';

import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getSortedRowModel
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Pencil, Search, Filter, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ServerPagination } from '@/components/general/server-pagination';
import type { Expense, ExpenseCategory, PaginatedExpenses } from '../types';

interface ExpenseTableProps {
  expensesData: PaginatedExpenses;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

type CategoryFilter = 'all' | ExpenseCategory;

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
  other: 'Other'
};

export function ExpenseTable({ expensesData, onEdit, onDelete }: ExpenseTableProps) {
  const data = expensesData.docs;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const filteredData =
    categoryFilter === 'all' ? data : data.filter(expense => expense.category === categoryFilter);

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
      cell: ({ row }) => (
        <div className="text-right font-medium text-red-600">
          {formatCurrency(row.original.amount)}
        </div>
      )
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => {
        const expense = row.original;
        if (expense.source === 'invoice' && expense.invoiceNumber) {
          return (
            <div className="space-y-1">
              <a 
                href={`/invoices?search=${expense.invoiceNumber}`}
                className="text-sm text-primary hover:underline block"
              >
                {expense.invoiceNumber}
              </a>
            </div>
          );
        }

        if (expense.source === 'project' && expense.projectId) {
          return (
            <div className="space-y-1">
              {expense.projectId && (
                <a
                  href={`/projects/${expense.projectId}`}
                  className="text-xs text-muted-foreground hover:underline block"
                >
                  Project: {expense.projectId}
                </a>
              )}
            </div>
          );
        }
        return (
          <div className="text-sm text-muted-foreground">
            {expense.addedByName || '-'}
          </div>
        );
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const expense = row.original;
        const isFromInvoiceOrExpense = expense.source === 'invoice' || expense.source === "project";
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
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString'
  });

  return (
    <div className="space-y-4">
      <div className="flex sm:items-center justify-between max-sm:flex-col flex-wrap gap-4">
        <InputGroup className="max-w-sm flex-1">
          <InputGroupInput
            placeholder="Search expenses..."
            value={globalFilter ?? ''}
            onChange={event => setGlobalFilter(event.target.value)}
          />
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
        </InputGroup>

        <Select
          value={categoryFilter}
          onValueChange={(value: CategoryFilter) => setCategoryFilter(value)}
        >
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
