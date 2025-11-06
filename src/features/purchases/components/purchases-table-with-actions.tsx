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
import { ChevronDown, ChevronUp, Search, ExternalLink, Download, FileSpreadsheet, Trash2, Plus, Edit2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Purchase } from '../types';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { exportToCsv, exportToPdf } from '../utils/export-utils';
import { TablePagination } from '@/components/general/table-pagination';
import { deletePurchase } from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { PurchaseForm } from './purchase-form';
import { toast } from 'sonner';
import type { EnhancedVariants } from '@/features/inventory/types';

// Extend the Purchase type with additional properties from the API
export interface EnhancedPurchase extends Purchase {
  variant?: {
    id: string;
    sku: string;
    attributes?: Record<string, string>;
  };
  productName?: string;
}

interface PurchasesTableWithActionsProps {
  purchases: EnhancedPurchase[];
  products: EnhancedVariants[];
}

export function PurchasesTableWithActions({ purchases: initialPurchases, products }: PurchasesTableWithActionsProps) {
  const router = useRouter();
  const [purchases, setPurchases] = useState<EnhancedPurchase[]>(initialPurchases);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [searchValue, setSearchValue] = useState('');
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<EnhancedPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addPurchaseOpen, setAddPurchaseOpen] = useState(false);
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<EnhancedPurchase | null>(null);

  // Update purchases when initialPurchases changes
  useEffect(() => {
    setPurchases(initialPurchases);
  }, [initialPurchases]);

  // Get unique suppliers for filter
  const suppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    purchases.forEach(purchase => {
      if (purchase.supplier) supplierSet.add(purchase.supplier);
    });
    return Array.from(supplierSet).sort();
  }, [purchases]);

  // Get unique locations from products
  const locations = useMemo(() => {
    const locationSet = new Map<string, { id: string; name: string; address?: string; isActive: boolean }>();
    products.forEach(product => {
      product.locations?.forEach(location => {
        if (location.isActive) {
          locationSet.set(location.id, {
            id: location.id,
            name: location.name,
            address: location.address,
            isActive: location.isActive
          });
        }
      });
    });
    return Array.from(locationSet.values());
  }, [products]);

  // Get unique suppliers from products and purchases
  const allSuppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    products.forEach(product => {
      if (product.supplier) supplierSet.add(product.supplier);
    });
    purchases.forEach(purchase => {
      if (purchase.supplier) supplierSet.add(purchase.supplier);
    });
    return Array.from(supplierSet).sort();
  }, [products, purchases]);

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

  // Handle delete purchase
  const handleDeleteClick = (purchase: EnhancedPurchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;

    try {
      setIsDeleting(true);
      await deletePurchase(purchaseToDelete.id || purchaseToDelete._id!);
      
      // Remove from local state
      setPurchases(prev => prev.filter(p => 
        (p.id || p._id) !== (purchaseToDelete.id || purchaseToDelete._id)
      ));
      
      toast.success('Purchase deleted successfully');
      router.refresh(); // Refresh to update inventory
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  };

  // Handle edit purchase
  const handleEditClick = (purchase: EnhancedPurchase) => {
    setPurchaseToEdit(purchase);
    setEditPurchaseOpen(true);
  };

  // Handle purchase form success
  const handlePurchaseSuccess = () => {
    setAddPurchaseOpen(false);
    setEditPurchaseOpen(false);
    setPurchaseToEdit(null);
    router.refresh(); // Refresh to get updated data
  };

  // Define columns
  const columns: ColumnDef<EnhancedPurchase>[] = [
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
      accessorKey: 'retailPrice',
      header: 'Retail Price',
      cell: ({ row }) => formatCurrency(row.original.retailPrice || 0)
    },
    {
      accessorKey: 'totalCost',
      header: 'Total',
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.totalCost)}</div>
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEditClick(row.original)}
            title="Edit purchase"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDeleteClick(row.original)}
            title="Delete purchase"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push(`/inventory/${row.original.productId}/edit`)}
            title="Go to product"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  // Initialize the table with search functionality
  const table = useReactTable({
    data: purchases,
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
      'Unit Price': String(formatCurrency(row.original.unitPrice || 0)),
      'Retail Price': String(formatCurrency(row.original.retailPrice || 0)),
      'Wholesale Price': String(formatCurrency(row.original.wholesalePrice || 0)),
      'Shipping Cost': String(formatCurrency(row.original.shippingCost || 0)),
      'Total Cost': String(formatCurrency(row.original.totalCost))
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
        <Button 
          onClick={() => setAddPurchaseOpen(true)} 
          className="mt-4"
          disabled={products.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add First Purchase
        </Button>
        {products.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            You need to create products first before adding purchases.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl overflow-x-auto mx-auto">
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
            <Button 
              onClick={() => setAddPurchaseOpen(true)}
              disabled={products.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Purchase
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Purchase?"
        description={`Are you sure you want to delete this purchase? This will remove ${purchaseToDelete?.quantity || 0} units from inventory and cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        onConfirm={handleDeleteConfirm}
        isProcessing={isDeleting}
      />

      {/* Add Purchase Dialog */}
      <PurchaseForm
        productId=""
        variants={products}
        locations={locations}
        suppliers={allSuppliers}
        open={addPurchaseOpen}
        onOpenChange={setAddPurchaseOpen}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Edit Purchase Dialog */}
      {purchaseToEdit && (
        <PurchaseForm
          productId={purchaseToEdit.productId}
          variantId={purchaseToEdit.variantId}
          variants={products.filter(p => p.productId === purchaseToEdit.productId)}
          purchase={purchaseToEdit}
          locations={locations}
          suppliers={allSuppliers}
          open={editPurchaseOpen}
          onOpenChange={setEditPurchaseOpen}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}