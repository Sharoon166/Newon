import { Suspense } from 'react';
import { Plus, LayoutGrid, Table as TableIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/general/page-header';
import { VirtualProductsTable } from '@/features/virtual-products/components/virtual-products-table';
import { VirtualProductsCards } from '@/features/virtual-products/components/virtual-products-cards';
import { getVirtualProducts } from '@/features/virtual-products/actions';
import { getProducts } from '@/features/inventory/actions';

export const metadata = {
  title: 'Virtual Products',
  description: 'Manage virtual products composed of multiple inventory items'
};

async function VirtualProductsContent() {
  const [virtualProducts, ] = await Promise.all([
    getVirtualProducts(),
    // getProducts()
  ]);

  return (
    <Tabs defaultValue="table" className="w-full">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon className="h-4 w-4 mr-2" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="cards">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Card View
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="table" className="mt-0">
        <VirtualProductsTable data={virtualProducts} />
      </TabsContent>

      <TabsContent value="cards" className="mt-0">
        <VirtualProductsCards data={virtualProducts} />
      </TabsContent>
    </Tabs>
  );
}

export default function VirtualProductsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Virtual Products"
        description="Create and manage virtual products composed of multiple inventory items"
      >
        <Link href="/virtual-products/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Virtual Product
          </Button>
        </Link>
      </PageHeader>

      <Suspense fallback={<div className="text-center py-8">Loading virtual products...</div>}>
        <VirtualProductsContent />
      </Suspense>
    </div>
  );
}
