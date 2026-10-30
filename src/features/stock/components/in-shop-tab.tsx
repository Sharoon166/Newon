'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, FileDown, MoreHorizontal, PackagePlus, PackageSearch, Search, Tally5Icon, TriangleAlert } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/use-debounce';
import { ServerPagination } from '@/components/general/server-pagination';
import { getInShopRows, downloadStockSummary } from '../actions';
import type { InShopRow, PaginatedStock } from '../types';
import { QuickCountDialog, type QuickCountTarget } from './quick-count-dialog';
import { StockSummarySheet } from './stock-summary-sheet';
import { EmptyState } from '@/components/general/empty-state';
import { getProductsBasic } from '@/features/inventory/actions';
import type { EnhancedVariants, ProductLocation } from '@/features/inventory/types';
import { ensureAdjustmentSupplier } from '@/features/suppliers/actions';
import { PurchaseForm } from '@/features/purchases/components/purchase-form';
import { toast } from 'sonner';

interface InShopTabProps {
  enabled: boolean;
  userRole?: 'admin' | 'staff';
  onChanged?: () => void;
}

type InShopPage = PaginatedStock<InShopRow> & { mismatchCount: number };

const EMPTY_DATA: InShopPage = {
  docs: [],
  totalDocs: 0,
  limit: 15,
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  mismatchCount: 0
};

