'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  AddPaymentDto,
  InvoiceFilters,
  PaginatedInvoices
} from '../types';
import { calculateInvoiceProfit } from '../utils/calculate-profit';

// Helper types for lean documents
interface LeanInvoiceItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantSKU?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
  stockLocation?: string;
  purchaseId?: string;
}

interface LeanPayment {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  date: Date | string;
  reference?: string;
  notes?: string;
}

interface LeanInvoice {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  type: 'invoice' | 'quotation';
  date: Date | string;
  dueDate?: Date | string;
  billingType: 'wholesale' | 'retail';
  market: 'newon' | 'waymor';
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  items: LeanInvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  gstAmount: number;
  totalAmount: number;
  status:
    | 'pending'
    | 'paid'
    | 'partial'
    | 'delivered'
    | 'cancelled'
    | 'draft'
    | 'sent'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'converted';
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  paidAmount: number;
  balanceAmount: number;
  payments: LeanPayment[];
  stockDeducted: boolean;
  notes?: string;
  termsAndConditions?: string;
  validUntil?: Date | string;
  convertedToInvoice?: boolean;
  convertedInvoiceId?: string;
  description?: string;
  profit?: number;
  custom?: boolean;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Transform lean document to Invoice type
function transformInvoice(doc: LeanInvoice): Invoice {
  // Serialize items - remove _id and convert dates
  const items =
    doc.items?.map((item: LeanInvoiceItem) => ({
      productId: item.productId,
      productName: item.productName,
      variantId: item.variantId,
      variantSKU: item.variantSKU,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discountType: item.discountType,
      discountValue: item.discountValue,
      discountAmount: item.discountAmount,
      totalPrice: item.totalPrice,
      stockLocation: item.stockLocation,
      purchaseId: item.purchaseId
    })) || [];

  // Serialize payments - remove _id and convert dates
  const payments =
    doc.payments?.map((payment: LeanPayment) => ({
      amount: payment.amount,
      method: payment.method,
      date: payment.date instanceof Date ? payment.date.toISOString() : payment.date,
      reference: payment.reference,
      notes: payment.notes
    })) || [];

  return {
    id: doc._id.toString(),
    invoiceNumber: doc.invoiceNumber,
    type: doc.type,
    date: doc.date instanceof Date ? doc.date.toISOString() : doc.date,
    dueDate: doc.dueDate ? (doc.dueDate instanceof Date ? doc.dueDate.toISOString() : doc.dueDate) : undefined,
    billingType: doc.billingType,
    market: doc.market,
    customerId: doc.customerId,
    customerName: doc.customerName,
    customerCompany: doc.customerCompany,
    customerEmail: doc.customerEmail,
    customerPhone: doc.customerPhone,
    customerAddress: doc.customerAddress,
    customerCity: doc.customerCity,
    customerState: doc.customerState,
    customerZip: doc.customerZip,
    items,
    subtotal: doc.subtotal,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    discountAmount: doc.discountAmount,
    gstType: doc.gstType,
    gstValue: doc.gstValue,
    gstAmount: doc.gstAmount,
    totalAmount: doc.totalAmount,
    status: doc.status,
    paymentMethod: doc.paymentMethod,
    paidAmount: doc.paidAmount,
    balanceAmount: doc.balanceAmount,
    payments,
    stockDeducted: doc.stockDeducted,
    notes: doc.notes,
    termsAndConditions: doc.termsAndConditions,
    validUntil: doc.validUntil
      ? doc.validUntil instanceof Date
        ? doc.validUntil.toISOString()
        : doc.validUntil
      : undefined,
    convertedToInvoice: doc.convertedToInvoice,
    convertedInvoiceId: doc.convertedInvoiceId,
    description: doc.description,
    profit: doc.profit,
    custom: doc.custom || false,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt
  } as Invoice;
}

// Get all invoices with filters
export async function getInvoices(filters?: InvoiceFilters): Promise<PaginatedInvoices> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters?.market) {
      query.market = filters.market;
    }

    if (filters?.billingType) {
      query.billingType = filters.billingType;
    }

    if (filters?.search) {
      query.$or = [
        { invoiceNumber: { $regex: filters.search, $options: 'i' } },
        { customerName: { $regex: filters.search, $options: 'i' } },
        { customerEmail: { $regex: filters.search, $options: 'i', $exists: true } },
        { customerPhone: { $regex: filters.search, $options: 'i' } }
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
      query.date = dateQuery;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await InvoiceModel.paginate(query, {
      page,
      limit,
      sort: { date: -1, createdAt: -1 },
      lean: true
    });

    const transformedInvoices = result.docs.map(doc => transformInvoice(doc as unknown as LeanInvoice));

    return {
      docs: transformedInvoices,
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
    console.error('Error fetching invoices:', error);
    throw new Error('Failed to fetch invoices');
  }
}

// Get single invoice by ID
export async function getInvoice(id: string): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(id).lean();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return transformInvoice(invoice as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error fetching invoice ${id}:`, error);
    throw new Error('Failed to fetch invoice');
  }
}

// Get invoice by invoice number
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findOne({ invoiceNumber }).lean();

    if (!invoice) {
      return null;
    }

    return transformInvoice(invoice as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error fetching invoice ${invoiceNumber}:`, error);
    return null;
  }
}

