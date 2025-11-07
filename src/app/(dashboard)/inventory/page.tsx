import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ProductsTable } from '@/features/inventory/components/products-table';
import Link from 'next/link';
import { getProducts } from '@/features/inventory/actions';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl text-primary font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">View and manage your product inventory</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/inventory/add" className="inline-flex items-center gap-2 group">
            Add Product <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
          </Link>
        </Button>
      </div>

      <div className="sm:px-6">
        <ProductsTable data={products} />
      </div>
    </div>
  );
}
