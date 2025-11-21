import { PageHeader } from '@/components/general/page-header';
import { getAllPurchases } from '@/features/purchases/actions';
import { getProducts } from '@/features/inventory/actions';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { PurchasesTableWithActions } from '@/features/purchases/components/purchases-table-with-actions';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
  const purchases = await getAllPurchases();
  const products = await getProducts();

  // Calculate statistics
  const totalPurchased = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const uniqueSuppliers = new Set(purchases.map(p => p.supplier)).size;

  return (
    <>
      <PageHeader
        title="Purchase History"
        description="View and manage all purchase records across all product variants"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{purchases.length.toLocaleString()}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{totalPurchased.toLocaleString()}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{formatCurrency(totalCost)}</CardContent>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Suppliers</CardTitle>
          <CardContent className="p-0 text-2xl font-semibold mt-2">{uniqueSuppliers}</CardContent>
        </Card>
      </div>

      {/* Purchases Table with Actions */}
      <div className="mt-6">
        <PurchasesTableWithActions purchases={purchases} products={products} />
      </div>
    </>
  );
}