// Create new invoice
export async function createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
  try {
    await dbConnect();

    // Convert date strings to UTC Date objects to avoid timezone issues
    const { dateStringToUTC } = await import('@/lib/utils');
    const invoiceData = {
      ...data,
      date: typeof data.date === 'string' ? dateStringToUTC(data.date) : data.date,
      dueDate: data.dueDate && typeof data.dueDate === 'string' ? dateStringToUTC(data.dueDate) : data.dueDate,
      validUntil:
        data.validUntil && typeof data.validUntil === 'string' ? dateStringToUTC(data.validUntil) : data.validUntil
    };

    const newInvoice = new InvoiceModel(invoiceData);
    const savedInvoice = await newInvoice.save();

    // Create ledger entry for invoice (only for actual invoices, not quotations)
    if (data.type === 'invoice') {
      try {
        const { createLedgerEntryFromInvoice } = await import('@/features/ledger/actions');
        await createLedgerEntryFromInvoice({
          id: (savedInvoice._id as mongoose.Types.ObjectId).toString(),
          invoiceNumber: savedInvoice.invoiceNumber,
          customerId: savedInvoice.customerId,
          customerName: savedInvoice.customerName,
          customerCompany: savedInvoice.customerCompany,
          date: savedInvoice.date,
          totalAmount: savedInvoice.totalAmount,
          createdBy: savedInvoice.createdBy
        });
      } catch (ledgerError) {
        console.error('Error creating ledger entry:', ledgerError);
        // Continue - invoice is created but ledger entry failed
      }

      // Update customer financial fields
      try {
        const { updateCustomerFinancialsOnInvoice } = await import('@/features/customers/actions');
        await updateCustomerFinancialsOnInvoice(savedInvoice.customerId, savedInvoice.totalAmount, savedInvoice.date);
      } catch (customerError) {
        console.error('Error updating customer financials:', customerError);
        // Continue - invoice is created but customer update failed
      }
    }

    // Create ledger entries for initial payments if any
    if (data.type === 'invoice' && savedInvoice.payments && savedInvoice.payments.length > 0) {
      try {
        const { createLedgerEntryFromPayment } = await import('@/features/ledger/actions');
        for (const payment of savedInvoice.payments) {
          await createLedgerEntryFromPayment({
            id: (savedInvoice._id as mongoose.Types.ObjectId).toString(),
            customerId: savedInvoice.customerId,
            customerName: savedInvoice.customerName,
            customerCompany: savedInvoice.customerCompany,
            date: payment.date,
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
            createdBy: savedInvoice.createdBy
          });
        }
      } catch (paymentLedgerError) {
        console.error('Error creating ledger entries for initial payments:', paymentLedgerError);
        // Continue - invoice is created but payment ledger entries failed
      }

      // Update customer financials for initial payments
      if (savedInvoice.paidAmount > 0) {
        try {
          const { updateCustomerFinancialsOnPayment } = await import('@/features/customers/actions');
          await updateCustomerFinancialsOnPayment(savedInvoice.customerId, savedInvoice.paidAmount, savedInvoice.date);
        } catch (customerPaymentError) {
          console.error('Error updating customer financials for initial payment:', customerPaymentError);
          // Continue - invoice is created but customer payment update failed
        }
      }
    }

    // Deduct stock from purchases if this is an invoice (not quotation) and stockDeducted is true
    if (data.type === 'invoice' && data.items.length > 0) {
      try {
        const { deductStockForInvoice } = await import('@/features/purchases/actions/stock');
        const stockResult = await deductStockForInvoice(
          data.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            isVirtualProduct: item.isVirtualProduct,
            virtualProductId: item.virtualProductId
          }))
        );

        if (!stockResult.success) {
          console.warn('Some stock deductions failed:', stockResult.errors);
          // Continue anyway - invoice is created but stock might not be fully deducted
        }

        // Mark stock as deducted
        savedInvoice.stockDeducted = true;

        // Preserve the status for OTC customers (should remain 'paid')
        if (savedInvoice.customerId === 'otc' && savedInvoice.status !== 'paid') {
          savedInvoice.status = 'paid';
        }

        await savedInvoice.save();
      } catch (stockError) {
        console.error('Error deducting stock:', stockError);
        // Continue - invoice is created but stock not deducted
      }
    }

    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(savedInvoice.toObject() as unknown as LeanInvoice);
  } catch (error: unknown) {
    console.error('Error creating invoice:', error);
    throw new Error((error as Error).message || 'Failed to create invoice');
  }
}

