'use server';

import dbConnect from '@/lib/db';
import VirtualProductModel from '@/models/VirtualProduct';
import ProductModel from '@/models/Product';
import PurchaseModel from '@/models/Purchase';
import { revalidatePath } from 'next/cache';
import type { VirtualProduct, EnhancedVirtualProduct } from '../types';

export const createVirtualProduct = async (data: Omit<VirtualProduct, '_id' | 'createdAt' | 'updatedAt'>) => {
  try {
    await dbConnect();

    // Validate that all components exist
    for (const component of data.components) {
      const product = await ProductModel.findById(component.productId);
      if (!product) {
        throw new Error(`Product with ID ${component.productId} not found`);
      }
      
      const variant = product.variants.find((v: { id: string }) => v.id === component.variantId);
      if (!variant) {
        throw new Error(`Variant with ID ${component.variantId} not found`);
      }
    }

    await VirtualProductModel.create(data);
    
    revalidatePath('/virtual-products');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error('Error creating virtual product:', error);
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('E11000')) {
        throw new Error('A virtual product with this SKU already exists');
      }
      throw new Error(error.message);
    }
    throw new Error('Failed to create virtual product');
  }
};

export const getVirtualProducts = async (): Promise<EnhancedVirtualProduct[]> => {
  try {
    await dbConnect();

    const virtualProducts = await VirtualProductModel.find({}).lean();
    
    // Get all products and purchases for stock calculation
    const products = await ProductModel.find({}).lean();
    const purchases = await PurchaseModel.find({}).lean();

    // Create a map for quick product/variant lookup
    const productMap = new Map();
    products.forEach((product: any) => {
      product.variants?.forEach((variant: any) => {
        productMap.set(`${product._id.toString()}-${variant.id}`, {
          productName: product.name,
          sku: variant.sku,
          image: variant.image || variant.imageFile?.cloudinaryUrl,
          variant
        });
      });
    });

    // Create a map for stock calculation from purchases
    const stockMap = new Map<string, number>();
    const fifoCostMap = new Map<string, number>(); // FIFO cost per component (oldest purchase)
    
    // Group purchases by variant and sort by date (FIFO)
    const purchasesByVariant = new Map<string, any[]>();
    purchases.forEach((purchase: any) => {
      const key = `${purchase.productId.toString()}-${purchase.variantId}`;
      if (!purchasesByVariant.has(key)) {
        purchasesByVariant.set(key, []);
      }
      purchasesByVariant.get(key)!.push(purchase);
    });
    
    // For each variant, sort by purchase date and get FIFO cost
    purchasesByVariant.forEach((variantPurchases, key) => {
      // Sort by purchase date (oldest first)
      variantPurchases.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
      
      // Calculate total stock
      const totalStock = variantPurchases.reduce((sum, p) => sum + (p.remaining || 0), 0);
      stockMap.set(key, totalStock);
      
      // Get FIFO cost (from oldest purchase with stock)
      const oldestPurchaseWithStock = variantPurchases.find(p => p.remaining > 0);
      if (oldestPurchaseWithStock) {
        fifoCostMap.set(key, oldestPurchaseWithStock.unitPrice);
      }
    });

    // Enhance virtual products with component details and calculate available quantity
    const enhanced: EnhancedVirtualProduct[] = virtualProducts.map((vp: any) => {
      const enhancedComponents = vp.components.map((comp: any) => {
        const key = `${comp.productId}-${comp.variantId}`;
        const productData = productMap.get(key);
        const availableStock = stockMap.get(key) || 0;

        return {
          productId: comp.productId,
          variantId: comp.variantId,
          quantity: comp.quantity,
          productName: productData?.productName || 'Unknown Product',
          sku: productData?.sku || 'N/A',
          image: productData?.image,
          availableStock
        };
      });

      // Calculate how many virtual products can be made
      // Based on minimum available quantity considering component requirements
      const availableQuantity = enhancedComponents.reduce((min, comp) => {
        const possibleQty = Math.floor(comp.availableStock / comp.quantity);
        return Math.min(min, possibleQty);
      }, Infinity);

      // Calculate estimated component cost using FIFO purchase prices
      const estimatedComponentCost = vp.components.reduce((sum: number, comp: any) => {
        const key = `${comp.productId}-${comp.variantId}`;
        const fifoCost = fifoCostMap.get(key) || 0;
        return sum + (fifoCost * comp.quantity);
      }, 0);

      // Calculate total custom expenses
      const totalCustomExpenses = (vp.customExpenses || []).reduce((sum: number, exp: any) => sum + exp.amount, 0);

      // Calculate estimated total cost and profit
      const estimatedTotalCost = estimatedComponentCost + totalCustomExpenses;
      const estimatedProfit = vp.basePrice - estimatedTotalCost;

      return {
        _id: vp._id.toString(),
        id: vp._id.toString(),
        name: vp.name,
        sku: vp.sku,
        description: vp.description || '',
        components: enhancedComponents,
        customExpenses: vp.customExpenses || [],
        basePrice: vp.basePrice,
        categories: vp.categories || [],
        disabled: vp.disabled || false,
        createdAt: vp.createdAt ? new Date(vp.createdAt).toISOString() : undefined,
        updatedAt: vp.updatedAt ? new Date(vp.updatedAt).toISOString() : undefined,
        availableQuantity: availableQuantity === Infinity ? 0 : availableQuantity,
        estimatedComponentCost,
        totalCustomExpenses,
        estimatedTotalCost,
        estimatedProfit
      };
    });

    return JSON.parse(JSON.stringify(enhanced));
  } catch (error) {
    console.error('Error fetching virtual products:', error);
    throw new Error('Failed to fetch virtual products');
  }
};

