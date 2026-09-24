'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, RotateCw, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getInvoiceDeliveryState } from '../actions';
import type { AwaitingDeliveryItem } from '../types';
import { DeliveryBadge } from './delivery-badge';
import { DeliverDialog, type DeliverTarget } from './deliver-dialog';

interface InvoiceDeliveryCardProps {
  invoiceId: string;
  invoiceNumber: string;
  customerName?: string;
  /** False for quotations, cancelled invoices and users without edit:stock. */
  canDeliver?: boolean;
  /** Called after a delivery is recorded so the page can refresh its invoice. */
  onChanged?: () => void;
}

/**
 * Per-line delivery status for one invoice, embedded on the invoice detail page.
 *
 * It loads its own data after mount (and is code-split by the page via
 * next/dynamic), so it never delays the invoice itself from rendering.
 */
export function InvoiceDeliveryCard({
  invoiceId,
  invoiceNumber,
  customerName,
  canDeliver = false,
  onChanged
}: InvoiceDeliveryCardProps) {
  const [state, setState] = useState<AwaitingDeliveryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);
  const [target, setTarget] = useState<DeliverTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasFailed(false);
      const result = await getInvoiceDeliveryState(invoiceId);
      setState(result);
      if (!result) setHasFailed(true);
    } catch (error) {
      console.error('Failed to load delivery state:', error);
      setHasFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = () => {
    if (!state) return;
    setTarget({
      id: state.id,
      invoiceNumber: state.invoiceNumber,
      customerName: state.customerName,
      lines: state.lines.filter(line => line.pending > 0)
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (hasFailed || !state) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">Delivery status could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RotateCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const historyHref = `/stock?tab=history&q=${encodeURIComponent(state.invoiceNumber)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Delivery</CardTitle>
            <DeliveryBadge lines={state.lines} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={historyHref}>
                Stock history
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            {canDeliver && state.totalPending > 0 && (
              <Button size="sm" onClick={openDialog}>
                <Truck className="mr-1.5 h-3.5 w-3.5" />
                Deliver
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{state.totalDelivered}</span> of{' '}
          <span className="font-medium text-foreground">{state.totalInvoiced}</span> unit(s) handed over
          {state.totalPending > 0 && (
            <>
              {' '}
              - <span className="font-medium text-foreground">{state.totalPending}</span> still to deliver
            </>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {state.lines.map(line => {
          const pct = line.quantity > 0 ? Math.min(100, Math.round((line.delivered / line.quantity) * 100)) : 0;
          return (
            <div key={line.index} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{line.productName}</div>
                  {line.sku && <div className="font-mono text-xs text-muted-foreground">{line.sku}</div>}
                </div>
                <span className="whitespace-nowrap text-sm">
                  <span className="font-semibold">{line.delivered}</span>
                  <span className="text-muted-foreground"> / {line.quantity} </span>
                  <span className="text-muted-foreground">{line.unit}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-600' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {line.pending > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">{line.pending} pending</p>
              )}
            </div>
          );
        })}
      </CardContent>

      <DeliverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
        onSuccess={() => {
          load();
          onChanged?.();
        }}
      />
    </Card>
  );
}
