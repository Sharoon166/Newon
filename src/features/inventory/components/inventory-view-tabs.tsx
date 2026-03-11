'use client';

import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductsTable } from './products-table';
import { ProductsCards } from './products-cards';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { EnhancedVariants } from '../types';

interface InventoryViewTabsProps {
  products: EnhancedVariants[];
  userRole?: 'admin' | 'staff' | undefined;
}

export function InventoryViewTabs({ products, userRole }: InventoryViewTabsProps) {
  const [viewMode, setViewMode] = useLocalStorage<'table' | 'cards'>('inventory-view-mode', 'table');

  return (
    <Tabs value={viewMode} onValueChange={value => setViewMode(value as 'table' | 'cards')} className="w-full">
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
        <ProductsTable data={products} userRole={userRole} />
      </TabsContent>

      <TabsContent value="cards" className="mt-0">
        <ProductsCards data={products} userRole={userRole} />
      </TabsContent>
    </Tabs>
  );
}
