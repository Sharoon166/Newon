'use server';

import { revalidatePath } from 'next/cache';
import type { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerFilters, PaginatedCustomers } from '../types';
import dbConnect from '@/lib/db';
import CustomerModel from '../../../models/Customer';

// Type for lean Mongoose document - using Record for _id to handle Mongoose's FlattenMaps type
interface LeanCustomer {
  _id: Record<string, unknown>;
  customerId?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  disabled?: boolean;
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

// Helper function to transform lean customer to Customer type
function transformLeanCustomer(leanDoc: LeanCustomer): Customer {
  return {
    ...leanDoc,
    id: String(leanDoc._id),
    _id: undefined,
    __v: undefined
  } as Customer;
}

export async function getCustomers(filters?: CustomerFilters & { includeDisabled?: boolean }): Promise<PaginatedCustomers> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    // By default, exclude disabled customers unless explicitly requested
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

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await CustomerModel.paginate(query, {
      page,
      limit,
      sort: { customerId: -1 },
      lean: true
    });

    const transformedCustomers = result.docs.map((customer: unknown) =>
      transformLeanCustomer(customer as LeanCustomer)
    );

    return {
      docs: transformedCustomers,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page || 1,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
      nextPage: result.nextPage || null,
      prevPage: result.prevPage || null
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw new Error('Failed to fetch customers');
  }
}

export async function getCustomer(id: string): Promise<Customer> {
  try {
    await dbConnect();

    const customer = await CustomerModel.findOne({ customerId: id }).lean();

    if (!customer) {
      throw new Error('Customer not found');
    }

    return transformLeanCustomer(customer as unknown as LeanCustomer);
  } catch (error) {
    console.error(`Error fetching customer ${id}:`, error);
    throw new Error('Failed to fetch customer');
  }
}

export async function createCustomer(data: CreateCustomerDto): Promise<Customer> {
  try {
    await dbConnect();

    // Protect OTC customer ID
    if (data.email === 'otc@cash.sale' || data.name?.toLowerCase() === 'over the counter customer') {
      throw new Error('Cannot create customer with reserved OTC details. This is a system customer.');
    }

    // Check if email already exists
    const existingCustomer = await CustomerModel.findOne({ email: data.email });
    if (existingCustomer) {
      throw new Error('Email already in use');
    }

    const newCustomer = new CustomerModel(data);
    const savedCustomer = await newCustomer.save();

    revalidatePath('/customers');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

    return transformLeanCustomer(savedCustomer.toObject() as LeanCustomer);
  } catch (error: unknown) {
    console.error('Error creating customer:', error);
    throw new Error((error as Error).message || 'Failed to create customer');
  }
}

export async function updateCustomer(id: string, data: UpdateCustomerDto): Promise<Customer> {
  try {
    await dbConnect();

    // Protect OTC customer from updates
    if (id === 'otc') {
      throw new Error('Cannot update OTC customer. This is a system customer for walk-in sales.');
    }

    // Filter out undefined values to avoid issues with MongoDB
    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { customerId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    revalidatePath(`/customers/${id}/edit`);
    revalidatePath(`/invoices`);
    revalidatePath(`/invoices/new`);

    return transformLeanCustomer(updatedCustomer as unknown as LeanCustomer);
  } catch (error) {
    console.error(`Error updating customer ${id}:`, error);
    throw new Error('Failed to update customer');
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    await dbConnect();

    // Protect OTC customer from deletion
    if (id === 'otc') {
      throw new Error('Cannot delete OTC customer. This is a system customer for walk-in sales.');
    }

    const result = await CustomerModel.deleteOne({ customerId: id });

    if (result.deletedCount === 0) {
      throw new Error('Customer not found');
    }

    revalidatePath('/customers');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error deleting customer ${id}:`, error);
    throw new Error('Failed to delete customer');
  }
}

/**
 * Update customer financial fields when invoice is created
 */
export async function updateCustomerFinancialsOnInvoice(
  customerId: string,
  totalAmount: number,
  invoiceDate: Date
): Promise<void> {
  try {
    await dbConnect();

    const result = await CustomerModel.findOneAndUpdate(
      { customerId },
      {
        $inc: {
          totalInvoiced: totalAmount,
          outstandingBalance: totalAmount
        },
        $set: {
          lastInvoiceDate: invoiceDate
        }
      },
      { new: true }
    );
    
    if (!result) {
      console.warn(`Customer ${customerId} not found for financial update`);
      return;
    }
    
    // Revalidate pages that show customer financial data
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error updating customer financials for ${customerId}:`, error);
    // Don't throw - invoice creation should succeed even if customer update failed
  }
}

/**
 * Update customer financial fields when payment is made
 */
