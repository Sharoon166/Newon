import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getProducts } from '@/features/inventory/actions';
import { getSession } from '@/lib/auth-utils';
import { PageHeader } from '@/components/general/page-header';
import { InventoryViewTabs } from '@/features/inventory/components/inventory-view-tabs';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const products = await getProducts();
  const session = await getSession();

  return (
    <div className="space-y-6">
      <PageHeader title='Inventory Management' description='View and manage your product inventory'>
        <Button asChild>
          <Link href="/inventory/add" className="inline-flex items-center gap-2 group">
            Add Product <ArrowRight className="size-4 group-hover:translate-x-1 transition" />
          </Link>
        </Button>
      </PageHeader>

      <div className="sm:px-6">
        <InventoryViewTabs products={products} userRole={session?.user?.role} />
      </div>
    </div>
  );
}
