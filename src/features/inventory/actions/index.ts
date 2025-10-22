'use server';

import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';
import type { EnhancedVariants } from '../types';
import { revalidatePath } from 'next/cache';

type Product = {
  _id?: string;
  name: string;
  supplier: string;
  categories: string[];
  location?: string;
  attributes: {
    id: string;
    name: string;
    values: string[];
    isRequired: boolean;
    order: number;
  }[];
  variants: {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    purchasePrice: number;
    retailPrice: number;
    wholesalePrice: number;
    shippingCost: number;
    availableStock: number;
    stockOnBackorder: number;
    image?: string | undefined;
  }[];
  description?: string | undefined;
};

export const createProduct = async (product: Product) => {
  await dbConnect();
  await ProductModel.create(product);
  revalidatePath('/inventory');
};

export const getProducts = async (): Promise<EnhancedVariants[]> => {
  await dbConnect();

  const data = await ProductModel.aggregate([
    // 1️⃣ Unwind variants — creates one document per variant
    { $unwind: '$variants' },

    // 2️⃣ Project both product-level and variant-level fields
    {
      $project: {
        _id: 0, // exclude MongoDB’s default _id
        productId: '$_id',
        productName: '$name',
        supplier: '$supplier',
        categories: '$categories',
        description: '$description',
        location: '$location',

        // Variant fields
        id: '$variants.id',
        sku: '$variants.sku',
        attributes: '$variants.attributes',
        image: '$variants.image',
        imageFile: '$variants.imageFile',
        purchasePrice: '$variants.purchasePrice',
        retailPrice: '$variants.retailPrice',
        wholesalePrice: '$variants.wholesalePrice',
        shippingCost: '$variants.shippingCost',
        availableStock: '$variants.availableStock',
        stockOnBackorder: '$variants.stockOnBackorder'
      }
    }
  ]);


  return data as EnhancedVariants[];
};

export const deleteProduct = async (id: string) => {
  await dbConnect();
  await ProductModel.deleteOne({ _id: id });
  revalidatePath('/inventory');
};

interface DeleteVariantResult {
  success: boolean;
  message: string;
  product?: {
    _id: string;
    name: string;
    variants: Array<{
      _id: string;
      sku: string;
      // Add other variant properties as needed
    }>;
  };
  error?: string;
}

export const deleteProductVariant = async (variantId: string): Promise<DeleteVariantResult> => {
  try {
    await dbConnect();

    // Find the product containing the variant
    const product = await ProductModel.findOne({ 'variants._id': variantId });

    if (!product) {
      return {
        success: false,
        message: 'Variant not found'
      };
    }

    // Prevent deletion if it's the last variant
    if (product.variants.length === 1) {
      return {
        success: false,
        message: 'Cannot delete the last variant. Please delete the product instead.'
      };
    }

    // Delete the variant using $pull
    const result = await ProductModel.updateOne(
      { 'variants._id': variantId },
      { $pull: { variants: { _id: variantId } } }
    );

    if (result.modifiedCount === 0) {
      return {
        success: false,
        message: 'Failed to delete variant. Variant may have already been deleted.'
      };
    }

    revalidatePath('/inventory');

    return {
      success: true,
      message: 'Variant deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting variant:', error);
    return {
      success: false,
      message: 'An error occurred while deleting the variant',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteProductByName = async (name: string) => {
  await dbConnect();
  await ProductModel.deleteOne({ name });
  revalidatePath('/inventory');
};

export const updateProduct = async (id: string, data: Product) => {
  await dbConnect();
  // First find the product to ensure it exists
  const product = await ProductModel.findById(id);
  if (!product) {
    throw new Error('Product not found');
  }

  // Update the product fields
  Object.assign(product, data);

  // Save with validation
  const updatedProduct = await product.save();

  revalidatePath('/inventory');
  return updatedProduct;
};

export const getProductById = async (id: string) => {
  await dbConnect();
  const product = await ProductModel.findById(id).lean();
  if (!product) return null;
  // Convert _id to string for serialization
  return product as unknown as Product;
};
