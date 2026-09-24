import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StockView } from '@/features/stock/components/stock-view';
import { getStockTrackingStatus, getStockWorkCounts } from '@/features/stock/actions';
import { getSession, requirePermission } from '@/lib/auth-utils';

// export const dynamic = 'force-dynamic';

interface StockPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// StockView reads ?tab= / ?q= via useSearchParams, which requires a Suspense
// boundary so the route can still be prerendered.
function StockViewFallback() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function StockPage() {
  await requirePermission('view:stock');

  const session = await getSession();
  const [status, counts] = await Promise.all([getStockTrackingStatus(), getStockWorkCounts()]);

  return (
    <Suspense fallback={<StockViewFallback />}>
      <StockView
        initialized={status.initialized}
        startedAt={status.startedAt}
        counts={counts}
        userRole={(session?.user as any)?.role === 'staff' ? 'staff' : 'admin'}
      />
    </Suspense>
  );
}
