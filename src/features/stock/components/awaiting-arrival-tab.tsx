'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, PackageCheck, PackagePlus, Search } from 'lucide-react';
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
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { ServerPagination } from '@/components/general/server-pagination';
import { EmptyState } from '@/components/general/empty-state';
import { getAwaitingArrival } from '../actions';
import type { AwaitingArrivalItem, PaginatedStock } from '../types';
import { ReceiveDialog, type ReceiveTarget } from './receive-dialog';
import { toast } from 'sonner';

interface AwaitingArrivalTabProps {
  enabled: boolean;
  /** Pre-fills the search box (deep link from another page). */
  initialSearch?: string;
  onChanged?: () => void;
}

const CENTERED_COLUMNS = ['ordered', 'received', 'pending'];

export function AwaitingArrivalTab({ enabled, initialSearch, onChanged }: AwaitingArrivalTabProps) {
  const [data, setData] = useState<PaginatedStock<AwaitingArrivalItem>>({ docs: [], total: 0, page: 1, limit: 15 });
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [target, setTarget] = useState<ReceiveTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // The deep link (?q=) can arrive after this tab mounted - StockView may only
  // get usable search params a render or two in.
  useEffect(() => {
    if (initialSearch) setSearchInput(initialSearch);
  }, [initialSearch]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAwaitingArrival({ page, limit: 15, search: debouncedSearch || undefined });
      setData(result);
    } catch (error) {
      console.error('Failed to load awaiting arrival:', error);
      toast.error('Failed to load purchases');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const columns = useMemo<ColumnDef<AwaitingArrivalItem>[]>(
    () => [
      {
        accessorKey: 'purchaseId',
        header: 'Purchase',
        cell: ({ row }) =>
          row.original.purchaseId ? (
            <Link
              href={`/purchases?search=${encodeURIComponent(row.original.purchaseId)}`}
              title="Open in purchases"
              className="inline-block rounded-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge variant="secondary" className="font-mono text-xs hover:bg-secondary/80">
                {row.original.purchaseId}
              </Badge>
            </Link>
          ) : (
            <Badge variant="secondary" className="font-mono text-xs">
              N/A
            </Badge>
          )
      },
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
            <div className="text-xs text-muted-foreground font-mono">{row.original.sku}</div>
          </div>
        )
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.supplier || '—'}</span>
      },
      {
        accessorKey: 'ordered',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Ordered
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      {
        accessorKey: 'received',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Received
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.received}</span>
      },
      {
        accessorKey: 'pending',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            To come
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.pending}</span>
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => <span className="sr-only">Receive</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="success"
              size="sm"
              onClick={() => {
                setTarget({
                  id: row.original.id,
                  purchaseId: row.original.purchaseId,
                  productName: row.original.productName,
                  sku: row.original.sku,
                  ordered: row.original.ordered,
                  received: row.original.received,
                  supplier: row.original.supplier
                });
                setDialogOpen(true);
              }}
            >
              <PackagePlus className="mr-1 h-3.5 w-3.5" />
              Receive
            </Button>
          </div>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: data.docs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const showSkeleton = isLoading && !hasLoaded;
  const isRefetching = isLoading && hasLoaded;

  const renderEmpty = () =>
    debouncedSearch ? (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <EmptyState
            icon={Search}
            title={`No purchases match “${debouncedSearch}”`}
            description="Check the purchase number, product name or supplier, or clear the search."
            action={
              <Button variant="outline" size="sm" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            }
          />
        </TableCell>
      </TableRow>
    ) : (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <EmptyState
            icon={PackageCheck}
            title="All purchases have arrived"
            description="Nothing is waiting. New purchases appear here as soon as they are ordered."
          />
        </TableCell>
      </TableRow>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search purchase number, product or supplier..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{data.total}</span> purchase(s) still to receive
        </p>
      </div>

      <div className={`rounded-md border overflow-x-auto ${isRefetching ? 'opacity-60' : ''}`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={CENTERED_COLUMNS.includes(header.column.id) ? 'text-center' : undefined}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
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

      {data.total > 0 && (
        <ServerPagination
          currentPage={page}
          totalPages={totalPages}
          totalDocs={data.total}
          hasNextPage={page < totalPages}
          hasPrevPage={page > 1}
          pageSize={data.limit}
          itemName="purchases"
          onPageChange={setPage}
        />
      )}

      <ReceiveDialog
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
