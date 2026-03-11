import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { VirtualProductsViewTabs } from '@/features/virtual-products/components/virtual-products-view-tabs';
import { getVirtualProducts } from '@/features/virtual-products/actions';

export const metadata = {
  title: 'Virtual Products',
  description: 'Manage virtual products composed of multiple inventory items'
};

async function VirtualProductsContent() {
  const virtualProducts = await getVirtualProducts();

  return <VirtualProductsViewTabs virtualProducts={virtualProducts} />;
}

export default function VirtualProductsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Virtual Products" description="Create and manage virtual products">
        <Link href="/virtual-products/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Virtual Product
          </Button>
        </Link>
      </PageHeader>

      <VirtualProductsContent />
    </div>
  );
}
