'use server';

import { revalidatePath } from 'next/cache';
import { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerFilters } from '../types';
import dbConnect from '@/lib/db';
import CustomerModel from '../../../models/Customer';

type LeanCustomer = Omit<Customer, '_id' | '__v'> & {
  _id: string;
  __v: number;
};

export async function getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
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

    const customers = await CustomerModel.find(query).sort({ createdAt: -1 }).lean();

    const transformedCustomers = customers.map(customer => {
      const customerObj = customer as LeanCustomer;
      const transformed = {
        ...customerObj,
        id: customerObj._id.toString(),
        _id: undefined,
        __v: undefined
      } as Customer;
      return transformed;
    });

    return transformedCustomers;
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

    const customerObj = customer as LeanCustomer;
    const transformed = {
      ...customerObj,
      id: customerObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as Customer;

    return transformed;
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

    const savedCustomerObj = savedCustomer.toObject() as LeanCustomer;
    return {
      ...savedCustomerObj,
      id: savedCustomerObj._id.toString(),
      _id: undefined,
      __v: undefined
    } as Customer;
  } catch (error: unknown) {
    console.error('Error creating customer:', error);
    throw new Error((error as Error).message || 'Failed to create customer');
  }
}

export async function updateCustomer(id: string, data: UpdateCustomerDto): Promise<Customer> {
  try {
    await dbConnect();

    // Filter out undefined values to avoid issues with MongoDB
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );
        
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
