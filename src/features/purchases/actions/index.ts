'use server';

import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import type { CreatePurchaseDto, UpdatePurchaseDto } from '../types';
import type { LocationInventory, ProductVariant } from '@/features/inventory/types';

// Type for lean purchase document from MongoDB
export type LeanPurchase = {
  _id: mongoose.Types.ObjectId;
  purchaseId: string;
  productId: mongoose.Types.ObjectId;
  variantId: string;
  supplier: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  totalCost: number;
  purchaseDate: Date;
  remaining: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

export const getAllPurchases = async () => {
  await dbConnect();

  const purchases = await PurchaseModel.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $sort: { purchaseDate: -1 }
    },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        productId: { $toString: '$productId' },
        variantId: 1,
        supplier: 1,
        locationId: 1,
        quantity: 1,
        unitPrice: 1,
        retailPrice: 1,
        wholesalePrice: 1,
        shippingCost: 1,
        totalCost: 1,
        purchaseDate: 1,
        remaining: 1,
        notes: 1,
        purchaseId: 1,
        createdAt: 1,
        updatedAt: 1,
        productName: '$product.name',
        productSupplier: '$product.supplier',
        variant: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$product.variants',
                as: 'variant',
                cond: { $eq: ['$$variant.id', '$variantId'] }
              }
            },
            0
          ]
        }
      }
    }
  ]);

  // Serialize dates to strings for client components
  return purchases.map(purchase => ({
    ...purchase,
    purchaseDate: purchase.purchaseDate?.toISOString() || null,
    createdAt: purchase.createdAt?.toISOString() || null,
    updatedAt: purchase.updatedAt?.toISOString() || null,
  }));
};

export const getPurchasesByVariantId = async (productId: string, variantId: string) => {
  await dbConnect();

  // Validate inputs
  if (!productId || !variantId) {
    console.warn('getPurchasesByVariantId: Missing parameters', { productId, variantId });
    return [];
  }

  // Clean variantId (remove whitespace)
  const cleanVariantId = variantId.trim();

  // Validate ObjectId format for productId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    console.error('getPurchasesByVariantId: Invalid productId format', { productId });
    return [];
  }

  const productObjectId = new mongoose.Types.ObjectId(productId);

  // Check if this is a simple product (single variant) by looking up the product
  // This helps us handle legacy purchases without variantId
  const product = (await ProductModel.findById(productObjectId).lean()) as { variants?: ProductVariant[] } | null;
  const variants = product?.variants || [];
  const isSimpleProduct = variants && Array.isArray(variants) && variants.length === 1;
  const singleVariantId = isSimpleProduct && variants[0] ? variants[0].id : null;
  const shouldIncludeLegacyPurchases = isSimpleProduct && singleVariantId === cleanVariantId;

  // Build query: match purchases with the requested variantId
  // If it's a simple product and the variantId matches, also include legacy purchases without variantId
  const purchasesQuery: {
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    $or?: Array<{ variantId: string | null | { $exists: boolean } | undefined }>;
  } = {
    productId: productObjectId
  };

  if (shouldIncludeLegacyPurchases) {
    // For simple products, include purchases without variantId (legacy)
    purchasesQuery.$or = [
      { variantId: cleanVariantId },
      { variantId: { $exists: false } },
      { variantId: null },
      { variantId: '' }
    ];
  } else {
    purchasesQuery.variantId = cleanVariantId;
  }

  const purchases = (await PurchaseModel.find(purchasesQuery)
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean()) as LeanPurchase[];

  return purchases.map(purchase => {
    return {
      ...purchase,
      id: purchase._id.toString(),
      purchaseId: purchase.purchaseId,
      productId: purchase.productId.toString(),
      variantId: purchase.variantId,
      _id: undefined,
      __v: undefined
    };
  });
};

// Keep backward compatibility - get all purchases for a product
export const getPurchasesByProductId = async (productId: string) => {
  await dbConnect();

  const purchases = (await PurchaseModel.find({ productId: new mongoose.Types.ObjectId(productId) })
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean()) as LeanPurchase[];

  return purchases.map(purchase => {
    return {
      ...purchase,
      id: purchase._id.toString(),
      purchaseId: purchase.purchaseId,
      productId: purchase.productId.toString(),
      variantId: purchase.variantId,
      _id: undefined,
      __v: undefined
    };
  });
};

