'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Layers } from 'lucide-react';
import { ProjectInventorySelector } from './project-inventory-selector';
import { ProjectRegularInventorySelector } from './project-regular-inventory-selector';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';

interface ProjectInventoryCombinedSelectorProps {
  virtualProducts: EnhancedVirtualProduct[];
  variants: EnhancedVariants[];
  purchases: Purchase[];
  currentItems?: Array<{
    virtualProductId?: string;
    variantId?: string;
    quantity: number;
  }>;
  onAddItem: (item: {
    productId?: string;
    variantId?: string;
    virtualProductId?: string;
    isVirtualProduct: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    purchaseId?: string;
    componentBreakdown?: Array<{
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      quantity: number;
      purchaseId: string;
      unitCost: number;
      totalCost: number;
    }>;
    customExpenses?: Array<{
      name: string;
      amount: number;
      category: string;
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
    notes?: string;
  }) => void;
}

export function ProjectInventoryCombinedSelector({
  virtualProducts,
  variants,
  purchases,
  currentItems = [],
  onAddItem
}: ProjectInventoryCombinedSelectorProps) {
  const [activeTab, setActiveTab] = useState<'regular' | 'virtual'>('regular');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'regular' | 'virtual')} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="regular" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Regular Products
        </TabsTrigger>
        <TabsTrigger value="virtual" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Virtual Products
        </TabsTrigger>
      </TabsList>

      <TabsContent value="regular" className="mt-4">
        <ProjectRegularInventorySelector
          variants={variants}
          purchases={purchases}
          currentItems={currentItems}
          onAddItem={onAddItem}
        />
      </TabsContent>

      <TabsContent value="virtual" className="mt-4">
        <ProjectInventorySelector virtualProducts={virtualProducts} onAddItem={onAddItem} />
      </TabsContent>
    </Tabs>
  );
}
