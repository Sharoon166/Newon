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
  status: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
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
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Transform lean document to Invoice type
function transformInvoice(doc: LeanInvoice): Invoice {
  // Serialize items - remove _id and convert dates
  const items = doc.items?.map((item: LeanInvoiceItem) => ({
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
  const payments = doc.payments?.map((payment: LeanPayment) => ({
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
    validUntil: doc.validUntil ? (doc.validUntil instanceof Date ? doc.validUntil.toISOString() : doc.validUntil) : undefined,
    convertedToInvoice: doc.convertedToInvoice,
    convertedInvoiceId: doc.convertedInvoiceId,
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
        { customerEmail: { $regex: filters.search, $options: 'i' } },
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

    const transformedInvoices = result.docs.map((doc) => transformInvoice(doc as unknown as LeanInvoice));

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
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice> {
  try {
    await dbConnect();

    const invoice = await InvoiceModel.findOne({ invoiceNumber }).lean();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return transformInvoice(invoice as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error fetching invoice ${invoiceNumber}:`, error);
    throw new Error('Failed to fetch invoice');
  }
}

// Create new invoice
export async function createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
  try {
    await dbConnect();

    const newInvoice = new InvoiceModel(data);
    const savedInvoice = await newInvoice.save();

    // Deduct stock from purchases if this is an invoice (not quotation) and stockDeducted is true
    if (data.type === 'invoice' && data.items.length > 0) {
      try {
        const { deductStockForInvoice } = await import('@/features/purchases/actions/stock');
        const stockResult = await deductStockForInvoice(
          data.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity
          }))
        );

        if (!stockResult.success) {
          console.warn('Some stock deductions failed:', stockResult.errors);
          // Continue anyway - invoice is created but stock might not be fully deducted
        }

        // Mark stock as deducted
        savedInvoice.stockDeducted = true;
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

    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedInvoice = await InvoiceModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean();

    if (!updatedInvoice) {
      throw new Error('Invoice not found');
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/dashboard');

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

    // Restore stock if it was deducted
    if (invoice.type === 'invoice' && invoice.stockDeducted && invoice.items.length > 0) {
      try {
        const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
        await restoreStockForInvoice(
          invoice.items.map(item => ({
            purchaseId: item.purchaseId,
            quantity: item.quantity
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

    // Add payment to payments array
    invoice.payments.push(payment);

    // Update paid amount
    invoice.paidAmount += payment.amount;

    // Update balance amount
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    // Update status based on payment
    if (invoice.balanceAmount <= 0) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }

    await invoice.save();

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/dashboard');

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error adding payment to invoice ${invoiceId}:`, error);
    throw new Error('Failed to add payment');
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
            quantity: item.quantity
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

    return transformInvoice(savedInvoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error converting quotation ${quotationId}:`, error);
    throw new Error('Failed to convert quotation to invoice');
  }
}

// Update invoice status
export async function updateInvoiceStatus(
  id: string,
  status: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
): Promise<Invoice> {
  try {
    await dbConnect();

    const updatedInvoice = await InvoiceModel.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true }).lean();

    if (!updatedInvoice) {
      throw new Error('Invoice not found');
    }

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath('/dashboard');

    return transformInvoice(updatedInvoice as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error updating invoice status ${id}:`, error);
    throw new Error('Failed to update invoice status');
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

    const [totalInvoices, paidInvoices, pendingInvoices, totalRevenue, totalOutstanding] = await Promise.all([
      InvoiceModel.countDocuments(query),
      InvoiceModel.countDocuments({ ...query, status: 'paid' }),
      InvoiceModel.countDocuments({ ...query, status: { $in: ['pending', 'partial'] } }),
      InvoiceModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      InvoiceModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$balanceAmount' } } }])
    ]);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOutstanding: totalOutstanding[0]?.total || 0
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
          quantity: item.quantity
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
          quantity: item.quantity
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

    return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
  } catch (error) {
    console.error(`Error restoring stock for invoice ${invoiceId}:`, error);
    throw new Error((error as Error).message || 'Failed to restore stock');
  }
}
