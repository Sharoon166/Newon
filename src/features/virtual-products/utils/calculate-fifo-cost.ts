'use server';

import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import VirtualProductModel from '@/models/VirtualProduct';

export interface ComponentBreakdown {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  purchaseId: string;
  unitCost: number;
  totalCost: number;
}

export interface VirtualProductCostBreakdown {
  componentBreakdown: ComponentBreakdown[];
  customExpenses: Array<{
    name: string;
    amount: number;
    category: string;
    description?: string;
  }>;
  totalComponentCost: number;
  totalCustomExpenses: number;
  totalCost: number;
  canFulfill: boolean;
  errors: string[];
}

/**
 * Calculate FIFO-based cost breakdown for a virtual product
 * @param virtualProductId - The virtual product ID
 * @param quantity - Quantity of virtual products needed
 * @param currentInvoiceItems - Items already in the invoice (to account for stock usage)
 * @returns Cost breakdown with FIFO purchase assignments
 */
export async function calculateVirtualProductFIFOCost(
  virtualProductId: string,
  quantity: number,
  currentInvoiceItems: Array<{ variantId?: string; purchaseId?: string; quantity: number }> = []
): Promise<VirtualProductCostBreakdown> {
  try {
    await dbConnect();

    // Get virtual product with components
    const virtualProduct = await VirtualProductModel.findById(virtualProductId).lean();
    if (!virtualProduct) {
      throw new Error('Virtual product not found');
    }

    const vp = virtualProduct as unknown as {
      components: Array<{
        productId: string;
        variantId: string;
        quantity: number;
      }>;
      customExpenses?: Array<{
        name: string;
        amount: number;
        category: string;
        description?: string;
      }>;
    };
    const componentBreakdown: ComponentBreakdown[] = [];
    const errors: string[] = [];
    let canFulfill = true;

    // For each component, find FIFO purchases
    for (const component of vp.components) {
      const requiredQty = component.quantity * quantity;

      // Get all purchases for this component, sorted by FIFO
      const purchases = await PurchaseModel.find({
        productId: component.productId,
        variantId: component.variantId,
        remaining: { $gt: 0 }
      })
        .sort({ purchaseDate: 1 })
        .lean();

      // Calculate effective remaining for each purchase (accounting for items in current invoice)
      const purchasesWithEffectiveRemaining = purchases.map((purchase: Record<string, unknown>) => {
        const purchaseObj = purchase as {
          purchaseId: string;
          remaining: number;
          unitPrice: number;
        };
        const usedInInvoice = currentInvoiceItems
          .filter(item => item.variantId === component.variantId && item.purchaseId === purchaseObj.purchaseId)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        return {
          ...purchase,
          effectiveRemaining: purchaseObj.remaining - usedInInvoice
        };
      }).filter((p: Record<string, unknown>) => (p.effectiveRemaining as number) > 0);

      if (purchasesWithEffectiveRemaining.length === 0) {
        errors.push(`No stock available for component ${component.productId}-${component.variantId}`);
        canFulfill = false;
        continue;
      }

      // Use FIFO to allocate stock across multiple purchases if needed
      let remainingToAllocate = requiredQty;
      const allocatedPurchases: Array<{
        purchaseId: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      for (const purchase of purchasesWithEffectiveRemaining) {
        if (remainingToAllocate <= 0) break;

        const purchaseTyped = purchase as Record<string, unknown> & {
          effectiveRemaining: number;
          purchaseId: string;
          unitPrice: number;
        };

        const allocateQty = Math.min(purchaseTyped.effectiveRemaining, remainingToAllocate);
        
        allocatedPurchases.push({
          purchaseId: purchaseTyped.purchaseId,
          quantity: allocateQty,
          unitCost: purchaseTyped.unitPrice,
          totalCost: allocateQty * purchaseTyped.unitPrice
        });

        remainingToAllocate -= allocateQty;
      }

      if (remainingToAllocate > 0) {
        const totalAvailable = purchasesWithEffectiveRemaining.reduce(
          (sum, p) => sum + ((p as Record<string, unknown>).effectiveRemaining as number),
          0
        );
        errors.push(
          `Insufficient stock for component ${component.productId}-${component.variantId}. ` +
          `Need: ${requiredQty}, Available: ${totalAvailable}`
        );
        canFulfill = false;
        continue;
      }

      // Add each allocated purchase as a separate component breakdown entry
      for (const allocated of allocatedPurchases) {
        componentBreakdown.push({
          productId: component.productId,
          variantId: component.variantId,
          productName: 'Component', // Will be populated by caller
          sku: 'SKU', // Will be populated by caller
          quantity: allocated.quantity,
          purchaseId: allocated.purchaseId,
          unitCost: allocated.unitCost,
          totalCost: allocated.totalCost
        });
      }
    }

    // Calculate totals
    const totalComponentCost = componentBreakdown.reduce((sum, comp) => sum + comp.totalCost, 0);
    const totalCustomExpenses = (vp.customExpenses || []).reduce((sum: number, exp) => sum + exp.amount, 0) * quantity;

    return {
      componentBreakdown,
      customExpenses: (vp.customExpenses || []).map((exp) => ({
        name: exp.name,
        amount: exp.amount * quantity, // Multiply by quantity
        category: exp.category,
        description: exp.description
      })),
      totalComponentCost,
      totalCustomExpenses,
      totalCost: totalComponentCost + totalCustomExpenses,
      canFulfill,
      errors
    };
  } catch (error) {
    console.error('Error calculating virtual product FIFO cost:', error);
    throw error;
  }
}