export const getPurchaseById = async (id: string) => {
  await dbConnect();

  const purchase = (await PurchaseModel.findById(id).lean()) as LeanPurchase | null;

  if (!purchase) {
    return null;
  }

  return {
    ...purchase,
    id: purchase._id.toString(),
    purchaseId: purchase.purchaseId,
    productId: purchase.productId.toString(),
    variantId: purchase.variantId,
    _id: undefined,
    __v: undefined
  };
};

export const createPurchase = async (data: CreatePurchaseDto) => {
  await dbConnect();

  // Calculate totalCost
  const totalCost = data.quantity * data.unitPrice;

  const newPurchase = await PurchaseModel.create({
    ...data,
    productId: new mongoose.Types.ObjectId(data.productId),
    variantId: data.variantId,
    totalCost,
    purchaseDate: data.purchaseDate || new Date(),
    // remaining will be set to quantity by the pre-save hook, but we can set it explicitly here too
    remaining: data.quantity
  });

  // Update the variant inventory for the selected location
  const product = await ProductModel.findById(data.productId);
  if (product && product.variants) {
    const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === data.variantId);
    if (variantIndex >= 0) {
      const variant = product.variants[variantIndex];
      const inventory: LocationInventory[] = Array.isArray(variant.inventory) ? variant.inventory : [];

      if (data.locationId) {
        // Update specific location inventory
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === data.locationId
        );

        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry
          const oldStock = inventory[locationInventoryIndex].availableStock;
          inventory[locationInventoryIndex].availableStock += data.quantity;
          console.log(
            `Updated inventory for location ${data.locationId}: ${oldStock} + ${data.quantity} = ${inventory[locationInventoryIndex].availableStock}`
          );
        } else {
          // Add new inventory entry for this location
          inventory.push({
            locationId: data.locationId,
            availableStock: data.quantity,
            backorderStock: 0
          });
        }
      } else {
        // If no location specified, add to the first available location or create a default one
        if (inventory.length > 0) {
          const firstLocation = inventory[0];
          const oldStock = firstLocation.availableStock;
          firstLocation.availableStock += data.quantity;
          console.log(
            `No location specified, added to first location: ${oldStock} + ${data.quantity} = ${firstLocation.availableStock}`
          );
        } else {
          // Create a default inventory entry
          inventory.push({
            locationId: 'default',
            availableStock: data.quantity,
            backorderStock: 0
          });
        }
      }

      // Update variant inventory
      variant.inventory = inventory;

      // Update legacy fields for backward compatibility
      const totalAvailable = inventory.reduce(
        (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
        0
      );
      const totalBackorder = inventory.reduce(
        (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
        0
      );
      variant.availableStock = totalAvailable;
      variant.stockOnBackorder = totalBackorder;

      // Mark variants as modified and save
      product.markModified('variants');
      await product.save();
    } else {
      console.error(`Variant ${data.variantId} not found in product ${data.productId}`);
    }
  } else {
    console.error(`Product ${data.productId} not found or has no variants`);
  }

  revalidatePath(`/inventory/${data.productId}/edit`);
  revalidatePath(`/inventory/${data.productId}`);
  revalidatePath('/inventory');
  revalidatePath('/purchases');

  const purchaseObj = newPurchase.toObject();
  return {
    ...purchaseObj,
    id: purchaseObj._id.toString(),
    purchaseId: purchaseObj.purchaseId,
    productId: purchaseObj.productId.toString(),
    variantId: purchaseObj.variantId,
    _id: undefined,
    __v: undefined
  };
};

