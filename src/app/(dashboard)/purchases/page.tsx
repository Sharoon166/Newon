import { PageHeader } from '@/components/general/page-header';
import { getAllPurchases } from '@/features/purchases/actions';
import { getProducts } from '@/features/inventory/actions';
import { PurchasesTableWithActions } from '@/features/purchases/components/purchases-table-with-actions';

export const dynamic = 'force-dynamic';

interface PurchasesPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 10;
  const search = params.search;

  const [purchasesData, products] = await Promise.all([getAllPurchases({ page, limit, search }), getProducts()]);

  return (
    <>
      <PageHeader
        title="Purchase History"
        description="View and manage all purchase records across all product variants"
      />

      {/* Purchases Table with Actions */}
      <div className="mt-6">
        <PurchasesTableWithActions purchasesData={purchasesData} products={products} />
      </div>
    </>
  );
}
