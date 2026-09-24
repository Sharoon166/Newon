import { PageHeader } from '@/components/general/page-header';
import { getAllPurchases } from '@/features/purchases/actions';
import { getProductsBasic } from '@/features/inventory/actions';
import { getStockTrackingStatus } from '@/features/stock/actions';
import { PurchasesTableWithActions } from '@/features/purchases/components/purchases-table-with-actions';
import { getSession, requirePermission } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface PurchasesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  await requirePermission('view:purchases');

  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 10;
  const search = params.search;

  const session = await getSession();

  const [purchasesData, products, stockStatus] = await Promise.all([
    getAllPurchases({ page, limit, search }),
    getProductsBasic(),
    getStockTrackingStatus()
  ]);

  return (
    <>
      <PageHeader
        title="Purchase History"
        description="View and manage all purchase records across all product variants"
      />

      {/* Purchases Table with Actions */}
      <div className="mt-6">
        <PurchasesTableWithActions
          purchasesData={purchasesData}
          products={products}
          userRole={session?.user?.role}
          stockReady={stockStatus.initialized}
        />
      </div>
    </>
  );
}