export const updatePurchase = async (id: string, data: UpdatePurchaseDto) => {
  await dbConnect();

  // If quantity or unitPrice is being updated, recalculate totalCost
  const purchase = await PurchaseModel.findById(id);
  if (!purchase) {
    throw new Error('PurchaseModel not found');
  }

  // Calculate new remaining if quantity is being updated and remaining is not explicitly provided
  let calculatedRemaining = data.remaining;
  if (data.quantity !== undefined && data.remaining === undefined) {
    const oldQuantity = purchase.quantity;
    const newQuantity = data.quantity;
    const oldRemaining = purchase.remaining;

    if (newQuantity > oldQuantity) {
      // Quantity increased - add the difference to remaining
      const quantityIncrease = newQuantity - oldQuantity;
      calculatedRemaining = oldRemaining + quantityIncrease;
    } else if (newQuantity < oldQuantity) {
      // Quantity decreased - adjust remaining proportionally
      const ratio = newQuantity / oldQuantity;
      calculatedRemaining = Math.min(Math.floor(oldRemaining * ratio), newQuantity);
    } else {
      calculatedRemaining = oldRemaining;
    }
  }

  // Validate that remaining doesn't exceed quantity (using calculated remaining)
  if (data.remaining !== undefined) {
    const quantity = data.quantity ?? purchase.quantity;
    if (data.remaining > quantity) {
      throw new Error(`Remaining quantity (${data.remaining}) cannot exceed the quantity (${quantity})`);
    }
  }

  // Validate calculated remaining doesn't exceed new quantity
  if (calculatedRemaining !== undefined && data.quantity !== undefined) {
    if (calculatedRemaining > data.quantity) {
      throw new Error(
        `Calculated remaining quantity (${calculatedRemaining}) cannot exceed the new quantity (${data.quantity}). This should not happen - please report this issue.`
      );
    }
  }

  // Handle inventory updates when quantity is changed
  const quantityDiff = data.quantity !== undefined ? data.quantity - purchase.quantity : 0;

  if (quantityDiff !== 0) {
    const product = await ProductModel.findById(purchase.productId);
    if (product && product.variants) {
      const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === purchase.variantId);
      if (variantIndex >= 0) {
        const variant = product.variants[variantIndex];
        const inventory = Array.isArray(variant.inventory) ? variant.inventory : [];

        // Determine which location to update
        const targetLocationId = purchase.locationId || (inventory.length > 0 ? inventory[0].locationId : 'default');

        // Find inventory entry for this location
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === targetLocationId
        );

        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry
          const oldStock = inventory[locationInventoryIndex].availableStock;
          inventory[locationInventoryIndex].availableStock += quantityDiff;

          // Ensure it doesn't go below 0
          if (inventory[locationInventoryIndex].availableStock < 0) {
            inventory[locationInventoryIndex].availableStock = 0;
          }

        } else if (quantityDiff > 0) {
          // Add new inventory entry if quantity is increased and location doesn't exist
          inventory.push({
            locationId: targetLocationId,
            availableStock: quantityDiff,
            backorderStock: 0
          });
        }

        // Update variant inventory
        variant.inventory = inventory;

        // Update legacy fields for backward compatibility
        const oldVariantAvailable = variant.availableStock || 0;
        const totalAvailable = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
          0
        );
        const totalBackorder = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
          0
        );
        variant.availableStock = totalAvailable;
        variant.stockOnBackorder = totalBackorder;

        // Mark variants as modified
        product.markModified('variants');
        await product.save();
      }
    }
  }

  const updateData: Partial<UpdatePurchaseDto & { totalCost?: number; remaining?: number }> = { ...data };

  // Use pre-calculated remaining if quantity was updated
  if (calculatedRemaining !== undefined && data.remaining === undefined) {
    updateData.remaining = calculatedRemaining;
  }

  // Recalculate totalCost if quantity or unitPrice is updated
  if (data.quantity !== undefined || data.unitPrice !== undefined) {
    const quantity = data.quantity ?? purchase.quantity;
    const unitPrice = data.unitPrice ?? purchase.unitPrice;
    updateData.totalCost = quantity * unitPrice;
  }

  const updatedPurchase = (await PurchaseModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean()) as LeanPurchase | null;

  if (!updatedPurchase) {
    throw new Error('PurchaseModel not found');
  }

  const productId = updatedPurchase.productId.toString();

  revalidatePath(`/inventory/${productId}/edit`);
  revalidatePath(`/inventory/${productId}`);
  revalidatePath('/inventory');
  revalidatePath('/purchases');

  return {
    ...updatedPurchase,
    id: updatedPurchase._id.toString(),
    purchaseId: updatedPurchase.purchaseId,
    productId: updatedPurchase.productId.toString(),
    variantId: updatedPurchase.variantId,
    _id: undefined,
    __v: undefined
  };
};