// Update invoice
export async function updateInvoice(id: string, data: UpdateInvoiceDto): Promise<Invoice> {
  try {
    await dbConnect();

    // Recalculate profit if items or discount changed
    if (data.items || data.discountAmount !== undefined) {
      // Get current invoice to merge with updates
      const currentInvoice = await InvoiceModel.findById(id).lean();
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }

      const items = data.items || currentInvoice.items;
      const discountAmount = data.discountAmount !== undefined ? data.discountAmount : currentInvoice.discountAmount;

      // Calculate new profit
      data.profit = calculateInvoiceProfit(
        items.map(item => ({
          rate: item.unitPrice,
          originalRate: item.originalRate,
          quantity: item.quantity
        })),
        discountAmount
      );
    }

    // Convert date strings to UTC Date objects to avoid timezone issues
    const { dateStringToUTC } = await import('@/lib/utils');
    const processedData = { ...data };
    if (processedData.date && typeof processedData.date === 'string') {
      processedData.date = dateStringToUTC(processedData.date);
    }
    if (processedData.dueDate && typeof processedData.dueDate === 'string') {
      processedData.dueDate = dateStringToUTC(processedData.dueDate);
    }
    if (processedData.validUntil && typeof processedData.validUntil === 'string') {
      processedData.validUntil = dateStringToUTC(processedData.validUntil);
    }

    const updateData = Object.fromEntries(Object.entries(processedData).filter(([, value]) => value !== undefined));

    // Get the original invoice BEFORE updating (for customer financial comparison)
    const originalInvoice = await InvoiceModel.findById(id).lean();

    if (!originalInvoice) {
      throw new Error('Invoice not found');
    }

    const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedInvoice) {
      throw new Error('Invoice not found');
    }

    // Update ledger entry if this is an invoice and total amount changed
    if (updatedInvoice.type === 'invoice' && data.totalAmount !== undefined) {
      try {
        const { updateLedgerEntryFromInvoice } = await import('@/features/ledger/actions');
        await updateLedgerEntryFromInvoice({
          id: (updatedInvoice._id as mongoose.Types.ObjectId).toString(),
          invoiceNumber: updatedInvoice.invoiceNumber,
          totalAmount: updatedInvoice.totalAmount
        });
      } catch (ledgerError) {
        console.error('Error updating ledger entry:', ledgerError);
        // Continue - invoice is updated but ledger entry update failed
      }

      // Update customer financials if amounts changed
      if (data.totalAmount !== undefined || data.paidAmount !== undefined) {
        try {
          const { updateCustomerFinancialsOnInvoiceUpdate } = await import('@/features/customers/actions');
          await updateCustomerFinancialsOnInvoiceUpdate(
            updatedInvoice.customerId,
            originalInvoice.totalAmount,
            updatedInvoice.totalAmount,
            originalInvoice.paidAmount,
            updatedInvoice.paidAmount
          );
        } catch (customerError) {
          console.error('Error updating customer financials:', customerError);
          // Continue - invoice is updated but customer update failed
        }
      }
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/dashboard');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(updatedInvoice as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error updating invoice ${id}:`, error);
    throw new Error('Failed to update invoice');
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<void> {
  try {
    await dbConnect();

    // Get the invoice first to restore stock
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Only allow deletion of draft invoices or quotations
    // For invoices/quotations with any other status, they should be cancelled instead
    if (invoice.type === 'invoice' && invoice.status !== 'draft') {
      throw new Error(
        'Cannot delete invoice. Only draft invoices can be deleted. Please cancel the invoice instead to maintain data integrity.'
      );
    }

    // For quotations, allow deletion if not converted and no payments
    if (invoice.type === 'quotation' && invoice.convertedToInvoice) {
      throw new Error('Cannot delete quotation that has been converted to an invoice. Please cancel it instead.');
    }

    // Additional safety check: prevent deletion if invoice has any payments
    if (invoice.paidAmount > 0) {
      throw new Error('Cannot delete invoice with payments. Please cancel the invoice and reverse payments instead.');
    }

    // Delete ledger entry if this is an invoice
    if (invoice.type === 'invoice') {
      try {
        const { deleteLedgerEntryFromInvoice } = await import('@/features/ledger/actions');
        await deleteLedgerEntryFromInvoice(id);
      } catch (ledgerError) {
        console.error('Error deleting ledger entry:', ledgerError);
        // Continue with deletion even if ledger entry deletion fails
      }

      // Reverse customer financial updates
      try {
        const { reverseCustomerFinancialsOnInvoiceDelete } = await import('@/features/customers/actions');
        await reverseCustomerFinancialsOnInvoiceDelete(invoice.customerId, invoice.totalAmount, invoice.paidAmount);
      } catch (customerError) {
        console.error('Error reversing customer financials:', customerError);
        // Continue with deletion even if customer update fails
      }
    }

    // Restore stock if it was deducted
    if (invoice.type === 'invoice' && invoice.stockDeducted && invoice.items.length > 0) {
      try {
        const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
        await restoreStockForInvoice(
          invoice.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            isVirtualProduct: item.isVirtualProduct,
            virtualProductId: item.virtualProductId
          }))
        );
      } catch (stockError) {
        console.error('Error restoring stock:', stockError);
        // Continue with deletion even if stock restoration fails
      }
    }

    const result = await InvoiceModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new Error('Invoice not found');
    }

    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');
  } catch (error) {
    console.error(`Error deleting invoice ${id}:`, error);
    throw new Error('Failed to delete invoice');
  }
}