export const getVirtualProductById = async (id: string): Promise<EnhancedVirtualProduct | null> => {
  try {
    await dbConnect();

    const virtualProduct = await VirtualProductModel.findById(id).lean();
    if (!virtualProduct) return null;

    // Get all products and purchases for stock calculation
    const products = await ProductModel.find({}).lean();
    const purchases = await PurchaseModel.find({}).lean();

    // Create maps
    const productMap = new Map();
    products.forEach((product: any) => {
      product.variants?.forEach((variant: any) => {
        productMap.set(`${product._id.toString()}-${variant.id}`, {
          productName: product.name,
          sku: variant.sku,
          image: variant.image || variant.imageFile?.cloudinaryUrl
        });
      });
    });

    const stockMap = new Map<string, number>();
    const fifoCostMap = new Map<string, number>();
    
    // Group purchases by variant and sort by date (FIFO)
    const purchasesByVariant = new Map<string, any[]>();
    purchases.forEach((purchase: any) => {
      const key = `${purchase.productId.toString()}-${purchase.variantId}`;
      if (!purchasesByVariant.has(key)) {
        purchasesByVariant.set(key, []);
      }
      purchasesByVariant.get(key)!.push(purchase);
    });
    
    // For each variant, sort by purchase date and get FIFO cost
    purchasesByVariant.forEach((variantPurchases, key) => {
      // Sort by purchase date (oldest first)
      variantPurchases.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
      
      // Calculate total stock
      const totalStock = variantPurchases.reduce((sum, p) => sum + (p.remaining || 0), 0);
      stockMap.set(key, totalStock);
      
      // Get FIFO cost (from oldest purchase with stock)
      const oldestPurchaseWithStock = variantPurchases.find(p => p.remaining > 0);
      if (oldestPurchaseWithStock) {
        fifoCostMap.set(key, oldestPurchaseWithStock.unitPrice);
      }
    });

    // Enhance components
    const enhancedComponents = (virtualProduct as any).components.map((comp: any) => {
      const key = `${comp.productId}-${comp.variantId}`;
      const productData = productMap.get(key);
      const availableStock = stockMap.get(key) || 0;

      return {
        productId: comp.productId,
        variantId: comp.variantId,
        quantity: comp.quantity,
        productName: productData?.productName || 'Unknown Product',
        sku: productData?.sku || 'N/A',
        image: productData?.image,
        availableStock
      };
    });

    const availableQuantity = enhancedComponents.reduce((min, comp) => {
      const possibleQty = Math.floor(comp.availableStock / comp.quantity);
      return Math.min(min, possibleQty);
    }, Infinity);

    // Calculate estimated costs using FIFO
    const estimatedComponentCost = (virtualProduct as any).components.reduce((sum: number, comp: any) => {
      const key = `${comp.productId}-${comp.variantId}`;
      const fifoCost = fifoCostMap.get(key) || 0;
      return sum + (fifoCost * comp.quantity);
    }, 0);

    const totalCustomExpenses = ((virtualProduct as any).customExpenses || []).reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const estimatedTotalCost = estimatedComponentCost + totalCustomExpenses;
    const estimatedProfit = (virtualProduct as any).basePrice - estimatedTotalCost;

    const vp = virtualProduct as any;
    const result = {
      _id: vp._id.toString(),
      id: vp._id.toString(),
      name: vp.name,
      sku: vp.sku,
      description: vp.description || '',
      components: enhancedComponents,
      customExpenses: vp.customExpenses || [],
      basePrice: vp.basePrice,
      categories: vp.categories || [],
      disabled: vp.disabled || false,
      createdAt: vp.createdAt ? new Date(vp.createdAt).toISOString() : undefined,
      updatedAt: vp.updatedAt ? new Date(vp.updatedAt).toISOString() : undefined,
      availableQuantity: availableQuantity === Infinity ? 0 : availableQuantity,
      estimatedComponentCost,
      totalCustomExpenses,
      estimatedTotalCost,
      estimatedProfit
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching virtual product:', error);
    return null;
  }
};

export const updateVirtualProduct = async (
  id: string,
  data: Omit<VirtualProduct, '_id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    await dbConnect();

    // Validate that all components exist
    for (const component of data.components) {
      const product = await ProductModel.findById(component.productId);
      if (!product) {
        throw new Error(`Product with ID ${component.productId} not found`);
      }
      
      const variant = product.variants.find((v: { id: string }) => v.id === component.variantId);
      if (!variant) {
        throw new Error(`Variant with ID ${component.variantId} not found`);
      }
    }

    const updated = await VirtualProductModel.findByIdAndUpdate(id, data, { new: true });
    
    if (!updated) {
      throw new Error('Virtual product not found');
    }

    revalidatePath('/virtual-products');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error('Error updating virtual product:', error);
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('E11000')) {
        throw new Error('A virtual product with this SKU already exists');
      }
      throw new Error(error.message);
    }
    throw new Error('Failed to update virtual product');
  }
};

export const deleteVirtualProduct = async (id: string) => {
  try {
    await dbConnect();

    // Check if used in any invoices
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const usedInInvoice = await InvoiceModel.findOne({
      'items.virtualProductId': id,
      type: 'invoice',
      status: { $nin: ['cancelled', 'draft'] }
    });

    if (usedInInvoice) {
      throw new Error('Cannot delete virtual product that has been used in invoices. Please disable it instead.');
    }

    await VirtualProductModel.findByIdAndDelete(id);
    
    revalidatePath('/virtual-products');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error('Error deleting virtual product:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to delete virtual product');
  }
};

export const toggleVirtualProductDisabled = async (id: string) => {
  try {
    await dbConnect();

    const virtualProduct = await VirtualProductModel.findById(id);
    if (!virtualProduct) {
      throw new Error('Virtual product not found');
    }

    virtualProduct.disabled = !virtualProduct.disabled;
    await virtualProduct.save();

    revalidatePath('/virtual-products');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
    
    return { disabled: virtualProduct.disabled };
  } catch (error) {
    console.error('Error toggling virtual product:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to toggle virtual product status');
  }
};
