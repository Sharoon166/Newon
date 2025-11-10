'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Search, ExternalLink, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Purchase } from '../types';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { exportToCsv, exportToPdf } from '../utils/export-utils';
import { TablePagination } from '@/components/general/table-pagination';
import { deletePurchase } from '../actions';

// Extend the Purchase type with additional properties from the API
export interface EnhancedPurchase extends Purchase {
  variant?: {
    id: string;
    sku: string;
    attributes?: Record<string, string>;
  };
  productName?: string;
}

export function PurchasesTable({ purchases }: { purchases: EnhancedPurchase[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [searchValue, setSearchValue] = useState('');

  // Get unique suppliers for filter
  const suppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    purchases.forEach(purchase => {
      if (purchase.supplier) supplierSet.add(purchase.supplier);
    });
    return Array.from(supplierSet).sort();
  }, [purchases]);

  // Format variant display
  const getVariantDisplay = (purchase: EnhancedPurchase) => {
    if (!purchase.variant) return purchase.variantId;
    const attrString = purchase.variant.attributes
      ? Object.entries(purchase.variant.attributes)
          .map(([, value]) => value)
          .join(', ')
      : '';
    return attrString ? `${purchase.variant.sku} (${attrString})` : purchase.variant.sku;
  };

  // Define columns
  const columns: ColumnDef<EnhancedPurchase>[] = [
    {
      accessorKey: 'purchaseId',
      header: 'Purchase ID',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
          {row.original.purchaseId || 'N/A'}
        </Badge>
      )
    },
    {
      accessorKey: 'purchaseDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Date
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{formatDate(row.original.purchaseDate)}</div>,
      sortingFn: 'datetime'
    },
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => <div className="font-medium">{row.original.productName || 'Unknown Product'}</div>
    },
    {
      accessorKey: 'variant',
      header: 'Variant',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono whitespace-nowrap">
          {getVariantDisplay(row.original)}
        </Badge>
      )
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <Badge variant="secondary">{row.original.supplier}</Badge>
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => row.original.quantity
    },
    {
      accessorKey: 'remaining',
      header: 'Remaining',
      cell: ({ row }) => (
        <span className={row.original.remaining < row.original.quantity ? 'text-orange-600 font-medium' : ''}>
          {row.original.remaining}
        </span>
      )
    },
    {
      accessorKey: 'unitPrice',
      header: 'Unit Price',
      cell: ({ row }) => formatCurrency(row.original.unitPrice)
    },
    {
      accessorKey: 'totalCost',
      header: 'Total',
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.totalCost)}</div>
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          {/* Remove after test */}
          <Button variant="destructive" onClick={() => row.original._id && deletePurchase(row.original._id)}>
            <Trash2 />
            <div className="sr-only">delete</div>
          </Button>
          {/* -------------------------- */}
          <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/${row.original.productId}/edit`)}>
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Go to Product</span>
          </Button>
        </div>
      )
    }
  ];

  // Initialize the table with search functionality
  const table = useReactTable({
    data: purchases as EnhancedPurchase[],
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter: searchValue
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearchValue,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const searchStr = filterValue.toLowerCase();
      const productName = row.original.productName?.toLowerCase() || '';
      const supplier = row.original.supplier?.toLowerCase() || '';
      const sku = row.original.variant?.sku?.toLowerCase() || '';

      return productName.includes(searchStr) || supplier.includes(searchStr) || sku.includes(searchStr);
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Handle export to CSV
  const handleExportCsv = () => {
    const data = table.getFilteredRowModel().rows.map(row => ({
      'Purchase Date': formatDate(row.original.purchaseDate),
      Product: row.original.productName || 'Unknown',
      Variant: row.original.variant?.sku || row.original.variantId || '',
      Supplier: row.original.supplier || '',
      Quantity: row.original.quantity,
      Remaining: row.original.remaining,
      'Unit Price': formatCurrency(row.original.unitPrice).toString(),
      'Total Cost': formatCurrency(row.original.totalCost).toString(),
    
    }));
    exportToCsv(data, `purchases-${new Date().toISOString().split('T')[0]}`);
  };

  // Handle export to PDF
  const handleExportPdf = () => {
    const data = table.getFilteredRowModel().rows.map(row => ({
      'Purchase Date': formatDate(row.original.purchaseDate),
      Product: row.original.productName || 'Unknown',
      Variant: row.original.variant?.sku || row.original.variantId || '',
      Supplier: row.original.supplier || '',
      Quantity: row.original.quantity,
      Remaining: row.original.remaining,
      'Unit Price': formatCurrency(row.original.unitPrice),
      'Total Cost': formatCurrency(row.original.totalCost)
    }));
    exportToPdf(data, `purchases-${new Date().toISOString().split('T')[0]}`);
  };

  // Use debounced value for filtering
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Update table filter when debounced value changes
  useEffect(() => {
    table.setGlobalFilter(debouncedSearchValue);
  }, [debouncedSearchValue, table]);

  if (purchases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        <p>No purchase records found.</p>
        <p className="text-sm mt-2">Purchase records will appear here once you add products to your inventory.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product, supplier, or SKU..."
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Select
              value={(table.getColumn('supplier')?.getFilterValue() as string) || 'all'}
              onValueChange={value => {
                const column = table.getColumn('supplier');
                if (value === 'all') {
                  column?.setFilterValue(undefined);
                } else {
                  column?.setFilterValue(value);
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="hover:bg-muted/50">
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

      <TablePagination table={table} itemName="Purchases" />
    </div>
  );
}