export async function updateCustomerFinancialsOnPayment(
  customerId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<void> {
  try {
    await dbConnect();

    const result = await CustomerModel.findOneAndUpdate(
      { customerId },
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
      console.warn(`Customer ${customerId} not found for financial update`);
      return;
    }
    
    // Revalidate pages that show customer financial data
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error updating customer financials for ${customerId}:`, error);
    // Don't throw - payment should succeed even if customer update fails
  }
}

/**
 * Reverse customer financial fields when invoice is deleted
 */
export async function reverseCustomerFinancialsOnInvoiceDelete(
  customerId: string,
  totalAmount: number,
  paidAmount: number
): Promise<void> {
  try {
    await dbConnect();

    // First get current values to ensure we don't go negative
    const customer = await CustomerModel.findOne({ customerId });
    
    if (!customer) {
      console.warn(`Customer ${customerId} not found for financial reversal`);
      return;
    }

    const newTotalInvoiced = Math.max(0, customer.totalInvoiced - totalAmount);
    const newTotalPaid = Math.max(0, customer.totalPaid - paidAmount);
    const newOutstandingBalance = Math.max(0, customer.outstandingBalance - (totalAmount - paidAmount));

    await CustomerModel.findOneAndUpdate(
      { customerId },
      {
        $set: {
          totalInvoiced: newTotalInvoiced,
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstandingBalance
        }
      }
    );
    
    // Revalidate pages that show customer financial data
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error reversing customer financials for ${customerId}:`, error);
    // Don't throw - invoice deletion should succeed even if customer update fails
  }
}

/**
 * Reverse customer financial fields when payment is deleted
 */
export async function reverseCustomerFinancialsOnPaymentDelete(
  customerId: string,
  paymentAmount: number
): Promise<void> {
  try {
    await dbConnect();

    // First get current values to ensure totalPaid doesn't go negative
    const customer = await CustomerModel.findOne({ customerId });
    
    if (!customer) {
      console.warn(`Customer ${customerId} not found for payment reversal`);
      return;
    }

    const newTotalPaid = Math.max(0, customer.totalPaid - paymentAmount);

    await CustomerModel.findOneAndUpdate(
      { customerId },
      {
        $set: {
          totalPaid: newTotalPaid
        },
        $inc: {
          outstandingBalance: paymentAmount
        }
      }
    );
    
    // Revalidate pages that show customer financial data
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error reversing customer payment for ${customerId}:`, error);
    // Don't throw - payment deletion should succeed even if customer update fails
  }
}

/**
 * Update customer financial fields when invoice amount is updated
 */
export async function updateCustomerFinancialsOnInvoiceUpdate(
  customerId: string,
  oldTotalAmount: number,
  newTotalAmount: number,
  oldPaidAmount: number,
  newPaidAmount: number
): Promise<void> {
  try {
    await dbConnect();

    // Calculate differences
    const invoiceDiff = newTotalAmount - oldTotalAmount;
    const paidDiff = newPaidAmount - oldPaidAmount;
    const outstandingDiff = invoiceDiff - paidDiff;

    // Get current values to ensure no negative results
    const customer = await CustomerModel.findOne({ customerId });
    
    if (!customer) {
      console.warn(`Customer ${customerId} not found for financial update`);
      return;
    }

    const newTotalInvoiced = Math.max(0, customer.totalInvoiced + invoiceDiff);
    const newTotalPaid = Math.max(0, customer.totalPaid + paidDiff);
    const newOutstandingBalance = customer.outstandingBalance + outstandingDiff;

    await CustomerModel.findOneAndUpdate(
      { customerId },
      {
        $set: {
          totalInvoiced: newTotalInvoiced,
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstandingBalance
        }
      }
    );
    
    // Revalidate pages that show customer financial data
    revalidatePath('/customers');
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
  } catch (error) {
    console.error(`Error updating customer financials for ${customerId}:`, error);
    // Don't throw - invoice update should succeed even if customer update fails
  }
}

/**
 * Toggle customer disabled status
 */
export async function toggleCustomerDisabled(id: string): Promise<Customer> {
  try {
    await dbConnect();

    // Protect OTC customer from being disabled
    if (id === 'otc') {
      throw new Error('Cannot disable OTC customer. This is a system customer for walk-in sales.');
    }

    const customer = await CustomerModel.findOne({ customerId: id });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { customerId: id },
      { $set: { disabled: !customer.disabled } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');

    return transformLeanCustomer(updatedCustomer as unknown as LeanCustomer);
  } catch (error) {
    console.error(`Error toggling customer disabled status ${id}:`, error);
    throw new Error('Failed to toggle customer status');
  }
}
