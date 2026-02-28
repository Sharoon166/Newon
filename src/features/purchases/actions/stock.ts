'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import { VirtualProduct } from '@/features/virtual-products/types';
import type {
  StockDeductionInput,
  StockDeductionResult,
  ItemDeduction,
  ComponentDeduction,
  PurchaseUsage,
  DeductionToRollback
} from '../types/stock-deduction';

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
    revalidatePath('/virtual-products');
  } catch (error) {
    console.error(`Error deducting stock from purchase ${purchaseId}:`, error);
    throw error;
  }
}

/**
 * Restore stock to a purchase (when invoice is cancelled/deleted)
 * @param purchaseId - The purchase ID to restore to
 * @param quantity - The quantity to restore
 * @param skipRevalidation - Skip revalidatePath calls (for use during server component render)
 */
export async function restorePurchaseStock(purchaseId: string, quantity: number, skipRevalidation = false): Promise<void> {
  try {
    await dbConnect();

    const purchase = await PurchaseModel.findOne({ purchaseId });

    if (!purchase) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }

    // Restore the quantity (but don't exceed original quantity)
    purchase.remaining = Math.min(purchase.remaining + quantity, purchase.quantity);
    await purchase.save();

    if (!skipRevalidation) {
      revalidatePath('/purchases');
      revalidatePath('/inventory');
      revalidatePath('/virtual-products');
    }
  } catch (error) {
    console.error(`Error restoring stock to purchase ${purchaseId}:`, error);
    throw error;
  }
}

/**
 * Deduct stock for multiple items (used when creating invoice)
 * Handles both regular products and virtual products
 * Tracks actual purchases used for accurate cost tracking
 * Supports full rollback on errors
 * 
 * @param items - Array of items with purchaseId, quantity, and virtual product info
 * @returns Result with success status, errors, and actual deductions made
 */
export async function deductStockForInvoice(
  items: StockDeductionInput[]
): Promise<StockDeductionResult> {
  const errors: string[] = [];
  const actualDeductions: ItemDeduction[] = [];
  const deductionsToRollback: DeductionToRollback[] = [];

  // Import models and connect to DB once before the loop
  const VirtualProductModel = (await import('@/models/VirtualProduct')).default;
  const ProductModel = (await import('@/models/Product')).default;
  await dbConnect();

  try {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      // Handle virtual products
      if (item.isVirtualProduct && item.virtualProductId) {
        try {
          const virtualProduct = await VirtualProductModel.findById(item.virtualProductId).lean();
          if (!virtualProduct) {
            errors.push(`Virtual product ${item.virtualProductId} not found`);
            continue;
          }

          const componentBreakdown: ComponentDeduction[] = [];

          // Deduct stock for each component and track actual usage
          for (const component of (virtualProduct as unknown as VirtualProduct).components) {
            const requiredQty = component.quantity * item.quantity;
            
            // Get product details for this component
            const product = await ProductModel.findById(component.productId).lean();
            if (!product) {
              throw new Error(`Product ${component.productId} not found`);
            }

            interface ProductVariant {
              id: string;
              sku: string;
            }

            interface LeanProductDoc {
              name: string;
              variants?: ProductVariant[];
            }

            const productDoc = product as unknown as LeanProductDoc;
            const variant = productDoc.variants?.find((v) => v.id === component.variantId);
            
            const productName = productDoc.name;
            const sku = variant?.sku || 'N/A';
            
            // Find purchases for this component variant (FIFO)
            const purchases = await PurchaseModel.find({
              productId: component.productId,
              variantId: component.variantId,
              remaining: { $gt: 0 }
            }).sort({ purchaseDate: 1 }); // FIFO - oldest first

            const purchasesUsed: PurchaseUsage[] = [];
            let remainingToDeduct = requiredQty;
            
            for (const purchase of purchases) {
              if (remainingToDeduct <= 0) break;
              
              const deductQty = Math.min(purchase.remaining, remainingToDeduct);
              
              // Track this purchase usage
              purchasesUsed.push({
                purchaseId: purchase.purchaseId,
                quantity: deductQty,
                unitCost: purchase.unitPrice,
                totalCost: deductQty * purchase.unitPrice
              });
              
              // Track for rollback
              deductionsToRollback.push({
                purchaseId: purchase.purchaseId,
                quantity: deductQty
              });
              
              // Deduct from purchase
              purchase.remaining -= deductQty;
              await purchase.save();
              remainingToDeduct -= deductQty;
            }

            if (remainingToDeduct > 0) {
              throw new Error(
                `Insufficient stock for component ${productName} (${sku}). ` +
                `Needed: ${requiredQty}, Short by: ${remainingToDeduct}`
              );
            }

            // Add component breakdown with actual purchases used
            componentBreakdown.push({
              productId: component.productId,
              variantId: component.variantId,
              productName,
              sku,
              purchases: purchasesUsed
            });
          }

          // Add to actual deductions
          actualDeductions.push({
            itemIndex,
            isVirtualProduct: true,
            virtualProductId: item.virtualProductId,
            componentBreakdown
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Virtual product ${item.virtualProductId}: ${errorMessage}`);
          // Trigger rollback by throwing
          throw new Error(`Failed to deduct stock for virtual product: ${errorMessage}`);
        }
      }
      // Handle regular products
      else if (item.purchaseId) {
        try {
          const purchase = await PurchaseModel.findOne({ purchaseId: item.purchaseId });

          if (!purchase) {
            throw new Error(`Purchase ${item.purchaseId} not found`);
          }

          if (purchase.remaining < item.quantity) {
            throw new Error(
              `Insufficient stock in purchase ${item.purchaseId}. ` +
              `Available: ${purchase.remaining}, Requested: ${item.quantity}`
            );
          }

          // Track regular purchase usage
          const regularPurchases: PurchaseUsage[] = [{
            purchaseId: purchase.purchaseId,
            quantity: item.quantity,
            unitCost: purchase.unitPrice,
            totalCost: item.quantity * purchase.unitPrice
          }];

          // Track for rollback
          deductionsToRollback.push({
            purchaseId: purchase.purchaseId,
            quantity: item.quantity
          });

          // Deduct the quantity
          purchase.remaining -= item.quantity;
          await purchase.save();

          // Add to actual deductions
          actualDeductions.push({
            itemIndex,
            isVirtualProduct: false,
            productId: item.productId,
            variantId: item.variantId,
            regularPurchases
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${item.purchaseId}: ${errorMessage}`);
          // Trigger rollback by throwing
          throw new Error(`Failed to deduct stock for regular product: ${errorMessage}`);
        }
      }
      // Skip items without purchase ID or virtual product ID (manual entries)
    }

    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/virtual-products');

    return {
      success: true,
      errors: [],
      actualDeductions
    };

  } catch (error) {
    // Rollback all deductions made so far
    console.error('Stock deduction failed, rolling back...', error);
    
    for (const deduction of deductionsToRollback) {
      try {
        const purchase = await PurchaseModel.findOne({ purchaseId: deduction.purchaseId });
        if (purchase) {
          purchase.remaining = Math.min(purchase.remaining + deduction.quantity, purchase.quantity);
          await purchase.save();
        }
      } catch (rollbackError) {
        console.error(`Failed to rollback purchase ${deduction.purchaseId}:`, rollbackError);
      }
    }

    return {
      success: false,
      errors: errors.length > 0 ? errors : ['Stock deduction failed and was rolled back'],
      actualDeductions: []
    };
  }
}

