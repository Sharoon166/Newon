'use client';

import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Pencil, Search, Filter, Ban } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';

interface CustomerTableProps {
  data: Customer[];
  onEdit?: (id: string) => void;
  actions?: (row: Row<Customer>) => React.ReactNode;
}

type BalanceFilter = 'all' | 'outstanding' | 'no-balance' | 'paid-in-full';

export function CustomerTable({ data, onEdit, actions }: CustomerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });

  // Filter data based on balance filter
  const filteredData = useMemo(() => {
    if (balanceFilter === 'all') return data;

    return data.filter(customer => {
      const balance = customer.outstandingBalance || 0;
      const totalInvoiced = customer.totalInvoiced || 0;

      switch (balanceFilter) {
        case 'outstanding':
          return balance > 0;
        case 'no-balance':
          return totalInvoiced === 0;
        case 'paid-in-full':
          return totalInvoiced > 0 && balance === 0;
        default:
          return true;
      }
    });
  }, [data, balanceFilter]);

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'customerId',
      header: 'Customer ID',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.disabled && <Ban className="h-4 w-4 text-red-500" />}
          <div className="font-mono text-sm">{row.original.customerId || '-'}</div>
        </div>
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
        <div className={row.original.disabled ? 'opacity-50' : ''}>
          <div className="font-medium">{row.original.name}</div>
          {row.original.company && <div className="text-sm text-muted-foreground">{row.original.company}</div>}
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
      accessorKey: 'totalInvoiced',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Total Invoiced
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.totalInvoiced || 0;
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
      }
    },
    {
      accessorKey: 'totalPaid',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Total Paid
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.totalPaid || 0;
        return <div className="text-right font-medium text-green-600">{formatCurrency(amount)}</div>;
      }
    },
    {
      accessorKey: 'outstandingBalance',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Outstanding
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.outstandingBalance || 0;
        const isOverdue = amount > 0;
        return (
          <div className={`text-right font-medium ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
            {formatCurrency(amount)}
          </div>
        );
      }
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
        const allowDeletion = row.original.totalInvoiced === 0 || row.original.totalPaid === 0;
        return row.original.id === 'otc' ? null : (
          <div className="flex justify-end">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(customer.customerId ?? 'otc')}
                className="h-8 w-8"
              >
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
    data: filteredData,
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
      <div className="flex sm:items-center justify-between max-sm:flex-col flex-wrap gap-4">
        <InputGroup className="max-w-sm flex-1">
          <InputGroupInput
            placeholder="Search customers..."
            value={globalFilter ?? ''}
            onChange={event => setGlobalFilter(event.target.value)}
          />
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex items-center gap-2">
          <Select value={balanceFilter} onValueChange={(value: BalanceFilter) => setBalanceFilter(value)}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by balance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="outstanding">Has Outstanding Balance</SelectItem>
              <SelectItem value="paid-in-full">Paid in Full</SelectItem>
              <SelectItem value="no-balance">No Invoices</SelectItem>
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
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && 'selected'}
                  className={row.original.disabled ? 'opacity-60' : ''}
                >
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