// Add payment to invoice
export async function addPayment(invoiceId: string, payment: AddPaymentDto): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate payment amount doesn't exceed balance
    if (payment.amount > invoice.balanceAmount) {
      throw new Error(`Payment amount (${payment.amount}) exceeds outstanding balance (${invoice.balanceAmount})`);
    }

    // Validate payment amount is positive
    if (payment.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Add payment to payments array
    invoice.payments.push(payment);

    // Update paid amount
    invoice.paidAmount += payment.amount;

    // Update balance amount
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    // Update status based on payment (automatic calculation)
    if (invoice.balanceAmount <= 0) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'pending';
    }

    await invoice.save();

    // Create ledger entry for payment
    try {
      const { createLedgerEntryFromPayment } = await import('@/features/ledger/actions');
      await createLedgerEntryFromPayment({
        id: (invoice._id as mongoose.Types.ObjectId).toString(),
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerCompany: invoice.customerCompany,
        date: payment.date,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        createdBy: invoice.createdBy
      });
    } catch (ledgerError) {
      console.error('Error creating ledger entry for payment:', ledgerError);
      // Continue - payment is recorded but ledger entry failed
    }

    // Update customer financial fields
    try {
      const { updateCustomerFinancialsOnPayment } = await import('@/features/customers/actions');
      await updateCustomerFinancialsOnPayment(invoice.customerId, payment.amount, payment.date);
    } catch (customerError) {
      console.error('Error updating customer financials:', customerError);
      // Continue - payment is recorded but customer update failed
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/dashboard');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error adding payment to invoice ${invoiceId}:`, error);
    throw new Error('Failed to add payment');
  }
}

