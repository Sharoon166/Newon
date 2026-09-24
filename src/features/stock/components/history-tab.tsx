'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, FileDown, History as HistoryIcon, Printer, Search, Undo2 } from 'lucide-react';
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
import { DeliveryChallanDialog } from './delivery-challan-dialog';
import type { PaginatedStock, StockMovement, StockMovementKind } from '../types';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HistoryTabProps {
  enabled: boolean;
  userRole?: 'admin' | 'staff';
  /** Pre-fills the search box (deep link from another page, e.g. an invoice). */
  initialSearch?: string;
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

const KIND_STYLES: Record<
  StockMovementKind,
  { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive' }
> = {
  receive: { label: 'Received', variant: 'default' },
  deliver: { label: 'Delivered', variant: 'secondary' },
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

/**
 * Expanded accordion body for a movement: every product that took part in the
 * operation (a delivery can span several invoice lines / component parts).
 */
function MovementLinesDetail({ movement }: { movement: StockMovement }) {
  const lines = movement.lines ?? [];
  const units = lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  return (
    <div id={`movement-lines-${movement.id}`} className="space-y-2 px-1 py-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {lines.length} {lines.length === 1 ? 'product' : 'products'} on this slip
        </span>
        <span className="text-xs text-muted-foreground">{formatQty(units)} unit(s) in total</span>
      </div>
      <ul className="divide-y rounded-md border bg-background">
        {lines.map((line, i) => (
          <li key={`${movement.id}-line-${i}`} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{line.productName}</div>
              <div className="font-mono text-xs text-muted-foreground">{line.sku || '—'}</div>
              {line.components?.length ? (
                <div className="text-xs text-muted-foreground">
                  = {line.components.map(c => `${c.quantity} × ${c.productName}`).join(', ')}
                </div>
              ) : null}
            </div>
            <span className="whitespace-nowrap font-semibold">{line.quantity}</span>
          </li>
        ))}
      </ul>
      {movement.note ? <p className="text-xs text-muted-foreground">Note: {movement.note}</p> : null}
    </div>
  );
}

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

export function HistoryTab({ enabled, userRole, initialSearch, onChanged }: HistoryTabProps) {
  const router = useRouter();
  const [data, setData] = useState<PaginatedStock<StockMovement>>({ docs: [], total: 0, page: 1, limit: 15 });
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [kind, setKind] = useState<StockMovementKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingReversal, setPendingReversal] = useState<StockMovement | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  // Movement whose delivery challan is open in the preview sheet.
  const [challanMovement, setChallanMovement] = useState<StockMovement | null>(null);
  // Movements whose product breakdown (multi-product deliveries) is expanded.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // The deep link (?q=INV-0042) can reach StockView after this tab already
  // mounted - useSearchParams() is sometimes empty on the first render. Re-apply
  // it so the box, and the query it debounces, still match the URL.
  useEffect(() => {
    if (initialSearch) setSearchInput(initialSearch);
  }, [initialSearch]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        cell: ({ row }) => {
          const movement = row.original;
          const extraLines = Math.max(0, (movement.lines?.length ?? 0) - 1);
          const isExpanded = expandedIds.has(movement.id);
          return (
            <div>
              <div className="font-medium">{movement.productName}</div>
              <div className="font-mono text-xs text-muted-foreground">{movement.sku}</div>
              {extraLines > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleExpanded(movement.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`movement-lines-${movement.id}`}
                  className="mt-1 max-w-full rounded-full text-xs"
                >
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                  <span className="truncate">
                    +{extraLines} more {extraLines === 1 ? 'product' : 'products'}
                  </span>
                </Button>
              )}
              {movement.reversed && <div className="text-xs text-muted-italic italic">reversed</div>}
            </div>
          );
        }
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: ({ row }) => {
          const movement = row.original;
          const label = movement.purchaseNumber ?? movement.invoiceNumber ?? movement.reversalOf ?? '—';
          // Jump straight to the document this movement belongs to. Purchases
          // have no detail route, so deep-link into its filtered list instead.
          const href =
            movement.purchaseId && movement.purchaseNumber
              ? `/purchases?search=${encodeURIComponent(movement.purchaseNumber)}`
              : movement.invoiceId
                ? `/invoices/${movement.invoiceId}`
                : undefined;

          return href ? (
            <Link
              href={href}
              title="Open record"
              className="inline-block whitespace-nowrap text-xs text-primary underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">{label}</span>
          );
        }
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
              <span
                className={
                  row.original.quantity >= 0 ? 'font-semibold text-green-700' : 'font-semibold text-destructive'
                }
              >
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
          <div className="text-muted-foreground inline-flex items-center gap-2">
            {row.original.inShopBefore || '—'}
            <span className="text-lg mx-1">→</span>
            {row.original.inShopAfter || '—'}
          </div>
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
      {
        id: 'actions',
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const movement = row.original;
          // Only a real (non-reversed) delivery that points at an invoice can
          // produce a delivery challan.
          const canChallan =
            movement.kind === 'deliver' &&
            !!movement.invoiceId &&
            !movement.reversalOf &&
            !movement.reversed;
          const reverseDisabled =
            movement.reversed || movement.kind === 'opening' || movement.kind === 'reversal';
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label={`Print slip ${movement.movementId}`}
                title="Print slip"
              >
                <Link href={`/stock/print?ids=${encodeURIComponent(movement.id)}`} target="_blank">
                  <Printer className="h-3.5 w-3.5" />
                </Link>
              </Button>
              {canChallan && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Download delivery challan for ${movement.movementId}`}
                  title="Delivery challan"
                  onClick={() => setChallanMovement(movement)}
                >
                  <FileDown className="h-3.5 w-3.5" />
                </Button>
              )}
              {canReverse && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={reverseDisabled}
                  aria-label={`Reverse movement ${movement.movementId}`}
                  title={reverseDisabled ? 'Cannot be reversed' : 'Reverse'}
                  onClick={() => setPendingReversal(movement)}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        }
      } satisfies ColumnDef<StockMovement>
    ],
    [canReverse, expandedIds, toggleExpanded]
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

  // Carry the current filters into the print page so it opens on what you see.
  const printParams = new URLSearchParams();
  if (debouncedSearch) printParams.set('search', debouncedSearch);
  if (kind !== 'all') printParams.set('kind', kind);
  const printQuery = printParams.toString();
  const printHref = printQuery ? `/stock/print?${printQuery}` : '/stock/print';

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
          <Link href={printHref} target="_blank">
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
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
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
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              : table.getRowModel().rows.length
                ? table.getRowModel().rows.map(row => {
                    const movement = row.original;
                    const hasLines = (movement.lines?.length ?? 0) > 1;
                    const isExpanded = hasLines && expandedIds.has(movement.id);
                    return (
                      <Fragment key={row.id}>
                        <TableRow className={movement.reversed ? 'opacity-60' : undefined}>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {isExpanded && (
                          <TableRow
                            className={movement.reversed ? 'opacity-60 hover:bg-transparent' : 'hover:bg-transparent'}
                          >
                            <TableCell colSpan={columns.length} className="bg-muted/30">
                              <MovementLinesDetail movement={movement} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                : renderEmpty()}
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
        icon={<Undo2 className="h-5 w-5" />}
        title={`Reverse ${pendingReversal?.movementId ?? ''}`}
        description={`This undoes the movement: In shop goes from ${pendingReversal?.inShopAfter} back toward ${pendingReversal?.inShopBefore} and the linked purchase/invoice record is rolled back. This cannot be undone.`}
        confirmText="Reverse"
        variant="destructive"
        isProcessing={isReversing}
        onConfirm={handleReverse}
      />

      <DeliveryChallanDialog
        movement={challanMovement}
        open={!!challanMovement}
        onOpenChange={open => {
          if (!open) setChallanMovement(null);
        }}
      />
    </div>
  );
}
