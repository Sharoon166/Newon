'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, PackageCheck, Search, Truck } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import { ServerPagination } from '@/components/general/server-pagination';
import { EmptyState } from '@/components/general/empty-state';
import { getAwaitingDelivery } from '../actions';
import type { AwaitingDeliveryItem, PaginatedStock } from '../types';
import { DeliverDialog, type DeliverTarget } from './deliver-dialog';
import { toast } from 'sonner';

interface AwaitingDeliveryTabProps {
  enabled: boolean;
  /** Pre-fills the search box (deep link from another page, e.g. an invoice). */
  initialSearch?: string;
  onChanged?: () => void;
}

const CENTERED_COLUMNS = ['delivered', 'totalPending'];

export function AwaitingDeliveryTab({ enabled, initialSearch, onChanged }: AwaitingDeliveryTabProps) {
  const [data, setData] = useState<PaginatedStock<AwaitingDeliveryItem>>({
    docs: [],
    total: 0,
    page: 1,
    limit: 15
  });
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [target, setTarget] = useState<DeliverTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // The deep link (?q=) can arrive after this tab mounted - StockView may only
  // get usable search params a render or two in.
  useEffect(() => {
    if (initialSearch) setSearchInput(initialSearch);
  }, [initialSearch]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAwaitingDelivery({ page, limit: 15, search: debouncedSearch || undefined });
      setData(result);
    } catch (error) {
      console.error('Failed to load awaiting delivery:', error);
      toast.error('Failed to load invoices');
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

  const columns = useMemo<ColumnDef<AwaitingDeliveryItem>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice',
        cell: ({ row }) => (
          <Link
            href={`/invoices/${row.original.id}`}
            title="Open invoice"
            className="inline-block rounded-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Badge variant="secondary" className="font-mono text-xs hover:bg-secondary/80">
              {row.original.invoiceNumber}
            </Badge>
          </Link>
        )
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Customer
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customerName || '—'}</div>
            {row.original.customerCompany && (
              <div className="text-xs text-muted-foreground">{row.original.customerCompany}</div>
            )}
          </div>
        )
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.date)}</span>
        )
      },
      {
        id: 'items',
        header: 'Items to deliver',
        cell: ({ row }) => (
          <ul className="space-y-0.5">
            {row.original.lines.map(line => (
              <li key={line.index} className="text-sm">
                <span className="font-medium">{line.productName}</span>{' '}
                <span className="text-muted-foreground">× {line.pending}</span>
                {line.components && line.components.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5 border-l-2 border-muted pl-2">
                    {line.components
                      .filter(comp => comp.pending > 0)
                      .map(comp => (
                        <li key={`${comp.productId}-${comp.variantId}-${comp.purchaseId ?? ''}`} className="text-xs">
                          <span className="text-muted-foreground">{comp.productName}</span>{' '}
                          <span className="text-muted-foreground">× {comp.pending}</span>
                          {comp.purchaseId && (
                            <Badge variant="outline" className="ml-1 font-mono text-[10px] leading-4">
                              {comp.purchaseId}
                            </Badge>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )
      },
      {
        id: 'delivered',
        accessorFn: row => row.totalDelivered,
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Delivered
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.totalDelivered} / {row.original.totalInvoiced}
          </span>
        )
      },
      {
        accessorKey: 'totalPending',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Pending
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.totalPending}</span>
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => <span className="sr-only">Deliver</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="success"
              size="sm"
              onClick={() => {
                setTarget({
                  id: row.original.id,
                  invoiceNumber: row.original.invoiceNumber,
                  customerName: row.original.customerName,
                  lines: row.original.lines.map(line => ({
                    index: line.index,
                    productName: line.productName,
                    sku: line.sku,
                    unit: line.unit,
                    quantity: line.quantity,
                    delivered: line.delivered,
                    pending: line.pending
                  }))
                });
                setDialogOpen(true);
              }}
            >
              <Truck className="mr-1 h-3.5 w-3.5" />
              Deliver
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
            title={`No invoices match “${debouncedSearch}”`}
            description="Check the invoice number or customer, or clear the search."
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
            title="All deliveries are up to date"
            description="No invoice has items waiting to go out. New invoices appear here automatically."
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
            placeholder="Search invoice number or customer..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{data.total}</span> invoice(s) with items still to deliver
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
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-14" />
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
          itemName="invoices"
          onPageChange={setPage}
        />
      )}

      <DeliverDialog
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