export const deletePurchase = async (id: string) => {
  await dbConnect();

  const purchase = (await PurchaseModel.findById(id).lean()) as LeanPurchase | null;
  if (!purchase) {
    throw new Error('PurchaseModel not found');
  }

  const productId = purchase.productId.toString();

  // If locationId is provided, update the variant inventory for that location by subtracting the quantity
  if (purchase.locationId) {
    const product = await ProductModel.findById(productId);
    if (product && product.variants) {
      const variantIndex = product.variants.findIndex((v: ProductVariant) => v.id === purchase.variantId);
      if (variantIndex >= 0) {
        const variant = product.variants[variantIndex];
        const inventory: LocationInventory[] = Array.isArray(variant.inventory) ? variant.inventory : [];

        // Find inventory entry for this location
        const locationInventoryIndex = inventory.findIndex(
          (inv: LocationInventory) => inv.locationId === purchase.locationId
        );

        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry by subtracting the quantity
          inventory[locationInventoryIndex].availableStock -= purchase.quantity;
          // Ensure it doesn't go below 0
          if (inventory[locationInventoryIndex].availableStock < 0) {
            inventory[locationInventoryIndex].availableStock = 0;
          }
        }

        // Update variant inventory
        variant.inventory = inventory;

        // Update legacy fields for backward compatibility
        const totalAvailable = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.availableStock || 0),
          0
        );
        const totalBackorder = inventory.reduce(
          (sum: number, inv: LocationInventory) => sum + (inv.backorderStock || 0),
          0
        );
        variant.availableStock = totalAvailable;
        variant.stockOnBackorder = totalBackorder;

        // Mark variants as modified
        product.markModified('variants');
        await product.save();
      }
    }
  }

  await PurchaseModel.deleteOne({ _id: id });

  revalidatePath(`/inventory/${productId}/edit`);
  revalidatePath(`/inventory/${productId}`);
  revalidatePath('/inventory');
};

export const getPurchasesAggregateByVariantId = async (productId: string, variantId: string) => {
  await dbConnect();

  const result = await PurchaseModel.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        variantId: variantId
      }
    },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        purchaseHistory: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        totalPurchased: 1,
        totalCost: 1,
        purchaseHistory: {
          $map: {
            input: '$purchaseHistory',
            as: 'purchase',
            in: {
              id: { $toString: '$$purchase._id' },
              productId: { $toString: '$$purchase.productId' },
              variantId: '$$purchase.variantId',
              supplier: '$$purchase.supplier',
              locationId: '$$purchase.locationId',
              quantity: '$$purchase.quantity',
              unitPrice: '$$purchase.unitPrice',
              totalCost: '$$purchase.totalCost',
              purchaseDate: '$$purchase.purchaseDate',
              remaining: '$$purchase.remaining',
              notes: '$$purchase.notes',
              createdAt: '$$purchase.createdAt',
              updatedAt: '$$purchase.updatedAt'
            }
          }
        }
      }
    }
  ]);

  return (
    result[0] || {
      totalPurchased: 0,
      totalCost: 0,
      purchaseHistory: []
    }
  );
};

// Keep backward compatibility
export const getPurchasesAggregateByProductId = async (productId: string) => {
  await dbConnect();

  const result = await PurchaseModel.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        purchaseHistory: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        totalPurchased: 1,
        totalCost: 1,
        purchaseHistory: {
          $map: {
            input: '$purchaseHistory',
            as: 'purchase',
            in: {
              id: { $toString: '$$purchase._id' },
              productId: { $toString: '$$purchase.productId' },
              variantId: '$$purchase.variantId',
              supplier: '$$purchase.supplier',
              locationId: '$$purchase.locationId',
              quantity: '$$purchase.quantity',
              unitPrice: '$$purchase.unitPrice',
              totalCost: '$$purchase.totalCost',
              purchaseDate: '$$purchase.purchaseDate',
              remaining: '$$purchase.remaining',
              notes: '$$purchase.notes',
              createdAt: '$$purchase.createdAt',
              updatedAt: '$$purchase.updatedAt'
            }
          }
        }
      }
    }
  ]);

  return (
    result[0] || {
      totalPurchased: 0,
      totalCost: 0,
      purchaseHistory: []
    }
  );
};
