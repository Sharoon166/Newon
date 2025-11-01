'use server';

import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import type { CreatePurchaseDto, UpdatePurchaseDto } from '../types';

// Type for lean purchase document from MongoDB
type LeanPurchase = {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId: string;
  supplier: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  purchaseDate: Date;
  remaining: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
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
  const product = await ProductModel.findById(productObjectId).lean() as { variants?: Array<{ id: string }> } | null;
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
    productId: productObjectId,
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

  const purchases = await PurchaseModel.find(purchasesQuery)
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean() as LeanPurchase[];

  
  return purchases.map((purchase) => {
    return {
      ...purchase,
      id: purchase._id.toString(),
      productId: purchase.productId.toString(),
      variantId: purchase.variantId,
      _id: undefined,
      __v: undefined,
    };
  });
};

// Keep backward compatibility - get all purchases for a product
export const getPurchasesByProductId = async (productId: string) => {
  await dbConnect();
  
  const purchases = await PurchaseModel.find({ productId: new mongoose.Types.ObjectId(productId) })
    .sort({ purchaseDate: -1 }) // Sort by date descending
    .lean() as LeanPurchase[];
  
  return purchases.map((purchase) => {
    return {
      ...purchase,
      id: purchase._id.toString(),
      productId: purchase.productId.toString(),
      variantId: purchase.variantId,
      _id: undefined,
      __v: undefined,
    };
  });
};

export const getPurchaseById = async (id: string) => {
  await dbConnect();
  
  const purchase = await PurchaseModel.findById(id).lean() as LeanPurchase | null;
  
  if (!purchase) {
    return null;
  }
  
  return {
    ...purchase,
    id: purchase._id.toString(),
    productId: purchase.productId.toString(),
    variantId: purchase.variantId,
    _id: undefined,
    __v: undefined,
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
    remaining: data.quantity,
  });
  
  // If locationId is provided, update the variant inventory for that location
  if (data.locationId) {
    const product = await ProductModel.findById(data.productId);
    if (product && product.variants) {
      const variantIndex = product.variants.findIndex(v => v.id === data.variantId);
      if (variantIndex >= 0) {
        const variant = product.variants[variantIndex];
        const inventory = Array.isArray(variant.inventory) ? variant.inventory : [];
        
        // Find or create inventory entry for this location
        const locationInventoryIndex = inventory.findIndex(
          inv => inv.locationId === data.locationId
        );
        
        if (locationInventoryIndex >= 0) {
          // Update existing inventory entry
          inventory[locationInventoryIndex].availableStock += data.quantity;
        } else {
          // Add new inventory entry
          inventory.push({
            locationId: data.locationId,
            availableStock: data.quantity,
            backorderStock: 0
          });
        }
        
        // Update variant inventory
        variant.inventory = inventory;
        
        // Update legacy fields for backward compatibility
        const totalAvailable = inventory.reduce((sum, inv) => sum + (inv.availableStock || 0), 0);
        const totalBackorder = inventory.reduce((sum, inv) => sum + (inv.backorderStock || 0), 0);
        variant.availableStock = totalAvailable;
        variant.stockOnBackorder = totalBackorder;
        
        // Mark variants as modified
        product.markModified('variants');
        await product.save();
      }
    }
  }
  
  revalidatePath(`/inventory/${data.productId}/edit`);
  revalidatePath(`/inventory/${data.productId}`);
  revalidatePath('/inventory');
  
  const purchaseObj = newPurchase.toObject();
  return {
    ...purchaseObj,
    id: purchaseObj._id.toString(),
    productId: purchaseObj.productId.toString(),
    variantId: purchaseObj.variantId,
    _id: undefined,
    __v: undefined,
  };
};

export const updatePurchase = async (id: string, data: UpdatePurchaseDto) => {
  await dbConnect();
  
  // If quantity or unitPrice is being updated, recalculate totalCost
  const purchase = await PurchaseModel.findById(id);
  if (!purchase) {
    throw new Error('PurchaseModel not found');
  }
  
  // Validate that remaining doesn't exceed quantity
  if (data.remaining !== undefined) {
    const quantity = data.quantity ?? purchase.quantity;
    if (data.remaining > quantity) {
      throw new Error(`Remaining quantity (${data.remaining}) cannot exceed the original quantity (${quantity})`);
    }
  }
  
  // If quantity is being updated, ensure remaining doesn't exceed new quantity
  if (data.quantity !== undefined) {
    const remaining = data.remaining ?? purchase.remaining;
    if (remaining > data.quantity) {
      throw new Error(`Remaining quantity (${remaining}) cannot exceed the new quantity (${data.quantity}). Please update remaining first.`);
    }
  }
  
  const updateData: Partial<UpdatePurchaseDto & { totalCost?: number }> = { ...data };
  
  // Recalculate totalCost if quantity or unitPrice is updated
  if (data.quantity !== undefined || data.unitPrice !== undefined) {
    const quantity = data.quantity ?? purchase.quantity;
    const unitPrice = data.unitPrice ?? purchase.unitPrice;
    updateData.totalCost = quantity * unitPrice;
  }
  
  const updatedPurchase = await PurchaseModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean() as LeanPurchase | null;
  
  if (!updatedPurchase) {
    throw new Error('PurchaseModel not found');
  }
  
  const productId = updatedPurchase.productId.toString();
  
  revalidatePath(`/inventory/${productId}/edit`);
  revalidatePath('/inventory');
  
  return {
    ...updatedPurchase,
    id: updatedPurchase._id.toString(),
    productId: updatedPurchase.productId.toString(),
    variantId: updatedPurchase.variantId,
    _id: undefined,
    __v: undefined,
  };
};

export const deletePurchase = async (id: string) => {
  await dbConnect();
  
  const purchase = await PurchaseModel.findById(id).lean() as LeanPurchase | null;
  if (!purchase) {
    throw new Error('PurchaseModel not found');
  }
  
  const productId = purchase.productId.toString();
  
  await PurchaseModel.deleteOne({ _id: id });
  
  revalidatePath(`/inventory/${productId}/edit`);
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
  
  return result[0] || {
    totalPurchased: 0,
    totalCost: 0,
    purchaseHistory: []
  };
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
  
  return result[0] || {
    totalPurchased: 0,
    totalCost: 0,
    purchaseHistory: []
  };
};

