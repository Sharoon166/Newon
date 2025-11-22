import { getAllPurchases } from '@/features/purchases/actions';
import { PrintablePurchasesWithPrint } from '@/features/purchases/components/printable-purchases-with-print';

export const dynamic = 'force-dynamic';

export default async function PrintPurchasesPage() {
  const purchases = await getAllPurchases();

  return (
    <div className="py-10 print:py-0 print:m-0 print:p-0">
      <PrintablePurchasesWithPrint data={purchases} />
    </div>
  );
}
