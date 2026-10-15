'use server';

import { revalidatePath } from 'next/cache';
import type { Supplier, CreateSupplierDto, UpdateSupplierDto, SupplierFilters } from '../types';
import dbConnect from '@/lib/db';
import SupplierModel from '../../../models/Supplier';
import ProductModel from '@/models/Product';
import PurchaseModel from '@/models/Purchase';
import mongoose from 'mongoose';

// Type for lean Mongoose document - using Record for _id to handle Mongoose's FlattenMaps type
interface LeanSupplier {
  _id: Record<string, unknown>;
  supplierId?: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  disabled?: boolean;
  totalPurchased?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastPurchaseDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

// Helper function to transform lean supplier to Supplier type
function transformLeanSupplier(leanDoc: LeanSupplier): Supplier {
  return {
    ...leanDoc,
    id: String(leanDoc._id),
    _id: undefined,
    __v: undefined
  } as Supplier;
}

export async function getSuppliers(filters?: SupplierFilters & { includeDisabled?: boolean }): Promise<Supplier[]> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    // By default, exclude disabled suppliers unless explicitly requested
    if (!filters?.includeDisabled) {
      query.disabled = { $ne: true };
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.createdAt = dateQuery;
    }

    let queryBuilder = SupplierModel.find(query).sort({ supplierId: -1 });

    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    const suppliers = await queryBuilder.lean();

    return suppliers.map((supplier: unknown) => transformLeanSupplier(supplier as LeanSupplier));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw new Error('Failed to fetch suppliers');
  }
}

export async function getSupplier(id: string): Promise<Supplier> {
  try {
    await dbConnect();

    const supplier = await SupplierModel.findOne({ supplierId: id }).lean();

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return transformLeanSupplier(supplier as unknown as LeanSupplier);
  } catch (error) {
    console.error(`Error fetching supplier ${id}:`, error);
    throw new Error('Failed to fetch supplier');
  }
}

// Accepts either the generated supplierId (e.g. "SP-25-001") or the raw _id.
export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    await dbConnect();

    const bySupplierId = await SupplierModel.findOne({ supplierId: id }).lean();
    if (bySupplierId) {
      return transformLeanSupplier(bySupplierId as unknown as LeanSupplier);
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await SupplierModel.findById(id).lean();
      if (byId) {
        return transformLeanSupplier(byId as unknown as LeanSupplier);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching supplier by id ${id}:`, error);
    return null;
  }
}

// Server actions resolve to a serializable result instead of throwing, because
// errors thrown from a server action lose their message in production. The UI
// reads `error` and surfaces it directly.
export type SupplierMutationResult = { success: true; supplier: Supplier } | { success: false; error: string };

export async function createSupplier(data: CreateSupplierDto): Promise<SupplierMutationResult> {
  try {
    await dbConnect();

    const newSupplier = new SupplierModel(data);
    const savedSupplier = await newSupplier.save();

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    revalidatePath('/purchases');

    return {
      success: true,
      supplier: transformLeanSupplier(savedSupplier.toObject() as unknown as LeanSupplier)
    };
  } catch (error: unknown) {
    console.error('Error creating supplier:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create supplier' };
  }
}

export async function updateSupplier(id: string, data: UpdateSupplierDto): Promise<SupplierMutationResult> {
  try {
    await dbConnect();

    // Filter out undefined values to avoid issues with MongoDB
    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedSupplier = await SupplierModel.findOneAndUpdate(
      { supplierId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSupplier) {
      return { success: false, error: 'Supplier not found' };
    }

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    revalidatePath(`/suppliers/${id}/edit`);
    revalidatePath('/inventory');
    revalidatePath('/purchases');

    return {
      success: true,
      supplier: transformLeanSupplier(updatedSupplier as unknown as LeanSupplier)
    };
  } catch (error) {
    console.error(`Error updating supplier ${id}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update supplier' };
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    await dbConnect();

    // Never hard delete a supplier that is still linked to products or
    // purchases. This mirrors the customer rule and prevents orphaned refs.
    const [linkedProducts, linkedPurchases] = await Promise.all([
      ProductModel.countDocuments({ supplierId: id }),
      PurchaseModel.countDocuments({ supplierId: id })
    ]);

    if (linkedProducts > 0 || linkedPurchases > 0) {
      throw new Error('Cannot delete a supplier linked to products or purchases. Disable it instead.');
    }

    // Also block if the supplier has any recorded financial history.
    const result = await SupplierModel.deleteOne({
      supplierId: id,
      totalPurchased: 0,
      totalPaid: 0
    });

    if (result.deletedCount === 0) {
      throw new Error('Supplier not found');
    }

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    revalidatePath('/purchases');
  } catch (error) {
    console.error(`Error deleting supplier ${id}:`, error);
    throw new Error('Cannot delete suppliers with purchase history. Disable it instead.');
  }
}

