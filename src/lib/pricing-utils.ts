import { Purchase } from '@/features/purchases/types';

export interface VariantPricing {
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  unitPrice: number;
  supplier?: string;
  purchaseDate?: Date | string;
  remainingUnits?: number;
}

/**
 * Calculate pricing for a variant based on FIFO (First In, First Out) method
 * Uses the oldest purchase that still has remaining units
 */
export function calculateVariantPricing(purchases: Purchase[]): VariantPricing {
  // Default pricing when no purchases available
  const defaultPricing: VariantPricing = {
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    shippingCost: 0,
    unitPrice: 0,
    supplier: undefined,
    purchaseDate: undefined,
    remainingUnits: 0
  };

  if (!purchases || purchases.length === 0) {
    return defaultPricing;
  }

  // Filter purchases that have remaining units
  const purchasesWithRemaining = purchases.filter(p => (p.remaining || 0) > 0);

  if (purchasesWithRemaining.length === 0) {
    // If no purchases have remaining units, use the most recent purchase for pricing reference
    const mostRecent = purchases.sort((a, b) => {
      const dateA = new Date(a.purchaseDate);
      const dateB = new Date(b.purchaseDate);
      return dateB.getTime() - dateA.getTime();
    })[0];

    return {
      purchasePrice: mostRecent.unitPrice || 0,
      retailPrice: mostRecent.retailPrice || 0,
      wholesalePrice: mostRecent.wholesalePrice || 0,
      shippingCost: mostRecent.shippingCost || 0,
      unitPrice: mostRecent.unitPrice || 0,
      supplier: mostRecent.supplier,
      purchaseDate: mostRecent.purchaseDate,
      remainingUnits: 0
    };
  }

  // Sort by purchase date (oldest first) to implement FIFO
  const sortedPurchases = purchasesWithRemaining.sort((a, b) => {
    const dateA = new Date(a.purchaseDate);
    const dateB = new Date(b.purchaseDate);
    return dateA.getTime() - dateB.getTime();
  });

  // Use the oldest purchase with remaining units
  const oldestPurchase = sortedPurchases[0];

  return {
    purchasePrice: oldestPurchase.unitPrice || 0,
    retailPrice: oldestPurchase.retailPrice || 0,
    wholesalePrice: oldestPurchase.wholesalePrice || 0,
    shippingCost: oldestPurchase.shippingCost || 0,
    unitPrice: oldestPurchase.unitPrice || 0,
    supplier: oldestPurchase.supplier,
    purchaseDate: oldestPurchase.purchaseDate,
    remainingUnits: oldestPurchase.remaining || 0
  };
}

/**
 * Calculate weighted average pricing across all purchases with remaining units
 * This can be used as an alternative to FIFO if needed
 */
export function calculateWeightedAveragePricing(purchases: Purchase[]): VariantPricing {
  const defaultPricing: VariantPricing = {
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    shippingCost: 0,
    unitPrice: 0,
    remainingUnits: 0
  };

  if (!purchases || purchases.length === 0) {
    return defaultPricing;
  }

  const purchasesWithRemaining = purchases.filter(p => (p.remaining || 0) > 0);

  if (purchasesWithRemaining.length === 0) {
    return defaultPricing;
  }

  let totalRemaining = 0;
  let weightedPurchasePrice = 0;
  let weightedRetailPrice = 0;
  let weightedWholesalePrice = 0;
  let weightedShippingCost = 0;

  purchasesWithRemaining.forEach(purchase => {
    const remaining = purchase.remaining || 0;
    totalRemaining += remaining;

    weightedPurchasePrice += (purchase.unitPrice || 0) * remaining;
    weightedRetailPrice += (purchase.retailPrice || 0) * remaining;
    weightedWholesalePrice += (purchase.wholesalePrice || 0) * remaining;
    weightedShippingCost += (purchase.shippingCost || 0) * remaining;
  });

  if (totalRemaining === 0) {
    return defaultPricing;
  }

  return {
    purchasePrice: weightedPurchasePrice / totalRemaining,
    retailPrice: weightedRetailPrice / totalRemaining,
    wholesalePrice: weightedWholesalePrice / totalRemaining,
    shippingCost: weightedShippingCost / totalRemaining,
    unitPrice: weightedPurchasePrice / totalRemaining,
    remainingUnits: totalRemaining
  };
}

/**
 * Get the most recent pricing (regardless of remaining units)
 * Useful for getting the latest market prices
 */
export function getLatestPricing(purchases: Purchase[]): VariantPricing {
  const defaultPricing: VariantPricing = {
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    shippingCost: 0,
    unitPrice: 0,
    remainingUnits: 0
  };

  if (!purchases || purchases.length === 0) {
    return defaultPricing;
  }

  // Sort by purchase date (newest first)
  const sortedPurchases = purchases.sort((a, b) => {
    const dateA = new Date(a.purchaseDate);
    const dateB = new Date(b.purchaseDate);
    return dateB.getTime() - dateA.getTime();
  });

  const latestPurchase = sortedPurchases[0];
  const totalRemaining = purchases.reduce((sum, p) => sum + (p.remaining || 0), 0);

  return {
    purchasePrice: latestPurchase.unitPrice || 0,
    retailPrice: latestPurchase.retailPrice || 0,
    wholesalePrice: latestPurchase.wholesalePrice || 0,
    shippingCost: latestPurchase.shippingCost || 0,
    unitPrice: latestPurchase.unitPrice || 0,
    supplier: latestPurchase.supplier,
    purchaseDate: latestPurchase.purchaseDate,
    remainingUnits: totalRemaining
  };
}
