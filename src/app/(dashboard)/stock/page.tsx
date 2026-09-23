import { StockView } from '@/features/stock/components/stock-view';
import { getStockTrackingStatus } from '@/features/stock/actions';
import { getSession, requirePermission } from '@/lib/auth-utils';

// export const dynamic = 'force-dynamic';

interface StockPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StockPage() {
  await requirePermission('view:stock');

  const session = await getSession();
  const status = await getStockTrackingStatus();

  return (
    <StockView
      initialized={status.initialized}
      startedAt={status.startedAt}
      userRole={(session?.user as any)?.role === 'staff' ? 'staff' : 'admin'}
    />
  );
}