/**
 * Toggle supplier disabled status
 */
export async function toggleSupplierDisabled(id: string): Promise<Supplier> {
  try {
    await dbConnect();

    const supplier = await SupplierModel.findOne({ supplierId: id });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const updatedSupplier = await SupplierModel.findOneAndUpdate(
      { supplierId: id },
      { $set: { disabled: !supplier.disabled } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSupplier) {
      throw new Error('Supplier not found');
    }

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);

    return transformLeanSupplier(updatedSupplier as unknown as LeanSupplier);
  } catch (error) {
    console.error(`Error toggling supplier disabled status ${id}:`, error);
    throw new Error('Failed to toggle supplier status');
  }
}

/**
 * Update supplier financial fields when a purchase is created
 */
export async function updateSupplierFinancialsOnPurchase(
  supplierId: string,
  totalAmount: number,
  purchaseDate: Date
): Promise<void> {
  try {
    await dbConnect();

    const result = await SupplierModel.findOneAndUpdate(
      { supplierId },
      {
        $inc: {
          totalPurchased: totalAmount,
          outstandingBalance: totalAmount
        },
        $set: {
          lastPurchaseDate: purchaseDate
        }
      },
      { new: true }
    );

    if (!result) {
      console.warn(`Supplier ${supplierId} not found for financial update`);
      return;
    }

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath(`/suppliers/${supplierId}/edit`);
    revalidatePath('/purchases');
  } catch (error) {
    console.error(`Error updating supplier financials for ${supplierId}:`, error);
    // Don't throw - purchase creation should succeed even if supplier update failed
  }
}

/**
 * Update supplier financial fields when a purchase payment is made
 */
export async function updateSupplierFinancialsOnPayment(
  supplierId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<void> {
  try {
    await dbConnect();

    const result = await SupplierModel.findOneAndUpdate(
      { supplierId },
      {
        $inc: {
          totalPaid: paymentAmount,
          outstandingBalance: -paymentAmount
        },
        $set: {
          lastPaymentDate: paymentDate
        }
      },
      { new: true }
    );

    if (!result) {
      console.warn(`Supplier ${supplierId} not found for financial update`);
      return;
    }

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath(`/suppliers/${supplierId}/edit`);
    revalidatePath('/purchases');
  } catch (error) {
    console.error(`Error updating supplier financials for ${supplierId}:`, error);
    // Don't throw - payment should succeed even if supplier update failed
  }
}

/**
 * Reverse supplier financial fields when a purchase is deleted
 */
export async function reverseSupplierFinancialsOnPurchaseDelete(
  supplierId: string,
  totalAmount: number,
  paidAmount: number
): Promise<void> {
  try {
    await dbConnect();

    const supplier = await SupplierModel.findOne({ supplierId });

    if (!supplier) {
      console.warn(`Supplier ${supplierId} not found for financial reversal`);
      return;
    }

    const newTotalPurchased = Math.max(0, supplier.totalPurchased - totalAmount);
    const newTotalPaid = Math.max(0, supplier.totalPaid - paidAmount);
    const newOutstandingBalance = Math.max(0, supplier.outstandingBalance - (totalAmount - paidAmount));

    await SupplierModel.findOneAndUpdate(
      { supplierId },
      {
        $set: {
          totalPurchased: newTotalPurchased,
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstandingBalance
        }
      }
    );

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath(`/suppliers/${supplierId}/edit`);
    revalidatePath('/purchases');
  } catch (error) {
    console.error(`Error reversing supplier financials for ${supplierId}:`, error);
    // Don't throw - purchase deletion should succeed even if supplier update failed
  }
}

/**
 * Reverse supplier financial fields when a purchase payment is deleted
 */
export async function reverseSupplierFinancialsOnPaymentDelete(
  supplierId: string,
  paymentAmount: number
): Promise<void> {
  try {
    await dbConnect();

    const supplier = await SupplierModel.findOne({ supplierId });

    if (!supplier) {
      console.warn(`Supplier ${supplierId} not found for payment reversal`);
      return;
    }

    const newTotalPaid = Math.max(0, supplier.totalPaid - paymentAmount);

    await SupplierModel.findOneAndUpdate(
      { supplierId },
      {
        $set: {
          totalPaid: newTotalPaid
        },
        $inc: {
          outstandingBalance: paymentAmount
        }
      }
    );

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    revalidatePath(`/suppliers/${supplierId}/edit`);
    revalidatePath('/purchases');
  } catch (error) {
    console.error(`Error reversing supplier payment for ${supplierId}:`, error);
    // Don't throw - payment deletion should succeed even if supplier update failed
  }
}
