import { getStockMovements } from '@/features/stock/actions';
import { requirePermission } from '@/lib/auth-utils';
import { PrintableStockSlipsWithPrint } from '@/features/stock/components/printable-stock-slips-with-print';
import type { StockMovementKind } from '@/features/stock/types';

export const dynamic = 'force-dynamic';

interface StockPrintSlipsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_LIMIT = 1_000;

const SLIP_KINDS: StockMovementKind[] = ['receive', 'deliver', 'adjustment', 'opening', 'reversal'];

export default async function StockPrintSlipsPage({ searchParams }: StockPrintSlipsPageProps) {
  await requirePermission('view:stock');

  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const rawKind = typeof params.kind === 'string' ? params.kind : 'all';
  const kind = SLIP_KINDS.includes(rawKind as StockMovementKind) ? (rawKind as StockMovementKind) : 'all';

  // `ids` targets specific slips (from the slip-selection dialog in History).
  const rawIds = typeof params.ids === 'string' ? params.ids : undefined;
  const ids = rawIds ? rawIds.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const result = await getStockMovements({ page: 1, limit: PAGE_LIMIT, search, kind, ids });

  return (
    <PrintableStockSlipsWithPrint movements={result.docs} />
  );
}