// Update payment in invoice
export async function updatePayment(
  invoiceId: string,
  paymentIndex: number,
  updatedPayment: AddPaymentDto
): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (paymentIndex < 0 || paymentIndex >= invoice.payments.length) {
      throw new Error('Payment not found');
    }

    const oldPayment = invoice.payments[paymentIndex];

    // Update the payment
    invoice.payments[paymentIndex] = updatedPayment as never;

    // Recalculate paid amount
    invoice.paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

    // Update balance amount
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    // Update status based on payment
    if (invoice.balanceAmount <= 0) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'pending';
    }

    await invoice.save();

    // Update ledger entry for payment
    try {
      const { updateLedgerEntryFromPayment } = await import('@/features/ledger/actions');
      await updateLedgerEntryFromPayment({
        invoiceId,
        paymentIndex,
        oldAmount: oldPayment.amount,
        newAmount: updatedPayment.amount,
        newDate: updatedPayment.date,
        newMethod: updatedPayment.method,
        newReference: updatedPayment.reference
      });
    } catch (ledgerError) {
      console.error('Error updating ledger entry for payment:', ledgerError);
      // Continue - payment is updated but ledger entry update failed
    }

    // Update customer financials
    try {
      const { updateCustomerFinancialsOnPayment, reverseCustomerFinancialsOnPaymentDelete } = await import(
        '@/features/customers/actions'
      );
      // Reverse old payment
      await reverseCustomerFinancialsOnPaymentDelete(invoice.customerId, oldPayment.amount);
      // Add new payment
      await updateCustomerFinancialsOnPayment(invoice.customerId, updatedPayment.amount, updatedPayment.date);
    } catch (customerError) {
      console.error('Error updating customer financials:', customerError);
      // Continue - payment is updated but customer update failed
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/dashboard');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error updating payment in invoice ${invoiceId}:`, error);
    throw new Error('Failed to update payment');
  }
}

