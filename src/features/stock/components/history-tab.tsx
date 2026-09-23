'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Undo2, Printer } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { getStockMovements, reverseMovement } from '../actions';
import type { PaginatedStock, StockMovement, StockMovementKind } from '../types';
import { StockPagination } from './stock-pagination';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HistoryTabProps {
  enabled: boolean;
  userRole?: 'admin' | 'staff';
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

function MovementBadge({ kind }: { kind: StockMovementKind }) {
  const style = KIND_STYLES[kind];
  return (
    <Badge variant={style.variant} className="whitespace-nowrap">
      {style.label}
    </Badge>
  );
}

export function HistoryTab({ enabled, userRole }: HistoryTabProps) {
  const router = useRouter();
  const [data, setData] = useState<PaginatedStock<StockMovement>>({ docs: [], total: 0, page: 1, limit: 15 });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [kind, setKind] = useState<StockMovementKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reverse movement');
    } finally {
      setIsReversing(false);
    }
  };

  const canReverse = userRole === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
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
            <Printer className="mr-1 h-3.5 w-3.5" />
            Print slips
          </Link>
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">Slip no</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-center">In shop</TableHead>
              <TableHead>By</TableHead>
              <TableHead>When</TableHead>
              {canReverse && <TableHead className="text-right">Reverse</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canReverse ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data.docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canReverse ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  No movements yet.
                </TableCell>
              </TableRow>
            ) : (
              data.docs.map(movement => {
                const isReversed = movement.reversed;
                return (
                  <TableRow key={movement.id} className={isReversed ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{movement.movementId}</TableCell>
                    <TableCell>
                      <MovementBadge kind={movement.kind} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.productName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{movement.sku}</div>
                      {isReversed && (
                        <div className="text-xs text-muted-foreground italic">reversed</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {movement.purchaseNumber ?? movement.invoiceNumber ?? movement.reversalOf ?? '—'}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {movement.kind === 'adjustment' ? (
                        <span className={movement.quantity >= 0 ? 'text-green-700' : 'text-destructive'}>
                          {movement.quantity >= 0 ? '+' : ''}
                          {movement.quantity}
                        </span>
                      ) : (
                        movement.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {movement.inShopBefore} → {movement.inShopAfter}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{movement.userName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(movement.createdAt).toLocaleDateString()}{' '}
                      <span className="text-xs">{new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    {canReverse && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={movement.reversed || movement.kind === 'opening' || movement.kind === 'reversal'}
                          onClick={() => setPendingReversal(movement)}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <StockPagination
        page={page}
        totalPages={totalPages}
        total={data.total}
        onPageChange={setPage}
        disabled={isLoading}
      />

      <ConfirmationDialog
        open={!!pendingReversal}
        onOpenChange={open => {
          if (!open) setPendingReversal(null);
        }}
        icon={<Undo2 className="h-5 w-5" />}
        title={`Reverse ${pendingReversal?.movementId ?? ''}?`}
        description={`This undoes the movement: In shop goes from ${pendingReversal?.inShopAfter} back toward ${pendingReversal?.inShopBefore} and the linked purchase/invoice record is rolled back. This cannot be undone.`}
        confirmText="Reverse"
        variant="destructive"
        isProcessing={isReversing}
        onConfirm={handleReverse}
      />
    </div>
  );
}