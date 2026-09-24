'use client';

import { Badge } from '@/components/ui/badge';
import { PackageCheck, PackageOpen, Timer } from 'lucide-react';

/**
 * Delivery status badge (separate from payment status).
 * - notStarted: nothing delivered yet
 * - partial: some lines fully/partially delivered
 * - completed: every item fully delivered
 */
export function getDeliverySummary(lines: Array<{ quantity: number; delivered: number }>) {
  if (!lines || lines.length === 0) return { deliveredUnits: 0, invoicedUnits: 0, completed: false, partial: false };
  const invoicedUnits = lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
  const deliveredUnits = lines.reduce((s, l) => s + Math.min(l.quantity ?? 0, l.delivered ?? 0), 0);
  return {
    invoicedUnits,
    deliveredUnits,
    completed: invoicedUnits > 0 && deliveredUnits >= invoicedUnits,
    partial: deliveredUnits > 0 && deliveredUnits < invoicedUnits
  };
}

export function DeliveryBadge({ lines }: { lines: Array<{ quantity: number; delivered: number }> }) {
  const summary = getDeliverySummary(lines);

  if (summary.completed) {
    return (
      <Badge variant="default" className="flex items-center gap-1 w-fit">
        <PackageCheck className="h-3 w-3" />
        Delivered
      </Badge>
    );
  }
  if (summary.partial) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit">
        <Timer className="h-3 w-3" />
        Partially delivered
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
      <PackageOpen className="h-3 w-3" />
      Not delivered
    </Badge>
  );
}
