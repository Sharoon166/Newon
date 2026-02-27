'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Layers } from 'lucide-react';
import { ProductSelector } from './product-selector';
import { VirtualProductSelector } from './virtual-product-selector';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { Purchase } from '@/features/purchases/types';
import type { ExpenseCategory } from '@/features/expenses/types';

interface EnhancedProductSelectorProps {
  label?: string;
  variants: EnhancedVariants[];
  virtualProducts: EnhancedVirtualProduct[];
  purchases: Purchase[];
  currentItems?: Array<{
    variantId?: string;
    virtualProductId?: string;
    quantity: number;
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
  }>;
  onAddItem: (item: {
    productId?: string;
    variantId?: string;
    virtualProductId?: string;
    isVirtualProduct?: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    saleRate: number;
    originalRate?: number;
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
      category: ExpenseCategory;
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
  }) => void;
  skipStockValidation?: boolean;
}

export function EnhancedProductSelector({
  label = 'Add to Invoice',
  variants,
  virtualProducts,
  purchases,
  currentItems = [],
  onAddItem,
  skipStockValidation = false
}: EnhancedProductSelectorProps) {
  const [activeTab, setActiveTab] = useState<'regular' | 'virtual'>('regular');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'regular' | 'virtual')}>
      <TabsList className="max-sm:flex-col max-sm:w-full max-sm:*:w-full h-full">
        <TabsTrigger value="regular">
          <Package className="h-4 w-4 mr-2" />
          Regular Products
        </TabsTrigger>
        <TabsTrigger value="virtual">
          <Layers className="h-4 w-4 mr-2" />
          Virtual Products
        </TabsTrigger>
      </TabsList>

      <TabsContent value="regular" className="mt-4">
        <ProductSelector
          label={label}
          variants={variants}
          purchases={purchases}
          currentItems={currentItems.filter(item => !item.virtualProductId)}
          onAddItem={onAddItem}
          skipStockValidation={skipStockValidation}
        />
      </TabsContent>

      <TabsContent value="virtual" className="mt-4">
        <VirtualProductSelector
          label={label}
          virtualProducts={virtualProducts}
          currentItems={currentItems}
          onAddItem={onAddItem}
          skipStockValidation={skipStockValidation}
        />
      </TabsContent>
    </Tabs>
  );
}
