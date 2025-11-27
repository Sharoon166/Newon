'use client';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ImageZoom } from '@/components/ui/shadcn-io/image-zoom';
import { TablePagination } from '@/components/general/table-pagination';

type StaffProduct = {
  productId: string;
  productName: string;
  sku: string;
  categories: string[];
  retailPrice: number;
  availableStock: number;
  image?: string;
  disabled: boolean;
};

// Define simplified columns for staff
const columns: ColumnDef<StaffProduct>[] = [
  {
    accessorKey: 'sku',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          SKU
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
      <div className="flex items-center gap-3">
        {row.original.image && (
          <div className="cursor-pointer hover:opacity-80 transition-opacity">
            <ImageZoom>
              <Avatar className="h-10 w-10 rounded-md">
                <AvatarImage src={row.original.image} alt={row.original.productName} className="object-contain" />
                <AvatarFallback className="text-sm rounded-md">
                  {row.original.productName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </ImageZoom>
          </div>
        )}
        <div className="font-medium">{row.original.sku}</div>
      </div>
    ),
    minSize: 150,
    size: 200
  },
  {
    accessorKey: 'productName',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Name
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
        <div className="truncate">{row.original.productName}</div>
        {row.original.disabled && (
          <Badge variant="destructive" className="text-xs shrink-0">
            Disabled
          </Badge>
        )}
      </div>
    ),
    minSize: 200,
    size: 300
  },
  {
    accessorKey: 'categories',
    header: 'Category',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.categories.length === 0 && (
          <Badge variant="outline" className="text-xs">
            Uncategorized
          </Badge>
        )}
        {row.original.categories.slice(0, 3).map(category => (
          <Badge key={category} variant="outline" className="text-xs">
            {category}
          </Badge>
        ))}
        {row.original.categories.length > 3 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                <Plus className="h-3 w-3 mr-1" />
                {row.original.categories.length - 3}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex flex-col gap-1">
                {row.original.categories.slice(3).map(category => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    ),
    minSize: 150,
    size: 200
  },
  {
    accessorKey: 'retailPrice',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Retail Price
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
      <div className="font-medium whitespace-nowrap">{formatCurrency(row.original.retailPrice || 0)}</div>
    ),
    minSize: 120,
    size: 150
  },
  {
    accessorKey: 'availableStock',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          In Stock
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
      const stock = row.original.availableStock;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={stock <= 0 ? 'destructive' : stock < 10 ? 'secondary' : 'default'}>
            {stock}
          </Badge>
          {stock <= 0 && <span className="text-xs text-muted-foreground">Out of stock</span>}
          {stock > 0 && stock < 10 && <span className="text-xs text-amber-600">Low stock</span>}
        </div>
      );
    },
    minSize: 120,
    size: 150
  }
];

interface StaffProductsTableProps {
  data?: StaffProduct[];
}

export function StaffProductsTable({ data = [] }: StaffProductsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const search = searchTerm.toLowerCase();
    return data.filter(item => {
      return (
        item.productName.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.categories.some(cat => cat.toLowerCase().includes(search))
      );
    });
  }, [data, searchTerm]);

  const table = useReactTable<StaffProduct>({
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
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 py-4">
        <InputGroup>
          <InputGroupInput
            placeholder="Search by name, SKU, or category..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
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
                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {searchTerm ? 'No products found matching your search.' : 'No products available.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} itemName="Products" />
    </div>
  );
}
