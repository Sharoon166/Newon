'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';

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
 * @param items - Array of items with purchaseId and quantity
 */
export async function deductStockForInvoice(
  items: Array<{ purchaseId?: string; quantity: number }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    if (!item.purchaseId) {
      // Skip items without purchase ID (manual entries)
      continue;
    }

    try {
      await deductPurchaseStock(item.purchaseId, item.quantity);
    } catch (error) {
      errors.push(`${item.purchaseId}: ${(error as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Restore stock for multiple items (used when deleting/cancelling invoice)
 * @param items - Array of items with purchaseId and quantity
 */
export async function restoreStockForInvoice(
  items: Array<{ purchaseId?: string; quantity: number }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    if (!item.purchaseId) {
      // Skip items without purchase ID (manual entries)
      continue;
    }

    try {
      await restorePurchaseStock(item.purchaseId, item.quantity);
    } catch (error) {
      errors.push(`${item.purchaseId}: ${(error as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}
