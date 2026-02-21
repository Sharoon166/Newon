'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedProductSelector } from '@/features/invoices/components/enhanced-product-selector';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { Purchase } from '@/features/purchases/types';
import type { InventoryItem } from '../types';
import { addInventoryItem } from '../actions';
import { toast } from 'sonner';

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userId: string;
  variants: EnhancedVariants[];
  virtualProducts: EnhancedVirtualProduct[];
  purchases: Purchase[];
  currentInventory: InventoryItem[];
  onSuccess: () => void;
}

export function AddInventoryDialog({
  open,
  onOpenChange,
  projectId,
  userId,
  variants,
  virtualProducts,
  purchases,
  currentInventory,
  onSuccess
}: AddInventoryDialogProps) {
  // Convert current inventory to the format expected by EnhancedProductSelector
  const currentItems = currentInventory.map(item => ({
    variantId: item.variantId,
    virtualProductId: item.virtualProductId,
    quantity: item.quantity,
    purchaseId: item.componentBreakdown?.[0]?.purchaseId, // For regular products
    componentBreakdown: item.componentBreakdown
  }));

  const handleAddItem = async (item: {
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
      category: 'labor' | 'materials' | 'overhead' | 'packaging' | 'shipping' | 'other';
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
  }) => {
    try {
      // Check if this item already exists in inventory
      let existingItem: InventoryItem | undefined;
      
      if (item.isVirtualProduct && item.virtualProductId) {
        // For virtual products, check by virtualProductId
        existingItem = currentInventory.find(inv => inv.virtualProductId === item.virtualProductId);
      } else if (item.variantId && item.purchaseId) {
        // For regular products, check by variantId AND purchaseId (same purchase)
        existingItem = currentInventory.find(
          inv => inv.variantId === item.variantId && 
                 inv.componentBreakdown?.[0]?.purchaseId === item.purchaseId
        );
      }

      if (existingItem) {
        // Item exists, just show success message (quantity already updated by selector logic)
        toast.success(`Updated ${item.productName} quantity in project inventory`);
        onSuccess();
        return;
      }

      // Add new item
      await addInventoryItem(projectId, {
        productId: item.productId,
        variantId: item.variantId,
        virtualProductId: item.virtualProductId,
        isVirtualProduct: item.isVirtualProduct || false,
        productName: item.productName,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate, // Use the rate (cost) from the selector
        componentBreakdown: item.componentBreakdown,
        customExpenses: item.customExpenses,
        totalComponentCost: item.totalComponentCost,
        totalCustomExpenses: item.totalCustomExpenses,
        addedBy: userId
      });

      toast.success('Inventory item added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error((error as Error).message || 'Failed to add inventory item');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory to Project</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/30 p-4 rounded-lg">
          <EnhancedProductSelector
            label="Add to Project"
            variants={variants}
            virtualProducts={virtualProducts}
            purchases={purchases}
            currentItems={currentItems}
            onAddItem={handleAddItem}
            skipStockValidation={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
