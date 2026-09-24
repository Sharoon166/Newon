'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, History as HistoryIcon, RotateCcw, Search } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { ServerPagination } from '@/components/general/server-pagination';
import { EmptyState } from '@/components/general/empty-state';
import { getStockMovements, reverseMovement } from '../actions';
import type { PaginatedStock, StockMovement, StockMovementKind } from '../types';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HistoryTabProps {
  enabled: boolean;
  userRole?: 'admin' | 'staff';
  onChanged?: () => void;
}

const KIND_LABELS: Record<StockMovementKind | 'all', string> = {
  all: 'All movements',
  receive: 'Received',
  deliver: 'Delivered',
  adjustment: 'Quick counts',
  opening: 'Starting counts',
  reversal: 'Reversals'
};

const KIND_STYLES: Record<StockMovementKind, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive' }> = {
  receive: { label: 'In', variant: 'default' },
  deliver: { label: 'Out', variant: 'secondary' },
  adjustment: { label: 'Adjust', variant: 'outline' },
  opening: { label: 'Start', variant: 'outline' },
  reversal: { label: 'Reversal', variant: 'destructive' }
};

const CENTERED_COLUMNS = ['quantity', 'inShop'];

function MovementBadge({ kind }: { kind: StockMovementKind }) {
  const style = KIND_STYLES[kind];
  return (
    <Badge variant={style.variant} className="whitespace-nowrap">
      {style.label}
    </Badge>
  );
}

export function HistoryTab({ enabled, userRole, onChanged }: HistoryTabProps) {
  const router = useRouter();
  const [data, setData] = useState<PaginatedStock<StockMovement>>({ docs: [], total: 0, page: 1, limit: 15 });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [kind, setKind] = useState<StockMovementKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingReversal, setPendingReversal] = useState<StockMovement | null>(null);
  const [isReversing, setIsReversing] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getStockMovements({ page, limit: 15, search: debouncedSearch || undefined, kind });
      setData(result);
    } catch (error) {
      console.error('Failed to load movements:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [page, debouncedSearch, kind]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kind]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const handleReverse = async () => {
    if (!pendingReversal) return;
    try {
      setIsReversing(true);
      await reverseMovement(pendingReversal.movementId);
      toast.success(`Reversed ${pendingReversal.movementId}`);
      setPendingReversal(null);
      load();
      router.refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reverse movement');
    } finally {
      setIsReversing(false);
    }
  };

  const canReverse = userRole === 'admin';

  const columns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: 'movementId',
        header: 'Slip no',
        cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs">{row.original.movementId}</span>
      },
      {
        accessorKey: 'kind',
        header: 'Type',
        cell: ({ row }) => <MovementBadge kind={row.original.kind} />
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
            <div className="font-mono text-xs text-muted-foreground">{row.original.sku}</div>
            {row.original.reversed && <div className="text-xs text-muted-italic italic">reversed</div>}
          </div>
        )
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.purchaseNumber ?? row.original.invoiceNumber ?? row.original.reversalOf ?? '—'}
          </span>
        )
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Qty
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          if (row.original.kind === 'adjustment') {
            return (
              <span className={row.original.quantity >= 0 ? 'font-semibold text-green-700' : 'font-semibold text-destructive'}>
                {row.original.quantity >= 0 ? '+' : ''}
                {row.original.quantity}
              </span>
            );
          }
          return <span className="font-semibold">{row.original.quantity}</span>;
        }
      },
      {
        accessorKey: 'inShop',
        header: 'In shop',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.inShopBefore} → {row.original.inShopAfter}
          </span>
        )
      },
      {
        accessorKey: 'userName',
        header: 'By',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.userName ?? '—'}</span>
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            When
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleDateString()}{' '}
            <span className="text-xs text-muted-foreground">
              {new Date(row.original.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        )
      },
      ...(canReverse
        ? [
            {
              id: 'actions',
              enableHiding: false,
              header: () => <span className="sr-only">Reverse</span>,
              cell: ({ row }: { row: { original: StockMovement } }) => {
                const movement = row.original;
                const disabled = movement.reversed || movement.kind === 'opening' || movement.kind === 'reversal';
                return (
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={disabled}
                      aria-label={`Reverse movement ${movement.movementId}`}
                      onClick={() => setPendingReversal(movement)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }
            } satisfies ColumnDef<StockMovement>
          ]
        : [])
    ],
    [canReverse]
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

  const renderEmpty = () => {
    if (debouncedSearch) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
            <EmptyState
              icon={Search}
              title={`No movements match “${debouncedSearch}”`}
              description="Try a slip number, product, SKU or person - or clear the search."
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
    if (kind !== 'all') {
      return (
        <TableRow>
          <TableCell colSpan={columns.length}>
          <EmptyState
            icon={HistoryIcon}
            title={`No ${KIND_LABELS[kind].toLowerCase()} yet`}
            description="Nothing of this type has been recorded."
            action={
              <Button variant="outline" size="sm" onClick={() => setKind('all')}>
                Show all movements
              </Button>
            }
          />
          </TableCell>
        </TableRow>
      );
    }
    return (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <EmptyState
            icon={HistoryIcon}
            title="No movements yet"
            description="Starting counts, receipts, deliveries and quick counts will appear here as stock moves."
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search product, slip, invoice..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-8"
            />
          </div>
          <Select value={kind} onValueChange={value => setKind(value as StockMovementKind | 'all')}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/stock/print" target="_blank">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
              aria-hidden
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print slips
          </Link>
        </Button>
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  {canReverse && (
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className={row.original.reversed ? 'opacity-60' : undefined}>
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
          itemName="movements"
          onPageChange={setPage}
        />
      )}

      <ConfirmationDialog
        open={!!pendingReversal}
        onOpenChange={open => {
          if (!open) setPendingReversal(null);
        }}
        icon={<RotateCcw className="h-5 w-5" />}
        title={`Reverse ${pendingReversal?.movementId ?? ''}`}
        description={`This undoes the movement: In shop goes from ${pendingReversal?.inShopAfter} back toward ${pendingReversal?.inShopBefore} and the linked purchase/invoice record is rolled back. This cannot be undone.`}
        confirmText="Reverse"
        variant="destructive"
        isProcessing={isReversing}
        onConfirm={handleReverse}
      />
    </div>
  );
}
