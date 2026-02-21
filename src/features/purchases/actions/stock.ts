'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import { VirtualProduct } from '@/features/virtual-products/types';

/**
 * Deduct stock from a purchase
 * @param purchaseId - The purchase ID to deduct from
 * @param quantity - The quantity to deduct
 * @returns Updated purchase or throws error
 */
export async function deductPurchaseStock(purchaseId: string, quantity: number): Promise<void> {
  try {
    await dbConnect();

    const purchase = await PurchaseModel.findOne({ purchaseId });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }

    if (purchase.remaining < quantity) {
      throw new Error(
        `Insufficient stock in purchase ${purchaseId}. Available: ${purchase.remaining}, Requested: ${quantity}`
      );
    }

    // Deduct the quantity
    purchase.remaining -= quantity;
    await purchase.save();

    revalidatePath('/purchases');
    revalidatePath('/inventory');
  } catch (error) {
    console.error(`Error deducting stock from purchase ${purchaseId}:`, error);
    throw error;
  }
}

/**
 * Restore stock to a purchase (when invoice is cancelled/deleted)
 * @param purchaseId - The purchase ID to restore to
 * @param quantity - The quantity to restore
 */
export async function restorePurchaseStock(purchaseId: string, quantity: number): Promise<void> {
  try {
    await dbConnect();

    const purchase = await PurchaseModel.findOne({ purchaseId });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }

    // Restore the quantity (but don't exceed original quantity)
    purchase.remaining = Math.min(purchase.remaining + quantity, purchase.quantity);
    await purchase.save();

    revalidatePath('/purchases');
    revalidatePath('/inventory');
  } catch (error) {
    console.error(`Error restoring stock to purchase ${purchaseId}:`, error);
    throw error;
  }
}

/**
 * Deduct stock for multiple items (used when creating invoice)
 * Handles both regular products and virtual products
 * @param items - Array of items with purchaseId, quantity, and virtual product info
 */
export async function deductStockForInvoice(
  items: Array<{ 
    purchaseId?: string; 
    quantity: number;
    isVirtualProduct?: boolean;
    virtualProductId?: string;
  }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    // Handle virtual products
    if (item.isVirtualProduct && item.virtualProductId) {
      try {
        // Get virtual product details with components
        const VirtualProductModel = (await import('@/models/VirtualProduct')).default;
        
        await dbConnect();
        
        const virtualProduct = await VirtualProductModel.findById(item.virtualProductId).lean();
        if (!virtualProduct) {
          errors.push(`Virtual product ${item.virtualProductId} not found`);
          continue;
        }

        // Deduct stock for each component
        for (const component of (virtualProduct as unknown as VirtualProduct).components) {
          const requiredQty = component.quantity * item.quantity;
          
          // Find purchases for this component variant
          const purchases = await PurchaseModel.find({
            productId: component.productId,
            variantId: component.variantId,
            remaining: { $gt: 0 }
          }).sort({ date: 1 }); // FIFO

          let remainingToDeduct = requiredQty;
          
          for (const purchase of purchases) {
            if (remainingToDeduct <= 0) break;
            
            const deductQty = Math.min(purchase.remaining, remainingToDeduct);
            purchase.remaining -= deductQty;
            await purchase.save();
            remainingToDeduct -= deductQty;
          }

          if (remainingToDeduct > 0) {
            errors.push(
              `Insufficient stock for component ${component.productId}-${component.variantId}. ` +
              `Needed: ${requiredQty}, Short by: ${remainingToDeduct}`
            );
          }
        }
      } catch (error) {
        errors.push(`Virtual product ${item.virtualProductId}: ${(error as Error).message}`);
      }
    }
    // Handle regular products
    else if (item.purchaseId) {
      try {
        await deductPurchaseStock(item.purchaseId, item.quantity);
      } catch (error) {
        errors.push(`${item.purchaseId}: ${(error as Error).message}`);
      }
    }
    // Skip items without purchase ID or virtual product ID (manual entries)
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Restore stock for multiple items (used when deleting/cancelling invoice)
 * Handles both regular products and virtual products
 * @param items - Array of items with purchaseId, quantity, and virtual product info
 */
export async function restoreStockForInvoice(
  items: Array<{ 
    purchaseId?: string; 
    quantity: number;
    isVirtualProduct?: boolean;
    virtualProductId?: string;
  }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    // Handle virtual products
    if (item.isVirtualProduct && item.virtualProductId) {
      try {
        // Get virtual product details with components
        const VirtualProductModel = (await import('@/models/VirtualProduct')).default;
        
        await dbConnect();
        
        const virtualProduct = await VirtualProductModel.findById(item.virtualProductId).lean();
        if (!virtualProduct) {
          errors.push(`Virtual product ${item.virtualProductId} not found`);
          continue;
        }

        // Restore stock for each component
        for (const component of (virtualProduct as unknown as VirtualProduct).components) {
          const restoreQty = component.quantity * item.quantity;
          
          // Find purchases for this component variant (most recent first for restoration)
          const purchases = await PurchaseModel.find({
            productId: component.productId,
            variantId: component.variantId
          }).sort({ date: -1 }); // LIFO for restoration

          let remainingToRestore = restoreQty;
          
          for (const purchase of purchases) {
            if (remainingToRestore <= 0) break;
            
            const maxRestore = purchase.quantity - purchase.remaining;
            const restoreAmount = Math.min(maxRestore, remainingToRestore);
            
            if (restoreAmount > 0) {
              purchase.remaining += restoreAmount;
              await purchase.save();
              remainingToRestore -= restoreAmount;
            }
          }

          if (remainingToRestore > 0) {
            errors.push(
              `Could not fully restore stock for component ${component.productId}-${component.variantId}. ` +
              `Attempted: ${restoreQty}, Restored: ${restoreQty - remainingToRestore}`
            );
          }
        }
      } catch (error) {
        errors.push(`Virtual product ${item.virtualProductId}: ${(error as Error).message}`);
      }
    }
    // Handle regular products
    else if (item.purchaseId) {
      try {
        await restorePurchaseStock(item.purchaseId, item.quantity);
      } catch (error) {
        errors.push(`${item.purchaseId}: ${(error as Error).message}`);
      }
    }
    // Skip items without purchase ID or virtual product ID (manual entries)
  }

  return {
    success: errors.length === 0,
    errors
  };
}
