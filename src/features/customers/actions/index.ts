'use server';

import { revalidatePath } from 'next/cache';
import { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerFilters, PaginatedCustomers } from '../types';
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
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
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
    id: leanDoc._id.toString(),
    _id: undefined,
    __v: undefined
  } as Customer;
}


export async function getCustomers(filters?: CustomerFilters): Promise<PaginatedCustomers> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.hasOutstandingBalance !== undefined) {
      query.outstandingBalance = filters.hasOutstandingBalance ? { $gt: 0 } : { $lte: 0 };
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
      sort: { createdAt: -1 },
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

    const customer = await CustomerModel.findById(id).lean();

    if (!customer) {
      throw new Error('Customer not found');
    }

    return transformLeanCustomer(customer as LeanCustomer);
  } catch (error) {
    console.error(`Error fetching customer ${id}:`, error);
    throw new Error('Failed to fetch customer');
  }
}

export async function createCustomer(data: CreateCustomerDto): Promise<Customer> {
  try {
    await dbConnect();

    // Check if email already exists
    const existingCustomer = await CustomerModel.findOne({ email: data.email });
    if (existingCustomer) {
      throw new Error('Email already in use');
    }

    const newCustomer = new CustomerModel(data);
    const savedCustomer = await newCustomer.save();

    revalidatePath('/(dashboard)/customers');

    return transformLeanCustomer(savedCustomer.toObject() as LeanCustomer);
  } catch (error: unknown) {
    console.error('Error creating customer:', error);
    throw new Error((error as Error).message || 'Failed to create customer');
  }
}

export async function updateCustomer(id: string, data: UpdateCustomerDto): Promise<Customer> {
  try {
    await dbConnect();

    // Filter out undefined values to avoid issues with MongoDB
    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      id,
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

    const updatedCustomerObj = updatedCustomer as LeanCustomer;
    return {
      ...updatedCustomerObj,
      id: updatedCustomerObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as Customer;
  } catch (error) {
    console.error(`Error updating customer ${id}:`, error);
    throw new Error('Failed to update customer');
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    await dbConnect();

    const result = await CustomerModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new Error('Customer not found');
    }

    revalidatePath('/(dashboard)/customers');
  } catch (error) {
    console.error(`Error deleting customer ${id}:`, error);
    throw new Error('Failed to delete customer');
  }
}

// Financial update functions for future invoice/payment integration
export async function updateCustomerFinancials(
  id: string,
  financialData: {
    totalInvoiced?: number;
    totalPaid?: number;
    outstandingBalance?: number;
    lastInvoiceDate?: Date;
    lastPaymentDate?: Date;
  }
): Promise<void> {
  try {
    await dbConnect();

    const result = await CustomerModel.findByIdAndUpdate(id, { $set: financialData }, { new: true });

    if (!result) {
      throw new Error('Customer not found');
    }

    revalidatePath('/(dashboard)/customers');
    revalidatePath(`/(dashboard)/customers/${id}`);
  } catch (error) {
    console.error(`Error updating customer financials ${id}:`, error);
    throw new Error('Failed to update customer financials');
  }
}
