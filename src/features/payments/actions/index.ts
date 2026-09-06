'use server';

import dbConnect from '@/lib/db';
import GeneralPaymentModel from '@/models/GeneralPayment';
import InvoiceModel from '@/models/Invoice';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import {
  GeneralPayment,
  CreateGeneralPaymentDto,
  GeneralPaymentFilters,
  PaginatedGeneralPayments,
  OpenInvoice
} from '../types';
import { requireAuth } from '@/lib/auth-utils';
import { addPayment } from '@/features/invoices/actions';

// Type for lean Mongoose document
interface LeanGeneralPayment {
  _id: Record<string, unknown>;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: Date;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  reference?: string;
  notes?: string;
  allocations: { invoiceId: string; invoiceNumber: string; amount: number }[];
  allocatedAmount: number;
  unallocatedAmount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

// Helper function to transform lean general payment
function transformLeanGeneralPayment(leanDoc: LeanGeneralPayment): GeneralPayment {
  return {
    ...leanDoc,
    id: leanDoc._id.toString(),
    _id: undefined,
    __v: undefined
  } as unknown as GeneralPayment;
}

/**
 * Get open invoices for a customer that can be allocated against
 */
export async function getOpenInvoicesForCustomer(customerId: string): Promise<OpenInvoice[]> {
  try {
    await dbConnect();

    const invoices = await InvoiceModel.find({
      customerId,
      type: 'invoice',
      status: { $in: ['pending', 'partial'] },
      balanceAmount: { $gt: 0 }
    })
      .sort({ date: 1 })
      .lean();

    return invoices.map(inv => ({
      id: (inv._id as mongoose.Types.ObjectId).toString(),
      invoiceNumber: inv.invoiceNumber as string,
      balanceAmount: (inv.balanceAmount as number) || 0
    }));
  } catch (error) {
    console.error('Error fetching open invoices:', error);
    throw new Error('Failed to fetch open invoices');
  }
}

/**
 * Get paginated list of general payments
 */
export async function getGeneralPayments(filters?: GeneralPaymentFilters): Promise<PaginatedGeneralPayments> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (filters?.search) {
      query.$or = [
        { customerName: { $regex: filters.search, $options: 'i' } },
        { paymentNumber: { $regex: filters.search, $options: 'i' } },
        { reference: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) dateQuery.$gte = filters.dateFrom;
      if (filters.dateTo) dateQuery.$lte = filters.dateTo;
      query.date = dateQuery;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 12;

    const result = await GeneralPaymentModel.paginate(query, {
      page,
      limit,
      sort: { date: -1, createdAt: -1 },
      lean: true
    });

    const transformedDocs = result.docs.map((doc: unknown) => transformLeanGeneralPayment(doc as LeanGeneralPayment));

    return {
      docs: transformedDocs,
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
    console.error('Error fetching general payments:', error);
    throw new Error('Failed to fetch general payments');
  }
}

/**
 * Create a general payment received from a customer.
 * - Validates amount is positive
 * - Allocates to open invoices via the existing addPayment flow (records on each invoice with provenance)
 * - Any unallocated remainder is kept on the general payment as an advance (unallocatedAmount)
 * - Ledger for allocations posts per-invoice credits (via addPayment); the unallocated part posts a single credit
 */
export async function createGeneralPayment(input: CreateGeneralPaymentDto): Promise<GeneralPayment> {
  try {
    const session = await requireAuth();
    const createdBy = (session.user?.name as string) || (session.user?.email as string) || 'unknown';

    await dbConnect();

    if (!input.customerId) {
      throw new Error('Customer is required');
    }

    if (input.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Validate that allocations don't exceed the total amount
    const allocatedAmount = input.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (allocatedAmount > input.amount) {
      throw new Error('Allocated amount cannot exceed payment amount');
    }

    const unallocatedAmount = input.amount - allocatedAmount;

    // Create the GeneralPayment record first to generate its payment number
    const generalPayment = new GeneralPaymentModel({
      customerId: input.customerId,
      customerName: input.customerName,
      customerCompany: input.customerCompany,
      date: input.date,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      allocations: input.allocations,
      allocatedAmount,
      unallocatedAmount,
      createdBy
    });

    await generalPayment.save();

    // Now apply allocations to invoices via the existing addPayment flow.
    // addPayment posts the invoice payment, updates balances, creates a ledger credit,
    // and updates customer financials. We pass provenance so the invoice shows the source.
    const successfulAllocations: { invoiceId: string; invoiceNumber: string; amount: number }[] = [];
    for (const allocation of input.allocations) {
      try {
        await addPayment(allocation.invoiceId, {
          amount: allocation.amount,
          method: input.method,
          date: input.date,
          reference: allocation.invoiceNumber,
          notes: `Payment from ${generalPayment.paymentNumber}`,
          sourceType: 'general',
          sourcePaymentId: (generalPayment._id as mongoose.Types.ObjectId).toString(),
          sourcePaymentNumber: generalPayment.paymentNumber
        });
        successfulAllocations.push(allocation);
      } catch (allocError) {
        console.error(`Error allocating ${allocation.invoiceNumber}:`, allocError);
        // Continue with other allocations - a failed allocation should not block the whole payment
      }
    }

    // Re-save GP with only the successful allocations (some may have failed)
    const finalAllocatedAmount = successfulAllocations.reduce((sum, a) => sum + a.amount, 0);
    generalPayment.allocations = successfulAllocations;
    generalPayment.allocatedAmount = finalAllocatedAmount;
    generalPayment.unallocatedAmount = generalPayment.amount - finalAllocatedAmount;
    await generalPayment.save();

    // Handle unallocated portion (advance) - post a ledger credit directly
    if (generalPayment.unallocatedAmount > 0) {
      try {
        const [ledgerActions, customerActions] = await Promise.all([
          import('@/features/ledger/actions'),
          import('@/features/customers/actions')
        ]);
        await ledgerActions.createLedgerEntry({
          customerId: input.customerId,
          customerName: input.customerName,
          customerCompany: input.customerCompany,
          transactionType: 'payment',
          transactionId: (generalPayment._id as mongoose.Types.ObjectId).toString(),
          transactionNumber: generalPayment.paymentNumber,
          date: input.date,
          description: `Payment ${generalPayment.paymentNumber} (unallocated)`,
          debit: 0,
          credit: generalPayment.unallocatedAmount,
          paymentMethod: input.method,
          reference: input.reference,
          createdBy
        });
        await customerActions.updateCustomerFinancialsOnPayment(input.customerId, generalPayment.unallocatedAmount, input.date);
      } catch (ledgerError) {
        console.error('Error creating ledger entry for unallocated amount:', ledgerError);
      }
    }

    revalidatePath('/payments');
    revalidatePath('/ledger');
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/customers');

    return transformLeanGeneralPayment(generalPayment.toObject() as unknown as LeanGeneralPayment);
  } catch (error: unknown) {
    console.error('Error creating general payment:', error);
    throw new Error((error as Error).message || 'Failed to create general payment');
  }
}

/**
 * Delete a general payment. Reverses allocations on invoices (removes the payment added via addPayment),
 * reverses customer financials, and removes the ledger entries.
 */
export async function deleteGeneralPayment(id: string): Promise<void> {
  try {
    await requireAuth();
    await dbConnect();

    const generalPayment = await GeneralPaymentModel.findById(id);

    if (!generalPayment) {
      throw new Error('Payment not found');
    }

    // Reverse allocated payments on each invoice
    for (const allocation of generalPayment.allocations) {
      try {
        const invoice = await InvoiceModel.findById(allocation.invoiceId);
        if (!invoice) continue;

        // Find the payment on the invoice that was created by this general payment
        const paymentIndex = invoice.payments.findIndex(
          (p) => p.sourcePaymentId === (generalPayment._id as mongoose.Types.ObjectId).toString()
        );
        if (paymentIndex === -1) continue;

        // Import deletePayment to reverse the payment cleanly
        const { deletePayment } = await import('@/features/invoices/actions');
        await deletePayment(allocation.invoiceId, paymentIndex);
      } catch (allocError) {
        console.error(`Error reversing allocation on invoice ${allocation.invoiceId}:`, allocError);
      }
    }

    // Reverse unallocated portion ledger entry + customer financials
    if (generalPayment.unallocatedAmount > 0) {
      try {
        const LedgerEntryModel = (await import('@/models/LedgerEntry')).default;
        // Actually delete the ledger entry, then reverse customer financials
        const entry = await LedgerEntryModel.findOne({
          transactionType: 'payment',
          transactionId: (generalPayment._id as mongoose.Types.ObjectId).toString()
        });
        if (entry) {
          const customerId = entry.customerId;
          const entryDate = entry.date;
          const entryCreatedAt = entry.createdAt;
          const balanceChange = entry.debit - entry.credit;
          await LedgerEntryModel.deleteOne({ _id: entry._id });
          await LedgerEntryModel.updateMany(
            {
              customerId,
              $or: [
                { date: { $gt: entryDate } },
                { date: entryDate, createdAt: { $gt: entryCreatedAt } }
              ]
            },
            { $inc: { balance: -balanceChange } }
          );
          const { reverseCustomerFinancialsOnPaymentDelete } = await import('@/features/customers/actions');
          await reverseCustomerFinancialsOnPaymentDelete(customerId, generalPayment.unallocatedAmount);
        }
      } catch (ledgerError) {
        console.error('Error reversing unallocated payment ledger entry:', ledgerError);
      }
    }

    await GeneralPaymentModel.deleteOne({ _id: id });

    revalidatePath('/payments');
    revalidatePath('/ledger');
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/customers');
  } catch (error) {
    console.error(`Error deleting general payment ${id}:`, error);
    throw new Error('Failed to delete general payment');
  }
}

/**
 * Allocate unallocated amounts from an existing general payment to open invoices.
 * Customer financials were already updated when the unallocated entry was created,
 * so we pass skipFinancialUpdate to avoid double-counting.
 */
export async function allocateFromUnallocated(
  generalPaymentId: string,
  allocations: { invoiceId: string; invoiceNumber: string; amount: number }[]
): Promise<GeneralPayment> {
  try {
    const session = await requireAuth();
    const createdBy = (session.user?.name as string) || (session.user?.email as string) || 'unknown';

    await dbConnect();

    const generalPayment = await GeneralPaymentModel.findById(generalPaymentId);
    if (!generalPayment) {
      throw new Error('General payment not found');
    }

    const totalNewAllocation = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalNewAllocation <= 0) {
      throw new Error('Allocation amount must be greater than 0');
    }
    if (totalNewAllocation > (generalPayment.unallocatedAmount || 0)) {
      throw new Error(
        `Cannot allocate more than the unallocated amount (${generalPayment.unallocatedAmount})`
      );
    }

    // Add each allocation to its invoice (skip customer financials — already counted)
    const successfulAllocations: { invoiceId: string; invoiceNumber: string; amount: number }[] = [];
    for (const allocation of allocations) {
      try {
        await addPayment(allocation.invoiceId, {
          amount: allocation.amount,
          method: generalPayment.method,
          date: generalPayment.date,
          reference: allocation.invoiceNumber,
          notes: `Allocated from ${generalPayment.paymentNumber}`,
          sourceType: 'general',
          sourcePaymentId: (generalPayment._id as mongoose.Types.ObjectId).toString(),
          sourcePaymentNumber: generalPayment.paymentNumber
        }, { skipFinancialUpdate: true });
        successfulAllocations.push(allocation);
      } catch (allocError) {
        console.error(`Error allocating to invoice ${allocation.invoiceNumber}:`, allocError);
      }
    }

    if (successfulAllocations.length === 0) {
      throw new Error('No allocations succeeded — no invoices could receive the payment');
    }

    // Update the GP allocations (only successful ones)
    const existingAllocations = generalPayment.allocations || [];
    const newAllocations = [
      ...existingAllocations,
      ...successfulAllocations.map(a => ({ invoiceId: a.invoiceId, invoiceNumber: a.invoiceNumber, amount: a.amount }))
    ];
    const newAllocatedAmount = newAllocations.reduce((sum, a) => sum + a.amount, 0);
    generalPayment.allocations = newAllocations;
    generalPayment.allocatedAmount = newAllocatedAmount;
    generalPayment.unallocatedAmount = Math.max(0, generalPayment.amount - newAllocatedAmount);
    await generalPayment.save();

    // Reduce the unallocated ledger entry credit by the actually allocated amount
    const actualAllocated = successfulAllocations.reduce((sum, a) => sum + a.amount, 0);
    if (actualAllocated > 0) {
      try {
        const LedgerEntryModel = (await import('@/models/LedgerEntry')).default;
        const entry = await LedgerEntryModel.findOne({
          transactionType: 'payment',
          transactionId: (generalPayment._id as mongoose.Types.ObjectId).toString()
        });
        if (entry) {
          const entryDate = entry.date;
          const entryCreatedAt = entry.createdAt;
          const oldCredit = entry.credit;
          const newCredit = Math.max(0, oldCredit - actualAllocated);

          if (newCredit <= 0) {
            // Entry fully consumed — delete it and reverse its balance effect
            const balanceDelta = -(oldCredit); // removing a credit increases balance
            await LedgerEntryModel.deleteOne({ _id: entry._id });
            await LedgerEntryModel.updateMany(
              {
                customerId: generalPayment.customerId,
                $or: [
                  { date: { $gt: entryDate } },
                  { date: entryDate, createdAt: { $gt: entryCreatedAt } }
                ]
              },
              { $inc: { balance: balanceDelta } }
            );
          } else {
            // Partially consume — reduce credit and adjust subsequent balances
            const oldBalanceChange = -(oldCredit); // debit - credit = -credit
            const newBalanceChange = -(newCredit);
            const balanceDelta = newBalanceChange - oldBalanceChange; // = oldCredit - newCredit = actualAllocated
            await LedgerEntryModel.updateOne(
              { _id: entry._id },
              { $set: { credit: newCredit } }
            );
            await LedgerEntryModel.updateMany(
              {
                customerId: generalPayment.customerId,
                $or: [
                  { date: { $gt: entryDate } },
                  { date: entryDate, createdAt: { $gt: entryCreatedAt } }
                ]
              },
              { $inc: { balance: balanceDelta } }
            );
          }
        }
      } catch (ledgerError) {
        console.error('Error updating unallocated ledger entry:', ledgerError);
      }
    }

    revalidatePath('/payments');
    revalidatePath('/ledger');
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/customers');

    return transformLeanGeneralPayment(generalPayment.toObject() as unknown as LeanGeneralPayment);
  } catch (error: unknown) {
    console.error('Error allocating from general payment:', error);
    throw new Error((error as Error).message || 'Failed to allocate from general payment');
  }
}