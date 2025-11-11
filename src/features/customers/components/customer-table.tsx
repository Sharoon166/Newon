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
  getSortedRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ArrowUpDown, Pencil, Search } from 'lucide-react';
import { Customer } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';

interface CustomerTableProps {
  data: Customer[];
  onEdit?: (id: string) => void;
  actions?: (row: Row<Customer>) => React.ReactNode;
}

export function CustomerTable({ data, onEdit, actions }: CustomerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'customerId',
      header: 'Customer ID',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.customerId || '-'}</div>
      )
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.company && (
            <div className="text-sm text-muted-foreground">{row.original.company}</div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'email',
      header: 'Email'
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-'
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => {
        const { city, state } = row.original;
        if (!city && !state) return '-';
        return `${city || ''}${city && state ? ', ' : ''}${state || ''}`;
      }
    },
    {
      accessorKey: 'outstandingBalance',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Outstanding Balance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const balance = row.original.outstandingBalance ?? 0;
        return (
          <div className={cn('font-medium', balance > 0 ? 'text-red-600' : 'text-green-600')}>
            {formatCurrency(balance)}
          </div>
        );
      }
    },
    {
      accessorKey: 'totalInvoiced',
      header: 'Total Invoiced',
      cell: ({ row }) => `${(row.original.totalInvoiced ?? 0).toFixed(2)}`
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Added',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return formatDate(date);
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex justify-end">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(customer.id)} className="h-8 w-8">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            )}
            {actions && actions(row)}
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between w-full space-x-4">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="Search customers..."
              value={globalFilter ?? ''}
              onChange={event => setGlobalFilter(event.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>
          <Select
            onValueChange={value => {
              // This will be used for filtering by outstanding balance in the future
              // For now, we'll keep it simple
              setGlobalFilter(value === 'all' ? '' : value);
            }}
            defaultValue="all"
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="outstanding">Has Outstanding Balance</SelectItem>
              <SelectItem value="paid">Fully Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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

      <div className="flex items-center space-x-2">
        <TablePagination table={table} itemName="Customer" />
      </div>
    </div>
  );
}