// Delete payment from invoice
export async function deletePayment(invoiceId: string, paymentIndex: number): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (paymentIndex < 0 || paymentIndex >= invoice.payments.length) {
      throw new Error('Payment not found');
    }

    // Store payment amount before deletion for customer update
    const deletedPaymentAmount = invoice.payments[paymentIndex].amount;

    // Delete ledger entry BEFORE removing from invoice (so we can still find it by index)
    try {
      const { deleteLedgerEntryFromPayment } = await import('@/features/ledger/actions');
      await deleteLedgerEntryFromPayment({
        invoiceId,
        paymentIndex
      });
    } catch (ledgerError) {
      console.error('Error deleting ledger entry for payment:', ledgerError);
      // Continue - payment will be deleted but ledger entry deletion failed
    }

    // Remove the payment
    invoice.payments.splice(paymentIndex, 1);

    // Recalculate paid amount
    invoice.paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

    // Update balance amount
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    // Update status based on payment
    if (invoice.balanceAmount <= 0 && invoice.paidAmount > 0) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'pending';
    }

    await invoice.save();

    // Reverse customer financial update
    try {
      const { reverseCustomerFinancialsOnPaymentDelete } = await import('@/features/customers/actions');
      await reverseCustomerFinancialsOnPaymentDelete(invoice.customerId, deletedPaymentAmount);
    } catch (customerError) {
      console.error('Error reversing customer payment:', customerError);
      // Continue - payment is deleted but customer update failed
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/dashboard');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error deleting payment from invoice ${invoiceId}:`, error);
    throw new Error('Failed to delete payment');
  }
}

// Convert quotation to invoice
export async function convertQuotationToInvoice(quotationId: string, createdBy: string): Promise<Invoice> {
  try {
    await dbConnect();

    const quotation = await InvoiceModel.findById(quotationId);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (quotation.type !== 'quotation') {
      throw new Error('Document is not a quotation');
    }

    if (quotation.convertedToInvoice) {
      throw new Error('Quotation already converted to invoice');
    }

    // Create new invoice from quotation
    const invoiceData = {
      ...quotation.toObject(),
      _id: undefined,
      invoiceNumber: undefined, // Will be auto-generated
      type: 'invoice' as const,
      status: 'pending' as const,
      dueDate: quotation.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      validUntil: undefined,
      convertedToInvoice: undefined,
      convertedInvoiceId: undefined,
      createdBy
    };

    const newInvoice = new InvoiceModel(invoiceData);
    const savedInvoice = await newInvoice.save();

    // Deduct stock from purchases
    if (savedInvoice.items.length > 0) {
      try {
        const { deductStockForInvoice } = await import('@/features/purchases/actions/stock');
        const stockResult = await deductStockForInvoice(
          savedInvoice.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            isVirtualProduct: item.isVirtualProduct,
            virtualProductId: item.virtualProductId
          }))
        );

        if (stockResult.success) {
          savedInvoice.stockDeducted = true;
          await savedInvoice.save();
        } else {
          console.warn('Some stock deductions failed:', stockResult.errors);
        }
      } catch (stockError) {
        console.error('Error deducting stock:', stockError);
      }
    }

    // Create ledger entry for the new invoice
    try {
      const { createLedgerEntryFromInvoice } = await import('@/features/ledger/actions');
      await createLedgerEntryFromInvoice({
        id: (savedInvoice._id as mongoose.Types.ObjectId).toString(),
        invoiceNumber: savedInvoice.invoiceNumber,
        customerId: savedInvoice.customerId,
        customerName: savedInvoice.customerName,
        customerCompany: savedInvoice.customerCompany,
        date: savedInvoice.date,
        totalAmount: savedInvoice.totalAmount,
        createdBy
      });
    } catch (ledgerError) {
      console.error('Error creating ledger entry:', ledgerError);
      // Continue - invoice is created but ledger entry failed
    }

    // Update customer financial fields
    try {
      const { updateCustomerFinancialsOnInvoice } = await import('@/features/customers/actions');
      await updateCustomerFinancialsOnInvoice(savedInvoice.customerId, savedInvoice.totalAmount, savedInvoice.date);
    } catch (customerError) {
      console.error('Error updating customer financials:', customerError);
      // Continue - invoice is created but customer update failed
    }

    // Update quotation to mark as converted
    quotation.convertedToInvoice = true;
    quotation.convertedInvoiceId = (savedInvoice._id as mongoose.Types.ObjectId).toString();
    quotation.status = 'converted';
    await quotation.save();

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${quotationId}`);
    revalidatePath('/dashboard');
    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(savedInvoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error converting quotation ${quotationId}:`, error);
    throw new Error('Failed to convert quotation to invoice');
  }
}