/**
 * Restore stock for multiple items (used when deleting/cancelling invoice)
 * Handles both regular products and virtual products
 * @param items - Array of items with purchaseId, quantity, and virtual product info
 * @param skipRevalidation - Skip revalidatePath calls (for use during server component render)
 */
export async function restoreStockForInvoice(
  items: Array<{ 
    purchaseId?: string; 
    quantity: number;
    isVirtualProduct?: boolean;
    virtualProductId?: string;
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
  }>,
  skipRevalidation = false
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    // Handle virtual products
    if (item.isVirtualProduct && item.virtualProductId) {
      try {
        // If we have componentBreakdown, use it to restore exact purchases
        if (item.componentBreakdown && item.componentBreakdown.length > 0) {
          for (const component of item.componentBreakdown) {
            try {
              const purchase = await PurchaseModel.findOne({ purchaseId: component.purchaseId });
              
              if (!purchase) {
                errors.push(`Purchase ${component.purchaseId} not found for restoration`);
                continue;
              }

              // Restore the exact quantity that was deducted
              purchase.remaining += component.quantity;
              await purchase.save();
            } catch (error) {
              errors.push(`Failed to restore purchase ${component.purchaseId}: ${(error as Error).message}`);
            }
          }
        } else {
          // Fallback: Use virtual product definition (old invoices without componentBreakdown)
          const VirtualProductModel = (await import('@/models/VirtualProduct')).default;
          
          await dbConnect();
          
          const virtualProduct = await VirtualProductModel.findById(item.virtualProductId).lean();
          if (!virtualProduct) {
            errors.push(`Virtual product ${item.virtualProductId} not found`);
            continue;
          }

          // Restore stock for each component using LIFO
          for (const component of (virtualProduct as unknown as VirtualProduct).components) {
            const restoreQty = component.quantity * item.quantity;
            
            // Find purchases for this component variant (most recent first for restoration)
            const purchases = await PurchaseModel.find({
              productId: component.productId,
              variantId: component.variantId
            }).sort({ purchaseDate: -1 }); // LIFO for restoration

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
        }
      } catch (error) {
        errors.push(`Virtual product ${item.virtualProductId}: ${(error as Error).message}`);
      }
    }
    // Handle regular products
    else if (item.purchaseId) {
      try {
        await restorePurchaseStock(item.purchaseId, item.quantity, skipRevalidation);
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
