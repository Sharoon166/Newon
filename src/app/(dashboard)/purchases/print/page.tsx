import { getAllPurchases } from '@/features/purchases/actions';
import { PrintablePurchasesWithPrint } from '@/features/purchases/components/printable-purchases-with-print';
import { requirePermission } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export default async function PrintPurchasesPage() {
  // Same gate as the purchases page - staff may print, but the rows themselves
  // are redacted by getAllPurchases when they contain imported cost data.
  await requirePermission('view:purchases');

  const purchases = await getAllPurchases({ limit: 1_000_000 }); // to get all the purchases

  return (
    <div className="py-10 print:py-0 print:m-0 print:p-0">
      <PrintablePurchasesWithPrint initialData={purchases.docs} />
    </div>
  );
}
