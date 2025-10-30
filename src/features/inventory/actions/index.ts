'use server';

import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';
import type { EnhancedVariants } from '../types';
import { revalidatePath } from 'next/cache';

import { ProductVariant, ProductAttribute } from '../types';

type Product = {
  _id?: string;
  name: string;
  supplier: string;
  categories: string[];
  hasVariants: boolean;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean; order: number }>;
  description?: string;
  attributes: ProductAttribute[];
  variants: (ProductVariant & {
    // Add any additional fields that might be needed for the form
    inventory: Array<{
      locationId: string;
      availableStock: number;
      backorderStock: number;
    }>;
  })[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const createProduct = async (product: Omit<Product, '_id'>) => {
  await dbConnect();
  
  // Ensure variants have the required inventory structure
  const productWithDefaults = {
    ...product,
    variants: product.variants.map(variant => ({
      ...variant,
      // Ensure inventory exists and has the correct structure
      inventory: Array.isArray(variant.inventory) 
        ? variant.inventory 
        : [],
      // Set default values if not provided
      availableStock: variant.availableStock ?? 0,
      stockOnBackorder: variant.stockOnBackorder ?? 0,
    })),
  };

  await ProductModel.create(productWithDefaults);
  revalidatePath('/inventory');
};

export const getProducts = async (): Promise<EnhancedVariants[]> => {
  await dbConnect();

  const data = await ProductModel.aggregate([
    // 1️⃣ Unwind variants — creates one document per variant
    { $unwind: '$variants' },

    // 2️⃣ Add a new field with the product's locations
    {
      $addFields: {
        'variants.locations': '$locations' // Add the locations array to each variant
      }
    },

    // 3️⃣ Project both product-level and variant-level fields
    {
      $project: {
        _id: 0, // exclude MongoDB's default _id
        productId: '$_id',
        productName: '$name',
        supplier: '$supplier',
        categories: '$categories',
        description: '$description',
        hasVariants: '$hasVariants',
        locations: '$locations', // Keep the locations array

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
        stockOnBackorder: '$variants.stockOnBackorder',
        inventory: {
          $ifNull: [
            {
              $map: {
                input: '$variants.inventory',
                as: 'inv',
                in: {
                  $mergeObjects: [
                    '$$inv',
                    {
                      // Add location details to each inventory item
                      location: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$locations',
                              as: 'loc',
                              cond: { $eq: ['$$loc.id', '$$inv.locationId'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            },
            []
          ]
        }
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

// export const updateProduct = async (id: string, data: Product) => {
//   await dbConnect();
  
//   console.log('INPUT DATA:', JSON.stringify(data, null, 2));

//   const product = await ProductModel.findById(id);
  
//   if (!product) {
//     throw new Error('Product not found');
//   }

//   // Assign all fields
//   // Object.assign(product, data);
//   product.set(data);

  
//   // Explicitly mark nested arrays as modified
//   product.markModified('variants');
//   product.markModified('locations');
  
//   await product.save();
  
//   const updatedProduct = product.toObject();
  
//   console.log('UPDATED PRODUCT:', JSON.stringify(updatedProduct, null, 2));

//   revalidatePath('/inventory');
//   revalidatePath(`/inventory/${id}/edit`);

//   return updatedProduct;
// };

export const updateProduct = async (id: string, data: Product) => {
  await dbConnect();
  
  try {
    console.log('INPUT DATA:', JSON.stringify(data, null, 2));

    // Ensure variants have the correct structure
    const updateData = {
      ...data,
      // Ensure variants is an array and has required fields
      variants: Array.isArray(data.variants) 
        ? data.variants.map(v => ({
            ...v,
            // Ensure inventory is an array of valid objects
            inventory: Array.isArray(v.inventory) 
              ? v.inventory.map(i => ({
                  locationId: i.locationId,
                  availableStock: Number(i.availableStock) || 0,
                  backorderStock: Number(i.backorderStock) || 0
                }))
              : []
          }))
        : []
    };

    // First find the product to ensure it exists
    const product = await ProductModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!product) {
      throw new Error('Product not found');
    }

    // Update the product fields
    // Object.assign(product, updateData);
    
    // // Mark nested arrays as modified
    // product.markModified('variants');
    // product.markModified('locations');

  
    
    // Save with validation
    // const updatedProduct = await product.save();
    
    // Convert to plain object
    // const result = updatedProduct.toObject();
    
    console.log('UPDATED PRODUCT:', JSON.stringify(updateProduct, null, 2));

    revalidatePath('/inventory');
    revalidatePath(`/inventory/${id}/edit`);

    return updateProduct;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const getProductById = async (id: string) => {
  await dbConnect();
  const product = await ProductModel.findById(id).lean();
  if (!product) return null;
  return product as unknown as Product;
};
