import { getProductsForStaff } from '@/features/inventory/actions';
import { StaffProductsTable } from '@/features/inventory/components/staff-product-table';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const products = await getProductsForStaff();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl text-primary font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">View your product inventory</p>
        </div>
      </div>

      <div className="sm:px-6">
        <StaffProductsTable data={products} />
      </div>
    </div>
  );
}
