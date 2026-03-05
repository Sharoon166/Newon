'use client';

import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VirtualProductsTable } from './virtual-products-table';
import { VirtualProductsCards } from './virtual-products-cards';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { EnhancedVirtualProduct } from '../types';

interface VirtualProductsViewTabsProps {
  virtualProducts: EnhancedVirtualProduct[];
}

export function VirtualProductsViewTabs({ virtualProducts }: VirtualProductsViewTabsProps) {
  const [viewMode, setViewMode] = useLocalStorage<'table' | 'cards'>('virtual-products-view-mode', 'table');

  return (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'cards')} className="w-full">
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
