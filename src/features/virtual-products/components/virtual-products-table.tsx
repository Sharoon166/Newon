'use client';

import { useState, useMemo } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { MoreHorizontal, Pencil, Trash2, Search, ChevronDown, ChevronUp, Ban, CheckCircle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { EnhancedVirtualProduct } from '../types';
import { deleteVirtualProduct, toggleVirtualProductDisabled } from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

interface VirtualProductsTableProps {
  data: EnhancedVirtualProduct[];
}

export function VirtualProductsTable({ data }: VirtualProductsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EnhancedVirtualProduct | null>(null);

  const columns: ColumnDef<EnhancedVirtualProduct>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent"
          >
            Product Name
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
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.disabled && (
              <Badge variant="destructive" className="text-xs mt-1">
                Disabled
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <div className="font-mono text-sm">{row.original.sku}</div>
    },
    {
      accessorKey: 'components',
      header: 'Components',
      cell: ({ row }) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {row.original.components.length} <Info className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Components</h4>
              {row.original.components.map((comp, idx) => (
                <div key={idx} className="text-xs border-b pb-2 last:border-0">
                  <div className="font-medium">{comp.productName}</div>
                  <div className="text-muted-foreground">SKU: {comp.sku}</div>
                  <div className="flex justify-between mt-1">
                    <span>Quantity: {comp.quantity}</span>
                    <span>Stock: {comp.availableStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    },
    {
      accessorKey: 'availableQuantity',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent"
          >
            Available
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
        <Badge variant={row.original.availableQuantity > 0 ? 'default' : 'destructive'}>
          {row.original.availableQuantity}
        </Badge>
      )
    },
    {
      accessorKey: 'retailPrice',
      header: 'Retail Price',
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.retailPrice)}</div>
    },
    {
      accessorKey: 'wholesalePrice',
      header: 'Wholesale Price',
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.wholesalePrice)}</div>
    },
    {
      accessorKey: 'categories',
      header: 'Categories',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.categories.length === 0 ? (
            <span className="text-xs text-muted-foreground">No categories</span>
          ) : (
            row.original.categories.slice(0, 2).map(cat => (
              <Badge key={cat} variant="outline" className="text-xs">
                {cat}
              </Badge>
            ))
          )}
          {row.original.categories.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.categories.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/virtual-products/${product.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const result = await toggleVirtualProductDisabled(product.id!);
                      toast.success(result.disabled ? 'Product disabled' : 'Product enabled');
                      router.refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Failed to toggle status');
                    }
                  }}
                >
                  {product.disabled ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Enable
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Disable
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedProduct(product);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return data.filter(
      item =>
        item.name.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.categories.some(cat => cat.toLowerCase().includes(search))
    );
  }, [data, searchTerm]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination
    }
  });

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      await deleteVirtualProduct(selectedProduct.id!);
      toast.success('Virtual product deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete virtual product');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupInput
          placeholder="Search by name, SKU, or category..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

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
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No virtual products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} itemName="Virtual Product" />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Virtual Product"
        description={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