// Cancel invoice (proper way to void an invoice instead of deleting)
export async function cancelInvoice(id: string, reason?: string): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Invoice is already cancelled');
    }

    // Prevent cancellation if invoice has any payments
    if (invoice.paidAmount > 0) {
      throw new Error(
        `Cannot cancel invoice with payments (${invoice.paidAmount} paid). Please delete all payments first or process a refund/credit note instead.`
      );
    }

    // Update status to cancelled
    invoice.status = 'cancelled';
    if (reason) {
      invoice.notes = invoice.notes
        ? `${invoice.notes}\n\nCancellation Reason: ${reason}`
        : `Cancellation Reason: ${reason}`;
    }
    await invoice.save();

    // Restore stock if it was deducted
    if (invoice.type === 'invoice' && invoice.stockDeducted && invoice.items.length > 0) {
      try {
        const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
        await restoreStockForInvoice(
          invoice.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity,
            isVirtualProduct: item.isVirtualProduct,
            virtualProductId: item.virtualProductId
          }))
        );
        invoice.stockDeducted = false;
        await invoice.save();
      } catch (stockError) {
        console.error('Error restoring stock:', stockError);
        // Continue - invoice is cancelled but stock not restored
      }
    }

    // Note: We don't delete ledger entries for cancelled invoices
    // They remain in the ledger with cancelled status for audit trail
    // The ledger queries already exclude cancelled invoices from calculations

    // Reverse customer financial updates
    if (invoice.type === 'invoice') {
      try {
        const { reverseCustomerFinancialsOnInvoiceDelete } = await import('@/features/customers/actions');
        await reverseCustomerFinancialsOnInvoiceDelete(invoice.customerId, invoice.totalAmount, invoice.paidAmount);
      } catch (customerError) {
        console.error('Error reversing customer financials:', customerError);
        // Continue - invoice is cancelled but customer update failed
      }
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/dashboard');
    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/customers');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error cancelling invoice ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to cancel invoice');
  }
}

// Update invoice status
export async function updateInvoiceStatus(
  id: string,
  status:
    | 'pending'
    | 'paid'
    | 'partial'
    | 'delivered'
    | 'cancelled'
    | 'draft'
    | 'sent'
    | 'accepted'
    | 'rejected'
    | 'expired'
): Promise<Invoice> {
  try {
    await dbConnect();

    // If changing to cancelled status, use cancelInvoice instead
    if (status === 'cancelled') {
      return await cancelInvoice(id);
    }

    // Get the invoice to check its type
    const invoice = await InvoiceModel.findById(id);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // For invoices (not quotations), prevent manual setting of payment-related statuses
    // These statuses are automatically calculated based on payments
    if (invoice.type === 'invoice' && ['pending', 'paid', 'partial'].includes(status)) {
      throw new Error(
        `Cannot manually set status to '${status}'. Payment statuses are automatically calculated based on payments made.`
      );
    }

    invoice.status = status;
    await invoice.save();

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/dashboard');
    revalidatePath('/ledger', 'layout');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error updating invoice status ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to update invoice status');
  }
}

// Get next invoice number (preview what will be assigned)
export async function getNextInvoiceNumber(type: 'invoice' | 'quotation' = 'invoice'): Promise<string> {
  try {
    await dbConnect();

    const prefix = type === 'quotation' ? 'QT' : 'INV';
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    const key = `${prefix.toLowerCase()}-${currentYear}`;

    // Import Counter model
    const Counter = (await import('@/models/Counter')).default;

    // Get current sequence without incrementing
    const counter = await Counter.findOne({ key });
    const nextSequence = counter ? counter.sequence + 1 : 1;
    const sequenceStr = nextSequence.toString().padStart(3, '0');

    return `${prefix}-${yearSuffix}-${sequenceStr}`;
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    throw new Error('Failed to get next invoice number');
  }
}