export function InShopTab({ enabled, userRole, onChanged }: InShopTabProps) {
  const router = useRouter();
  const [data, setData] = useState<InShopPage>(EMPTY_DATA);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [onlyMismatches, setOnlyMismatches] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [target, setTarget] = useState<QuickCountTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [downloadRows, setDownloadRows] = useState<InShopRow[]>([]);
  const [totalDownloadRows, setTotalDownloadRows] = useState(0);

  // "Add to in-shop" (adjustment purchase against the Adjustment supplier).
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [isPreparingAdjustment, setIsPreparingAdjustment] = useState(false);
  const [adjustmentContext, setAdjustmentContext] = useState<{
    supplier: { supplierId: string; name: string };
    variant: EnhancedVariants;
    locations: ProductLocation[];
  } | null>(null);
  // getProductsBasic is heavy-ish - fetch it once per page load.
  const productsRef = useRef<EnhancedVariants[] | null>(null);

  // Fetch all stock for download (no pagination).
  const handleDownloadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const sort = sorting[0];
      const allDocs = await downloadStockSummary({
        search: debouncedSearch || undefined,
        onlyMismatches,
        sortBy: sort?.id,
        sortDir: sort?.desc ? 'desc' : 'asc'
      });
      setDownloadRows(allDocs);
      setTotalDownloadRows(allDocs.length);
      setSummaryOpen(true);
    } catch (error) {
      console.error('Failed to download stock summary:', error);
      toast.error('Failed to download stock summary');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, onlyMismatches, sorting]);

  // Derive server-side sort params from the TanStack sorting state.
  const sort = sorting[0];
  const sortBy = sort?.id;
  const sortDir = sort?.desc ? 'desc' : 'asc';

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getInShopRows({
        page,
        limit,
        search: debouncedSearch || undefined,
        onlyMismatches,
        sortBy,
        sortDir
      });
      setData(result);
      if (page > result.totalPages) setPage(result.totalPages);
    } catch (error) {
      console.error('Failed to load stock snapshot:', error);
      toast.error('Failed to load stock');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [page, limit, debouncedSearch, onlyMismatches, sortBy, sortDir]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Reset to first page on search or filter change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, onlyMismatches, sortBy, sortDir]);

  const handleQuickCount = (row: InShopRow) => {
    setTarget({
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName,
      sku: row.sku,
      currentInShop: row.inShop,
      available: row.available
    });
    setDialogOpen(true);
  };

  // Opens the purchase dialog in adjustment mode: supplier locked to the
  // shared "Adjustment" record (created on demand), stock added straight to
  // In shop, purchase settled in full by the server.
  const handleAddToInShop = async (row: InShopRow) => {
    try {
      setIsPreparingAdjustment(true);
      const [supplier, products] = await Promise.all([
        ensureAdjustmentSupplier(),
        productsRef.current ? Promise.resolve(productsRef.current) : getProductsBasic()
      ]);
      productsRef.current = products;

      const variant = products.find(p => p.productId === row.productId && p.id === row.variantId);
      if (!variant) {
        toast.error('This variant could not be loaded. Refresh the page and try again.');
        return;
      }

      setAdjustmentContext({
        supplier,
        variant,
        locations: (variant.locations ?? []).filter(location => location.isActive)
      });
      setAdjustmentOpen(true);
    } catch (error) {
      console.error('Error preparing the adjustment:', error);
      toast.error('Could not open the adjustment form.');
    } finally {
      setIsPreparingAdjustment(false);
    }
  };

  const columns = useMemo<ColumnDef<InShopRow>[]>(
    () => [
      {
        accessorKey: 'productName',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Product
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.productName}</div>
            {Object.keys(row.original.attributes ?? {}).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {Object.values(row.original.attributes).join(' / ')}
              </div>
            )}
          </div>
        )
      },
      {
        accessorKey: 'sku',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            SKU
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono whitespace-nowrap">
            {row.original.sku}
          </Badge>
        )
      },
      {
        accessorKey: 'available',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Available
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-center font-medium">{row.original.available}</div>
      },
      {
        accessorKey: 'inShop',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            In shop
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const diff = row.original.inShop - row.original.available;
          return (
            <div className="text-center">
              <span
                className={
                  diff > 0
                    ? 'font-semibold text-green-700'
                    : diff < 0
                      ? 'font-semibold text-amber-600'
                      : 'font-medium'
                }
              >
                {row.original.inShop}
              </span>
              {diff !== 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({diff > 0 ? '+' : ''}
                  {diff})
                </span>
              )}
            </div>
          );
        }
      },
      {
        accessorKey: 'toArrive',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            To arrive
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            {row.original.toArrive > 0 ? (
              <span className="font-medium text-primary">{row.original.toArrive}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          // "View purchases" stays a one-click button; the remaining actions
          // live behind the ellipsis. stopPropagation keeps both the trigger
          // and the menu items from firing the row's quick-count click (they
          // render in a portal but bubble through the React tree).
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="link"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                // Exact SKU filter on the purchases page (not the fuzzy search).
                router.push(`/purchases?sku=${encodeURIComponent(row.original.sku)}&page=1`);
              }}
              title="View purchases of this variant"
            >
              <PackageSearch className="mr-1 h-3.5 w-3.5" />
              View purchases
            </Button>
            {userRole === 'admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="More actions"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {/* <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation();
                      handleQuickCount(row.original);
                    }}
                  >
                    <Tally5Icon className="mr-2 h-4 w-4" />
                    Count
                  </DropdownMenuItem> */}
                  <DropdownMenuItem
                    disabled={row.original.disabled || isPreparingAdjustment}
                    onClick={e => {
                      e.stopPropagation();
                      void handleAddToInShop(row.original);
                    }}
                  >
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Make Adjustments
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      }
    ],
    // Handlers only call stable setters / refs, so they don't need to be
    // dependencies - except the preparing flag, which disables the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPreparingAdjustment, userRole]
  );

  const table = useReactTable({
    data: data.docs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel()
  });

  const showSkeleton = isLoading && !hasLoaded;
  const isSearching = isLoading && hasLoaded;

  const renderEmpty = () => {
    if (debouncedSearch) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <EmptyState
              icon={Search}
              title={`No products match “${debouncedSearch}”`}
              description="Check the spelling, or clear the search to see every variant."
              action={
                <Button variant="outline" size="sm" onClick={() => setSearchInput('')}>
                  Clear search
                </Button>
              }
            />
          </TableCell>
        </TableRow>
      );
    }
    if (onlyMismatches) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <EmptyState
              icon={Tally5Icon}
              title="Everything matches"
              description="All in-shop counts agree with the system. Turn off the filter to see every variant."
            />
          </TableCell>
        </TableRow>
      );
    }
    return (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <EmptyState icon={Tally5Icon} title="No products yet" description="Products and variants appear here once they are added to inventory." />
        </TableCell>
      </TableRow>
    );
  };

  const summaryFilterNote = [
    debouncedSearch ? `search “${debouncedSearch}”` : null,
    onlyMismatches ? 'mismatches only' : null
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search product or SKU..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-8"
            />
          </div>
          <Toggle
            pressed={onlyMismatches}
            onPressedChange={setOnlyMismatches}
            disabled={data.totalDocs === 0 && !onlyMismatches}
            aria-label={`Only show variants whose count differs from the system${data.mismatchCount ? ` (${data.mismatchCount})` : ''}`}
            className="cursor-pointer"
          >
            <TriangleAlert className="h-4 w-4" />
            Mismatches only
            {data.mismatchCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 tabular-nums">
                {data.mismatchCount}
              </Badge>
            )}
          </Toggle>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <Tally5Icon className="mr-1 inline h-4 w-4" />
            <span className="font-medium">{data.totalDocs}</span>{' '}
            variants
          </p>
          {userRole === 'admin' && (
            <Button
              size="sm"
              onClick={handleDownloadSummary}
              disabled={data.totalDocs === 0}
              title="Download a compact stock summary"
            >
              <FileDown className="mr-1.5 h-4 w-4" />
              Download summary
            </Button>
          )}
        </div>
      </div>

      <div className={`rounded-md border overflow-x-auto ${isSearching ? 'opacity-60' : ''}`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const centered = ['available', 'inShop', 'toArrive'].includes(header.column.id);
                  return (
                    <TableHead key={header.id} className={centered ? 'text-center' : undefined}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-8 w-36" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer hover:bg-muted/50 ${row.original.disabled ? 'opacity-60' : ''}`}
                  onClick={() => handleQuickCount(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              renderEmpty()
            )}
          </TableBody>
        </Table>
      </div>

      {data.totalDocs > 0 && (
        <ServerPagination
          currentPage={data.page}
          totalPages={data.totalPages}
          totalDocs={data.totalDocs}
          hasNextPage={data.hasNextPage}
          hasPrevPage={data.hasPrevPage}
          pageSize={limit}
          itemName="variants"
          pageSizeOptions={[15, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={newLimit => {
            setPage(1);
            setLimit(newLimit);
          }}
        />
      )}

      <StockSummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        rows={downloadRows}
        totalRows={totalDownloadRows}
        filterNote={summaryFilterNote || undefined}
      />

      <QuickCountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
        onSuccess={() => {
          load();
          onChanged?.();
        }}
      />

      {adjustmentContext && (
        <PurchaseForm
          productId={adjustmentContext.variant.productId}
          variantId={adjustmentContext.variant.id}
          variants={[adjustmentContext.variant]}
          locations={adjustmentContext.locations}
          origin={adjustmentContext.variant.origin}
          lockSupplier={adjustmentContext.supplier}
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          onSuccess={() => {
            setAdjustmentOpen(false);
            setAdjustmentContext(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
