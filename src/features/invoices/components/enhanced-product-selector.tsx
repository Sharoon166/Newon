'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Layers } from 'lucide-react';
import { ProductSelector } from './product-selector';
import { VirtualProductSelector } from './virtual-product-selector';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { Purchase } from '@/features/purchases/types';
import type { ExpenseCategory } from '@/features/expenses/types';
import type { InvoiceItem } from '../types';

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
  restoredItems?: InvoiceItem[];
}

export function EnhancedProductSelector({
  label = 'Add to Invoice',
  variants,
  virtualProducts,
  purchases,
  currentItems = [],
  onAddItem,
  skipStockValidation = false,
  restoredItems
}: EnhancedProductSelectorProps) {
  const [activeTab, setActiveTab] = useState<'regular' | 'virtual'>('regular');

  // Single source of truth: effective remaining stock per purchaseId.
  // Starts from DB remaining, subtracts all invoice consumption (regular items
  // and VP component breakdowns), adds back restored items.
  const effectiveStockByPurchase = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();

    // Seed from DB remaining
    for (const p of purchases) {
      map.set(p.purchaseId, p.remaining);
    }

    // Add back restored items (stock deducted in DB but not yet physically restored)
    if (restoredItems) {
      for (const item of restoredItems) {
        if (!item.virtualProductId && item.purchaseId) {
          map.set(item.purchaseId, (map.get(item.purchaseId) ?? 0) + item.quantity);
        }
        if (item.componentBreakdown) {
          for (const comp of item.componentBreakdown) {
            map.set(comp.purchaseId, (map.get(comp.purchaseId) ?? 0) + comp.quantity);
          }
        }
      }
    }

    // Subtract regular items in current invoice
    for (const item of currentItems) {
      if (!item.virtualProductId && item.purchaseId) {
        map.set(item.purchaseId, (map.get(item.purchaseId) ?? 0) - item.quantity);
      }
      // Subtract VP component consumption
      if (item.componentBreakdown) {
        for (const comp of item.componentBreakdown) {
          map.set(comp.purchaseId, (map.get(comp.purchaseId) ?? 0) - comp.quantity);
        }
      }
    }

    return map;
  }, [purchases, currentItems, restoredItems]);

  return (
    <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'regular' | 'virtual')}>
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
          effectiveStockByPurchase={effectiveStockByPurchase}
          currentItems={currentItems.filter(item => !item.virtualProductId)}
          onAddItem={onAddItem}
          skipStockValidation={skipStockValidation}
        />
      </TabsContent>

      <TabsContent value="virtual" className="mt-4">
        <VirtualProductSelector
          label={label}
          virtualProducts={virtualProducts}
          purchases={purchases}
          effectiveStockByPurchase={effectiveStockByPurchase}
          currentItems={currentItems}
          onAddItem={onAddItem}
          skipStockValidation={skipStockValidation}
          restoredItems={restoredItems?.filter(item => !!item.virtualProductId)}
        />
      </TabsContent>
    </Tabs>
  );
}