// Get invoice statistics
export async function getInvoiceStats(filters?: { market?: 'newon' | 'waymor'; dateFrom?: Date; dateTo?: Date }) {
  try {
    await dbConnect();

    const { startOfDay, endOfDay, startOfMonth } = await import('date-fns');
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    const query: Record<string, unknown> = { type: 'invoice' };

    if (filters?.market) {
      query.market = filters.market;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.date = dateQuery;
    }

    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue,
      totalOutstanding,
      dailySales,
      monthlySales,
      monthlyProfit,
      cancelledInvoices,
      cancelledRevenue
    ] = await Promise.all([
      InvoiceModel.countDocuments({ ...query, status: { $ne: 'cancelled' } }),
      InvoiceModel.countDocuments({ ...query, status: 'paid' }),
      InvoiceModel.countDocuments({ ...query, status: { $in: ['pending', 'partial'] } }),
      InvoiceModel.aggregate([
        { $match: { ...query, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { ...query, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$balanceAmount' } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { ...query, status: { $ne: 'cancelled' }, date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { ...query, status: { $ne: 'cancelled' }, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { ...query, status: { $ne: 'cancelled' }, date: { $gte: monthStart }, profit: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$profit' } } }
      ]),
      InvoiceModel.countDocuments({ ...query, status: 'cancelled' }),
      InvoiceModel.aggregate([
        { $match: { ...query, status: 'cancelled' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOutstanding: totalOutstanding[0]?.total || 0,
      dailySales: dailySales[0]?.total || 0,
      monthlySales: monthlySales[0]?.total || 0,
      monthlyProfit: monthlyProfit[0]?.total || 0,
      cancelledInvoices,
      cancelledRevenue: cancelledRevenue[0]?.total || 0
    };
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    throw new Error('Failed to fetch invoice statistics');
  }
}

// Manually deduct stock for an invoice (if it wasn't deducted during creation)
export async function deductInvoiceStock(invoiceId: string): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.type !== 'invoice') {
      throw new Error('Can only deduct stock for invoices, not quotations');
    }

    if (invoice.stockDeducted) {
      throw new Error('Stock already deducted for this invoice');
    }

    if (invoice.items.length > 0) {
      const { deductStockForInvoice } = await import('@/features/purchases/actions/stock');
      const stockResult = await deductStockForInvoice(
        invoice.items.map(item => ({
          purchaseId: item.purchaseId,
          quantity: item.quantity,
          isVirtualProduct: item.isVirtualProduct,
          virtualProductId: item.virtualProductId
        }))
      );

      if (!stockResult.success) {
        throw new Error(`Stock deduction failed: ${stockResult.errors.join(', ')}`);
      }

      invoice.stockDeducted = true;
      await invoice.save();
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/purchases');
    revalidatePath('/ledger', 'layout');
    revalidatePath('/inventory');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error deducting stock for invoice ${invoiceId}:`, error);
    throw new Error((error as Error).message || 'Failed to deduct stock');
  }
}

// Manually restore stock for an invoice (if it needs to be cancelled)
export async function restoreInvoiceStock(invoiceId: string): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.type !== 'invoice') {
      throw new Error('Can only restore stock for invoices, not quotations');
    }

    if (!invoice.stockDeducted) {
      throw new Error('Stock was not deducted for this invoice');
    }

    if (invoice.items.length > 0) {
      const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
      const stockResult = await restoreStockForInvoice(
        invoice.items.map(item => ({
          purchaseId: item.purchaseId,
          quantity: item.quantity,
          isVirtualProduct: item.isVirtualProduct,
          virtualProductId: item.virtualProductId
        }))
      );

      if (!stockResult.success) {
        throw new Error(`Stock restoration failed: ${stockResult.errors.join(', ')}`);
      }

      invoice.stockDeducted = false;
      await invoice.save();
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/ledger', 'layout');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error restoring stock for invoice ${invoiceId}:`, error);
    throw new Error((error as Error).message || 'Failed to restore stock');
  }
}
