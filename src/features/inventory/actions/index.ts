'use server';

import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';
import PurchaseModel from '@/models/Purchase';
import type { EnhancedVariants } from '../types';
import { revalidatePath } from 'next/cache';
import { calculateVariantPricing } from '@/lib/pricing-utils';
import type { Purchase } from '@/features/purchases/types';
import { ProductVariant, ProductAttribute } from '../types';

type LeanProduct = {
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

export const createProduct = async (product: Omit<LeanProduct, '_id'>) => {
  try {
    await dbConnect();

    // Ensure attributes are properly structured
    const processedAttributes = Array.isArray(product.attributes)
      ? product.attributes.map(attr => ({
          id: attr.id || `attr_${Date.now()}_${Math.random()}`,
          name: attr.name || '',
          values: Array.isArray(attr.values) ? attr.values : [],
          isRequired: Boolean(attr.isRequired),
          order: Number(attr.order) || 0
        }))
      : [];

    // Ensure variants have the required inventory structure
    const processedVariants = product.variants.map(variant => ({
      ...variant,
      // Ensure inventory exists and has the correct structure
      inventory: Array.isArray(variant.inventory) ? variant.inventory : [],
      // Set default values if not provided
      availableStock: variant.availableStock ?? 0,
      stockOnBackorder: variant.stockOnBackorder ?? 0
    }));

    const productWithDefaults = {
      ...product,
      attributes: processedAttributes,
      variants: processedVariants
    };

    console.info('Creating product with attributes:', JSON.stringify(processedAttributes, null, 2));

    await ProductModel.create(productWithDefaults);
    revalidatePath('/inventory');
    revalidatePath('/purchases');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error('Error creating product:', error);
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        throw new Error(error.message.includes('SKU') ? error.message : 'A product with this SKU already exists');
      }
      if (error.message.includes('Duplicate SKUs')) {
        throw new Error(error.message);
      }
      if (error.message.includes('validation')) {
        throw new Error('Please check all required fields are filled correctly');
      }
      throw new Error(error.message);
    }
    throw new Error('Failed to create product. Please try again.');
  }
};

