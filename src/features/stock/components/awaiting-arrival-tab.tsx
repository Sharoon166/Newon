'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, PackagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { getAwaitingArrival } from '../actions';
import type { AwaitingArrivalItem, PaginatedStock } from '../types';
import { ReceiveDialog, type ReceiveTarget } from './receive-dialog';
import { StockPagination } from './stock-pagination';
import { toast } from 'sonner';

interface AwaitingArrivalTabProps {
  enabled: boolean;
  onChanged?: () => void;
}

export function AwaitingArrivalTab({ enabled, onChanged }: AwaitingArrivalTabProps) {
  const [data, setData] = useState<PaginatedStock<AwaitingArrivalItem>>({ docs: [], total: 0, page: 1, limit: 15 });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState<ReceiveTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const handleReceive = (item: AwaitingArrivalItem) => {
    setTarget({
      id: item.id,
      purchaseId: item.purchaseId,
      productName: item.productName,
      sku: item.sku,
      ordered: item.ordered,
      received: item.received,
      supplier: item.supplier
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search purchase number or supplier..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{data.total}</span> purchase(s) still to receive
        </p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-center">Ordered</TableHead>
              <TableHead className="text-center">Received</TableHead>
              <TableHead className="text-center">To come</TableHead>
              <TableHead className="text-right">Receive</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data.docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nothing awaiting arrival. New purchases appear here when they are ordered.
                </TableCell>
              </TableRow>
            ) : (
              data.docs.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {item.purchaseId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.supplier || '—'}</TableCell>
                  <TableCell className="text-center">{item.ordered}</TableCell>
                  <TableCell className="text-center font-medium">{item.received}</TableCell>
                  <TableCell className="text-center font-semibold text-primary">{item.pending}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleReceive(item)}>
                      <PackagePlus className="mr-1 h-3.5 w-3.5" />
                      Receive
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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