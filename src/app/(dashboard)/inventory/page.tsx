import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductsTable } from '@/features/inventory/components/products-table';
import { ProductsCards } from '@/features/inventory/components/products-cards';
import Link from 'next/link';
import { getProducts } from '@/features/inventory/actions';
import { getSession } from '@/lib/auth-utils';
import { PageHeader } from '@/components/general/page-header';

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
            <ProductsTable data={products} userRole={session?.user?.role} />
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            <ProductsCards data={products} userRole={session?.user?.role} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