export const getProducts = async (): Promise<EnhancedVariants[]> => {
  await dbConnect();

  const data = await ProductModel.aggregate([
    {
      $unwind: {
        path: '$variants',
        preserveNullAndEmptyArrays: false
      }
    },

    {
      $project: {
        _id: 0,
        productId: { $toString: '$_id' }, // Convert ObjectId to string
        productName: '$name',
        supplier: '$supplier',
        categories: '$categories',
        description: '$description',
        hasVariants: '$hasVariants',
        locations: {
          $map: {
            input: '$locations',
            as: 'loc',
            in: {
              id: '$$loc.id',
              name: '$$loc.name',
              address: '$$loc.address',
              isActive: '$$loc.isActive',
              order: '$$loc.order'
              // Exclude _id or convert it
              // If you need it: _id: { $toString: '$$loc._id' }
            }
          }
        },

        id: '$variants.id',
        sku: '$variants.sku',
        disabled: '$variants.disabled',
        attributes: '$variants.attributes',
        image: '$variants.image',
        imageFile: '$variants.imageFile',

        availableStock: '$variants.availableStock',
        stockOnBackorder: '$variants.stockOnBackorder',

        inventory: {
          $map: {
            input: { $ifNull: ['$variants.inventory', []] },
            as: 'inv',
            in: {
              $mergeObjects: [
                '$$inv',
                {
                  location: {
                    $let: {
                      vars: {
                        foundLoc: {
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
                      },
                      in: {
                        id: '$$foundLoc.id',
                        name: '$$foundLoc.name',
                        address: '$$foundLoc.address',
                        isActive: '$$foundLoc.isActive',
                        order: '$$foundLoc.order'
                        // Exclude _id
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  ]);

  // Fetch all purchases for pricing calculation
  const purchases = await PurchaseModel.find({}).lean();

  // Group purchases by productId-variantId
  const purchaseMap = new Map<string, Purchase[]>();
  (purchases as unknown[]).forEach(purchase => {
    const purchaseObj = purchase as Record<string, unknown>;
    const key = `${(purchaseObj.productId as string).toString()}-${purchaseObj.variantId as string}`;
    if (!purchaseMap.has(key)) {
      purchaseMap.set(key, []);
    }
    purchaseMap.get(key)!.push({
      ...purchaseObj,
      id: (purchaseObj._id as string).toString(),
      productId: (purchaseObj.productId as string).toString()
    } as Purchase);
  });

  // Add pricing information and calculate actual stock from purchases
  const enhancedData = data.map((variant: Record<string, unknown> & { productId: string; id: string }) => {
    const key = `${variant.productId}-${variant.id}`;
    const variantPurchases = purchaseMap.get(key) || [];
    const pricing = calculateVariantPricing(variantPurchases);

    // Calculate actual available stock from purchases (sum of remaining quantities)
    const actualAvailableStock = variantPurchases.reduce((sum, purchase) => sum + (purchase.remaining || 0), 0);
    
    // Keep the original backorder value from the variant (this is managed separately)
    const actualBackorderStock = (variant.stockOnBackorder as number) || 0;

    return {
      ...variant,
      purchasePrice: pricing.purchasePrice,
      retailPrice: pricing.retailPrice,
      wholesalePrice: pricing.wholesalePrice,
      shippingCost: pricing.shippingCost,
      unitPrice: pricing.unitPrice,
      // Override with actual stock from purchases
      availableStock: actualAvailableStock,
      stockOnBackorder: actualBackorderStock
    } as unknown as EnhancedVariants;
  });

  return enhancedData;
};

export const deleteProduct = async (id: string) => {
  await dbConnect();

  // Get the product to access variant images
  const product = await ProductModel.findById(id);

  if (!product) {
    throw new Error('Product not found');
  }

  // Check if any variant has been sold in invoices
  const InvoiceModel = (await import('@/models/Invoice')).default;
  const variantIds = product.variants.map((v: ProductVariant) => v.id);
  
  const soldVariants = await InvoiceModel.findOne({
    'items.variantId': { $in: variantIds },
    type: 'invoice',
    status: { $nin: ['cancelled', 'draft'] }
  });

  if (soldVariants) {
    throw new Error('Cannot delete product with sold variants. Please disable the variants instead.');
  }

  // Delete all variant images from Cloudinary
  const { deleteCloudinaryImage } = await import('@/app/actions/cloudinary');

  for (const variant of product.variants) {
    if (variant.imageFile?.publicId) {
      try {
        await deleteCloudinaryImage(variant.imageFile.publicId);
        console.info(`Deleted image for variant ${variant.sku}: ${variant.imageFile.publicId}`);
      } catch (error) {
        console.error(`Failed to delete image for variant ${variant.sku}:`, error);
        // Continue with deletion even if image deletion fails
      }
    }
  }

  await ProductModel.deleteOne({ _id: id });
  revalidatePath('/inventory');
  revalidatePath('/invoices');
  revalidatePath('/invoices/new');
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
  canDisable?: boolean;
}

export const toggleVariantDisabled = async (productId: string, variantId: string): Promise<DeleteVariantResult> => {
  try {
    await dbConnect();

    const product = await ProductModel.findById(productId);

    if (!product) {
      return {
        success: false,
        message: 'Product not found'
      };
    }

    const variant = product.variants.find((v: ProductVariant) => v.id === variantId);

    if (!variant) {
      return {
        success: false,
        message: 'Variant not found'
      };
    }

    // Toggle disabled status
    variant.disabled = !variant.disabled;
    product.markModified('variants');
    await product.save();

    revalidatePath('/inventory');
    revalidatePath(`/inventory/${productId}`);
    revalidatePath(`/inventory/${productId}/edit`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

    return {
      success: true,
      message: variant.disabled ? 'Variant disabled successfully' : 'Variant enabled successfully'
    };
  } catch (error) {
    console.error('Error toggling variant disabled status:', error);
    return {
      success: false,
      message: 'An error occurred while updating the variant',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deleteProductVariant = async (variantId: string): Promise<DeleteVariantResult> => {
  try {
    await dbConnect();

    // Find the product containing the variant
    const product = await ProductModel.findOne({ 'variants.id': variantId });

    if (!product) {
      return {
        success: false,
        message: 'Variant not found'
      };
    }

    // Check if variant has been sold in any invoices
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const soldInvoice = await InvoiceModel.findOne({
      'items.variantId': variantId,
      type: 'invoice',
      status: { $nin: ['cancelled', 'draft'] }
    });

    if (soldInvoice) {
      return {
        success: false,
        message: 'Cannot delete variant that has been sold. Please disable it instead.',
        canDisable: true
      };
    }

    // Check if variant has any purchases
    const PurchaseModel = (await import('@/models/Purchase')).default;
    const purchaseCount = await PurchaseModel.countDocuments({
      productId: product._id,
      variantId: variantId
    });

    if (purchaseCount > 0) {
      return {
        success: false,
        message: `Cannot delete variant with ${purchaseCount} purchase(s). Please disable it instead.`,
        canDisable: true
      };
    }

    // Prevent deletion if it's the last variant
    if (product.variants.length === 1) {
      return {
        success: false,
        message: 'Cannot delete the last variant. Please delete the product instead.'
      };
    }

    // Find the variant to delete its image from Cloudinary
    const variantToDelete = product.variants.find((v: ProductVariant) => v.id === variantId);

    // Delete variant image from Cloudinary if it exists
    if (variantToDelete?.imageFile?.publicId) {
      try {
        const { deleteCloudinaryImage } = await import('@/app/actions/cloudinary');
        await deleteCloudinaryImage(variantToDelete.imageFile.publicId);
        console.info(`Deleted image for variant ${variantToDelete.sku}: ${variantToDelete.imageFile.publicId}`);
      } catch (error) {
        console.error(`Failed to delete image for variant ${variantToDelete.sku}:`, error);
        // Continue with deletion even if image deletion fails
      }
    }

    // Delete the variant using filter
    product.variants = product.variants.filter((v: ProductVariant) => v.id !== variantId);
    product.markModified('variants');
    await product.save();

    revalidatePath('/inventory');
    revalidatePath(`/inventory/${product._id}`);
    revalidatePath(`/inventory/${product._id}/edit`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

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

  // Get the product to access variant images
  const product = await ProductModel.findOne({ name });

  if (!product) {
    throw new Error('Product not found');
  }

  // Check if any variant has been sold in invoices
  const InvoiceModel = (await import('@/models/Invoice')).default;
  const variantIds = product.variants.map((v: ProductVariant) => v.id);
  
  const soldVariants = await InvoiceModel.findOne({
    'items.variantId': { $in: variantIds },
    type: 'invoice',
    status: { $nin: ['cancelled', 'draft'] }
  });

  if (soldVariants) {
    throw new Error('Cannot delete product with sold variants. Please disable the variants instead.');
  }

  // Delete all variant images from Cloudinary
  const { deleteCloudinaryImage } = await import('@/app/actions/cloudinary');

  for (const variant of product.variants) {
    if (variant.imageFile?.publicId) {
      try {
        await deleteCloudinaryImage(variant.imageFile.publicId);
        console.info(`Deleted image for variant ${variant.sku}: ${variant.imageFile.publicId}`);
      } catch (error) {
        console.error(`Failed to delete image for variant ${variant.sku}:`, error);
        // Continue with deletion even if image deletion fails
      }
    }
  }

  await ProductModel.deleteOne({ name });
  revalidatePath('/inventory');
  revalidatePath('/invoices');
  revalidatePath('/invoices/new');
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

export const updateProduct = async (id: string, data: LeanProduct) => {
  await dbConnect();

  try {
    // Ensure attributes are properly structured
    const processedAttributes = Array.isArray(data.attributes)
      ? data.attributes.map(attr => ({
          id: attr.id || `attr_${Date.now()}_${Math.random()}`,
          name: attr.name || '',
          values: Array.isArray(attr.values) ? attr.values : [],
          isRequired: Boolean(attr.isRequired),
          order: Number(attr.order) || 0
        }))
      : [];

    // Ensure variants have the correct structure
    const processedVariants = Array.isArray(data.variants)
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
      : [];

    const updateData = {
      ...data,
      attributes: processedAttributes,
      variants: processedVariants
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

    revalidatePath('/inventory');
    revalidatePath(`/inventory/${id}/edit`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

    return updateProduct;
  } catch (error) {
    console.error('Error updating product:', error);
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        throw new Error(error.message.includes('SKU') ? error.message : 'A product with this SKU already exists');
      }
      if (error.message.includes('Duplicate SKUs')) {
        throw new Error(error.message);
      }
      if (error.message.includes('validation')) {
        throw new Error('Please check all required fields are filled correctly');
      }
      if (error.message.includes('not found')) {
        throw new Error('Product not found');
      }
      throw new Error(error.message);
    }
    throw new Error('Failed to update product. Please try again.');
  }
};

export const getProductById = async (id: string) => {
  await dbConnect();
  const product = await ProductModel.findById(id).lean();
  if (!product) return null;
  return product as unknown as LeanProduct;
};

/**
 * Get pricing information for a specific variant based on FIFO method
 */
export const getVariantPricing = async (productId: string, variantId: string) => {
  await dbConnect();

  // Get purchases for this specific variant
  const purchases = await PurchaseModel.find({
    productId: productId,
    variantId: variantId
  }).lean();

  const purchaseData = (purchases as unknown[]).map(purchase => {
    const purchaseObj = purchase as Record<string, unknown>;
    return {
      ...purchaseObj,
      id: (purchaseObj._id as string).toString(),
      productId: (purchaseObj.productId as string).toString()
    } as Purchase;
  });

  return calculateVariantPricing(purchaseData);
};

/**
 * Get enhanced product with pricing information
 */
export const getProductWithPricing = async (productId: string) => {
  await dbConnect();

  const product = await ProductModel.findById(productId).lean();
  if (!product) return null;

  // Get all purchases for this product
  const purchases = await PurchaseModel.find({ productId }).lean();

  // Group purchases by variantId
  const purchaseMap = new Map<string, Purchase[]>();
  (purchases as unknown[]).forEach(purchase => {
    const purchaseObj = purchase as Record<string, unknown>;
    const variantId = purchaseObj.variantId as string;
    if (!purchaseMap.has(variantId)) {
      purchaseMap.set(variantId, []);
    }
    purchaseMap.get(variantId)!.push({
      ...purchaseObj,
      id: (purchaseObj._id as string).toString(),
      productId: (purchaseObj.productId as string).toString()
    } as Purchase);
  });

  // Add pricing to variants
  const enhancedVariants = (
    product as Record<string, unknown> & { variants?: Array<Record<string, unknown> & { id: string }> }
  ).variants?.map((variant: Record<string, unknown> & { id: string }) => {
    const variantPurchases = purchaseMap.get(variant.id) || [];
    const pricing = calculateVariantPricing(variantPurchases);

    return {
      ...variant,
      purchasePrice: pricing.purchasePrice,
      retailPrice: pricing.retailPrice,
      wholesalePrice: pricing.wholesalePrice,
      shippingCost: pricing.shippingCost,
      unitPrice: pricing.unitPrice
    };
  });

  return {
    ...product,
    variants: enhancedVariants
  };
};
