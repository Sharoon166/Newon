'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import { getAwaitingDelivery } from '../actions';
import type { AwaitingDeliveryItem, PaginatedStock } from '../types';
import { DeliverDialog, type DeliverTarget } from './deliver-dialog';
import { StockPagination } from './stock-pagination';
import { toast } from 'sonner';

interface AwaitingDeliveryTabProps {
  enabled: boolean;
  onChanged?: () => void;
}

export function AwaitingDeliveryTab({ enabled, onChanged }: AwaitingDeliveryTabProps) {
  const [data, setData] = useState<PaginatedStock<AwaitingDeliveryItem>>({
    docs: [],
    total: 0,
    page: 1,
    limit: 15
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState<DeliverTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const handleDeliver = (item: AwaitingDeliveryItem) => {
    setTarget({
      id: item.id,
      invoiceNumber: item.invoiceNumber,
      customerName: item.customerName,
      lines: item.lines.map(line => ({
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
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

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items to deliver</TableHead>
              <TableHead className="text-center">Delivered</TableHead>
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-right">Deliver</TableHead>
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
                  Nothing awaiting delivery.
                </TableCell>
              </TableRow>
            ) : (
              data.docs.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {item.invoiceNumber}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.customerName || '—'}</div>
                    {item.customerCompany && (
                      <div className="text-xs text-muted-foreground">{item.customerCompany}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell>
                    <ul className="space-y-0.5">
                      {item.lines.map(line => (
                        <li key={line.index} className="text-sm">
                          <span className="font-medium">{line.productName}</span>{' '}
                          <span className="text-muted-foreground">× {line.pending}</span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {item.totalDelivered} / {item.totalInvoiced}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-primary">{item.totalPending}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleDeliver(item)}>
                      <Truck className="mr-1 h-3.5 w-3.5" />
                      Deliver
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