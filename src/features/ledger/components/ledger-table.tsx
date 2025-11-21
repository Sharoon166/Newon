'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  MoreHorizontal,
  Eye,
  LucideColumns3Cog,
  Printer
} from 'lucide-react';
import { CustomerLedger } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { exportLedgerToCsv, exportLedgerToPdf, printLedgerEntries } from '../utils/export-utils';

// Define columns
const columns: ColumnDef<CustomerLedger>[] = [
  {
    accessorKey: 'customerName',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Customer
          {isSorted ? (
            isSorted === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{row.original.customerName}</div>
        {row.original.customerCompany && (
          <div className="text-xs text-muted-foreground truncate">{row.original.customerCompany}</div>
        )}
      </div>
    ),
    minSize: 200,
    size: 250
  },
  {
    accessorKey: 'customerEmail',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="truncate">{row.original.customerEmail}</div>
        <div className="text-xs text-muted-foreground">{row.original.customerPhone}</div>
      </div>
    ),
    minSize: 180,
    size: 200
  },
  {
    accessorKey: 'totalDebit',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Total Invoiced
          {isSorted ? (
            isSorted === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium text-right whitespace-nowrap">
        {formatCurrency(row.original.totalDebit)}
      </div>
    ),
    minSize: 120,
    size: 140
  },
  {
    accessorKey: 'totalCredit',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Total Paid
          {isSorted ? (
            isSorted === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium text-right text-green-600 whitespace-nowrap">
        {formatCurrency(row.original.totalCredit)}
      </div>
    ),
    minSize: 120,
    size: 140
  },
  {
    accessorKey: 'currentBalance',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Outstanding
          {isSorted ? (
            isSorted === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const balance = row.original.currentBalance;
      return (
        <div className="text-right">
          <Badge
            variant={balance > 0 ? 'destructive' : balance === 0 ? 'secondary' : 'default'}
            className="font-semibold"
          >
            {formatCurrency(Math.abs(balance))}
          </Badge>
        </div>
      );
    },
    minSize: 120,
    size: 140
  },
  {
    accessorKey: 'lastTransactionDate',
    header: 'Last Transaction',
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(new Date(row.original.lastTransactionDate))}
      </div>
    ),
    minSize: 120,
    size: 140
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem asChild>
              <a href={`/ledger/${row.original.customerId}`}>
                <Eye className="mr-2 h-4 w-4" />
                <span>View Details</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printLedgerEntries(row.original.customerId)}>
              <Printer className="mr-2 h-4 w-4" />
              <span>Print Ledger</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableHiding: false,
    minSize: 50,
    size: 50
  }
];

interface LedgerTableProps {
  data?: CustomerLedger[];
}

export function LedgerTable({ data = [] }: LedgerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'currentBalance', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [balanceFilter, setBalanceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle CSV export
  const handleExportCsv = () => {
    exportLedgerToCsv(filteredData);
  };

  // Handle PDF export
  const handleExportPdf = () => {
    exportLedgerToPdf(filteredData);
  };

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const search = searchTerm.toLowerCase();
    return data.filter(item => {
      // Search filter
      const matchesSearch =
        item.customerName.toLowerCase().includes(search) ||
        item.customerCompany?.toLowerCase().includes(search) ||
        item.customerEmail.toLowerCase().includes(search) ||
        item.customerPhone.toLowerCase().includes(search);

      // Balance filter
      let matchesBalance = true;
      if (balanceFilter === 'with-balance') {
        matchesBalance = item.currentBalance > 0;
      } else if (balanceFilter === 'paid') {
        matchesBalance = item.currentBalance === 0;
      } else if (balanceFilter === 'credit') {
        matchesBalance = item.currentBalance < 0;
      }

      return matchesSearch && matchesBalance;
    });
  }, [data, searchTerm, balanceFilter]);

  const table = useReactTable<CustomerLedger>({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 py-4">
        <InputGroup>
          <InputGroupInput
            placeholder="Search by customer name, email, or phone..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <div className="grid gap-2 grid-cols-2 max-md:*:w-full md:flex">
          <Select value={balanceFilter} onValueChange={setBalanceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Balance Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="with-balance">With Outstanding</SelectItem>
              <SelectItem value="paid">Fully Paid</SelectItem>
              <SelectItem value="credit">Credit Balance</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <LucideColumns3Cog />
                View <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter(column => column.getCanHide())
                .map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/([A-Z])/g, ' $1').trim()}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="contents md:flex justify-end w-full gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {balanceFilter !== 'all' ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              {
                {
                  'with-balance': 'With Outstanding Balance',
                  paid: 'Fully Paid',
                  credit: 'Credit Balance'
                }[balanceFilter]
              }
              <button
                onClick={() => setBalanceFilter('all')}
                className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
              >
                <span className="sr-only">Remove filter</span>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="rounded-md border">
        <Table className="grow">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-2 py-3 text-left text-sm font-medium text-gray-900"
                    >
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
                  className="hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center px-3 py-3 text-sm text-gray-500">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} itemName="Customers" />
    </div>
  );
}
