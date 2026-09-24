'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ScanLine, Search, TriangleAlert } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
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
import { useDebounce } from '@/hooks/use-debounce';
import { getInShopRows } from '../actions';
import type { InShopRow } from '../types';
import { QuickCountDialog, type QuickCountTarget } from './quick-count-dialog';
import { EmptyState } from '@/components/general/empty-state';
import { toast } from 'sonner';

interface InShopTabProps {
  enabled: boolean;
  onChanged?: () => void;
}

export function InShopTab({ enabled, onChanged }: InShopTabProps) {
  const [rows, setRows] = useState<InShopRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [onlyMismatches, setOnlyMismatches] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [target, setTarget] = useState<QuickCountTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInShopRows(debouncedSearch || undefined);
      setRows(data);
    } catch (error) {
      console.error('Failed to load stock snapshot:', error);
      toast.error('Failed to load stock');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

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

  const mismatchCount = useMemo(() => rows.filter(r => r.inShop !== r.available).length, [rows]);

  // Stock-take view: only variants where the shelf disagrees with the system.
  const visibleRows = useMemo(
    () => (onlyMismatches ? rows.filter(r => r.inShop !== r.available) : rows),
    [rows, onlyMismatches]
  );

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
        header: 'SKU',
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
        header: () => <span className="sr-only">Quick count</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                handleQuickCount(row.original);
              }}
            >
              <ScanLine className="mr-1 h-3.5 w-3.5" />
              Count
            </Button>
          </div>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: visibleRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
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
    if (onlyMismatches && rows.length > 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <EmptyState
              icon={ScanLine}
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
          <EmptyState icon={ScanLine} title="No products yet" description="Products and variants appear here once they are added to inventory." />
        </TableCell>
      </TableRow>
    );
  };

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
            variant="outline"
            pressed={onlyMismatches}
            onPressedChange={setOnlyMismatches}
            disabled={rows.length === 0}
            aria-label={`Only show variants whose count differs from the system${mismatchCount ? ` (${mismatchCount})` : ''}`}
          >
            <TriangleAlert className="h-4 w-4" />
            Mismatches only
            {mismatchCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 tabular-nums">
                {mismatchCount}
              </Badge>
            )}
          </Toggle>
        </div>
        <p className="text-sm text-muted-foreground">
          <ScanLine className="mr-1 inline h-4 w-4" />
          <span className="font-medium">
            {visibleRows.length}
            {onlyMismatches ? ` of ${rows.length}` : ''}
          </span>{' '}
          variants
        </p>
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
                    <Skeleton className="ml-auto h-8 w-20" />
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

      <QuickCountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
        onSuccess={() => {
          load();
          onChanged?.();
        }}
      />
    </div>
  );
}
