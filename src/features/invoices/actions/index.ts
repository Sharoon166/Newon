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
  virtualProductId?: string;
  isVirtualProduct?: boolean;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
  stockLocation?: string;
  purchaseId?: string;
  originalRate?: number;
  componentBreakdown?: Array<{
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
    purchaseId: string;
    unitCost: number;
    totalCost: number;
  }>;
  customExpenses?: Array<{
    name: string;
    amount: number;
    category: string;
    description?: string;
  }>;
  totalComponentCost?: number;
  totalCustomExpenses?: number;
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
  projectId?: string;
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
      virtualProductId: item.virtualProductId,
      isVirtualProduct: item.isVirtualProduct,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discountType: item.discountType,
      discountValue: item.discountValue,
      discountAmount: item.discountAmount,
      totalPrice: item.totalPrice,
      stockLocation: item.stockLocation,
      purchaseId: item.purchaseId,
      originalRate: item.originalRate,
      componentBreakdown: item.componentBreakdown,
      customExpenses: item.customExpenses,
      totalComponentCost: item.totalComponentCost,
      totalCustomExpenses: item.totalCustomExpenses
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
    projectId: doc.projectId,
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

    // Create expense records for custom items (only for invoices, not quotations)
    if (data.type === 'invoice' && data.items.length > 0) {
      try {
        const customExpenses = data.items
          .filter(item => item.customExpenses && item.customExpenses.length > 0)
          .flatMap(item => item.customExpenses || []);


        if (customExpenses.length > 0) {
          const { createInvoiceExpenses } = await import('@/features/expenses/actions');
          const expenseResult = await createInvoiceExpenses(
            (savedInvoice._id as mongoose.Types.ObjectId).toString(),
            savedInvoice.invoiceNumber,
            savedInvoice.date,
            customExpenses,
            savedInvoice.createdBy,
            savedInvoice.projectId
          );

          if (expenseResult.success && expenseResult.data.length > 0) {
            let expenseIndex = 0;
            for (const item of savedInvoice.items) {
              if (item.customExpenses && item.customExpenses.length > 0) {
                for (let i = 0; i < item.customExpenses.length; i++) {
                  item.customExpenses[i].expenseId = expenseResult.data[expenseIndex];
                  expenseIndex++;
                }
              }
            }
            await savedInvoice.save();
          }
        }
      } catch (expenseError) {
        console.error('Error creating invoice expenses:', expenseError);
        // Continue - invoice is created but expense records failed
      }
    }

    // Deduct stock from purchases if this is an invoice (not quotation) and stockDeducted is true
    if (data.type === 'invoice' && data.items.length > 0) {
      try {
        // Skip stock deduction if invoice is from a project (stock already deducted when added to project)
        if (data.projectId) {
          // For project invoices, copy the component breakdown from project inventory
          const ProjectModel = (await import('@/models/Project')).default;
          const project = await ProjectModel.findOne({ projectId: data.projectId }).lean();
          
          if (project && project.inventory && project.inventory.length > 0) {
            // Match invoice items with project inventory and copy tracking data
            for (let i = 0; i < savedInvoice.items.length; i++) {
              const invoiceItem = savedInvoice.items[i];
              
              const projectInventoryItem = project.inventory.find((item: {
                productId?: string;
                virtualProductId?: string;
                variantId?: string;
              }) => {
                if (invoiceItem.isVirtualProduct) {
                  return item.virtualProductId === invoiceItem.virtualProductId;
                } else {
                  return item.productId === invoiceItem.productId && item.variantId === invoiceItem.variantId;
                }
              });
              
              if (projectInventoryItem) {
                // Copy purchase tracking from project
                if (invoiceItem.isVirtualProduct && projectInventoryItem.componentBreakdown) {
                  invoiceItem.componentBreakdown = projectInventoryItem.componentBreakdown;
                  invoiceItem.totalComponentCost = projectInventoryItem.totalComponentCost;
                } else if (!invoiceItem.isVirtualProduct && projectInventoryItem.purchaseId) {
                  invoiceItem.purchaseId = projectInventoryItem.purchaseId;
                  invoiceItem.originalRate = projectInventoryItem.rate;
                }
              }
            }
            
            // Mark as deducted (stock was deducted when added to project)
            savedInvoice.stockDeducted = true;
            await savedInvoice.save();
          }
        } else {
          // Normal invoice (not from project) - deduct stock as usual
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

        // Update invoice items with actual deduction data
        if (stockResult.actualDeductions && stockResult.actualDeductions.length > 0) {
          for (let i = 0; i < savedInvoice.items.length; i++) {
            const item = savedInvoice.items[i];
            const deductionData = stockResult.actualDeductions[i];

            if (!deductionData) {
              continue;
            }

            // Update component breakdown with actual purchases used for virtual products
            if (item.isVirtualProduct && deductionData.componentBreakdown) {
              // Flatten all component purchases into invoice component breakdown
              const allComponentPurchases: Array<{
                productId: string;
                variantId: string;
                productName: string;
                sku: string;
                quantity: number;
                purchaseId: string;
                unitCost: number;
                totalCost: number;
              }> = [];

              for (const component of deductionData.componentBreakdown) {
                for (const purchase of component.purchases) {
                  allComponentPurchases.push({
                    productId: component.productId,
                    variantId: component.variantId,
                    productName: component.productName,
                    sku: component.sku,
                    quantity: purchase.quantity,
                    purchaseId: purchase.purchaseId,
                    unitCost: purchase.unitCost,
                    totalCost: purchase.totalCost
                  });
                }
              }

              item.componentBreakdown = allComponentPurchases;

              // Calculate total component cost
              item.totalComponentCost = allComponentPurchases.reduce(
                (sum, p) => sum + p.totalCost,
                0
              );
            } else if (!item.isVirtualProduct && deductionData.regularPurchases && deductionData.regularPurchases.length > 0) {
              // For regular products, store the first purchase info
              const firstPurchase = deductionData.regularPurchases[0];
              item.purchaseId = firstPurchase.purchaseId;
              item.originalRate = firstPurchase.unitCost;
            }
          }
        }

        // Mark stock as deducted
        savedInvoice.stockDeducted = true;

        // Preserve the status for OTC customers (should remain 'paid')
        if (savedInvoice.customerId === 'otc' && savedInvoice.status !== 'paid') {
          savedInvoice.status = 'paid';
        }

        await savedInvoice.save();
        }
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
    
    // Revalidate project page if invoice was created from a project
    if (data.projectId) {
      revalidatePath('/projects');
      revalidatePath(`/projects/${data.projectId}`);
    }

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
          quantity: item.quantity,
          customExpenses: item.customExpenses
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

      // Delete associated expense records
      try {
        const { deleteInvoiceExpenses } = await import('@/features/expenses/actions');
        await deleteInvoiceExpenses(id);
      } catch (expenseError) {
        console.error('Error deleting invoice expenses:', expenseError);
        // Continue with deletion even if expense deletion fails
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
        // Only restore stock if invoice is NOT from a project
        // Project invoices don't own the stock - the project does
        console.log(`[deleteInvoice] Invoice ${invoice.invoiceNumber} - projectId: ${invoice.projectId || 'none'}`);
        
        if (!invoice.projectId) {
          console.log(`[deleteInvoice] Restoring stock for non-project invoice ${invoice.invoiceNumber}`);
          const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
          await restoreStockForInvoice(
            invoice.items.map(item => ({
              purchaseId: item.purchaseId,
              quantity: item.quantity,
              isVirtualProduct: item.isVirtualProduct,
              virtualProductId: item.virtualProductId,
              componentBreakdown: item.componentBreakdown
            }))
          );
        } else {
          console.log(`[deleteInvoice] Skipping stock restoration for project invoice ${invoice.invoiceNumber} (projectId: ${invoice.projectId})`);
        }
        // If invoice is from project, stock remains with project - no restoration needed
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

        if (!stockResult.success) {
          console.warn('Some stock deductions failed:', stockResult.errors);
        }

        // Update invoice items with actual deduction data
        if (stockResult.actualDeductions && stockResult.actualDeductions.length > 0) {
          for (let i = 0; i < savedInvoice.items.length; i++) {
            const item = savedInvoice.items[i];
            const deductionData = stockResult.actualDeductions[i];

            if (!deductionData) {
              continue;
            }

            // Update component breakdown with actual purchases used for virtual products
            if (item.isVirtualProduct && deductionData.componentBreakdown) {
              // Flatten all component purchases into invoice component breakdown
              const allComponentPurchases: Array<{
                productId: string;
                variantId: string;
                productName: string;
                sku: string;
                quantity: number;
                purchaseId: string;
                unitCost: number;
                totalCost: number;
              }> = [];

              for (const component of deductionData.componentBreakdown) {
                for (const purchase of component.purchases) {
                  allComponentPurchases.push({
                    productId: component.productId,
                    variantId: component.variantId,
                    productName: component.productName,
                    sku: component.sku,
                    quantity: purchase.quantity,
                    purchaseId: purchase.purchaseId,
                    unitCost: purchase.unitCost,
                    totalCost: purchase.totalCost
                  });
                }
              }

              item.componentBreakdown = allComponentPurchases;

              // Calculate total component cost
              item.totalComponentCost = allComponentPurchases.reduce(
                (sum, p) => sum + p.totalCost,
                0
              );
            } else if (!item.isVirtualProduct && deductionData.regularPurchases && deductionData.regularPurchases.length > 0) {
              // For regular products, store the first purchase info
              const firstPurchase = deductionData.regularPurchases[0];
              item.purchaseId = firstPurchase.purchaseId;
              item.originalRate = firstPurchase.unitCost;
            }
          }
        }

        savedInvoice.stockDeducted = true;
        await savedInvoice.save();
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

    // Create expense records for custom items
    if (savedInvoice.items.length > 0) {
      try {
        const customExpenses = savedInvoice.items
          .filter(item => item.customExpenses && item.customExpenses.length > 0)
          .flatMap(item => item.customExpenses || []);

        if (customExpenses.length > 0) {
          const { createInvoiceExpenses } = await import('@/features/expenses/actions');
          const expenseResult = await createInvoiceExpenses(
            (savedInvoice._id as mongoose.Types.ObjectId).toString(),
            savedInvoice.invoiceNumber,
            savedInvoice.date,
            customExpenses,
            createdBy,
            savedInvoice.projectId
          );

          if (expenseResult.success && expenseResult.data.length > 0) {
            let expenseIndex = 0;
            for (const item of savedInvoice.items) {
              if (item.customExpenses && item.customExpenses.length > 0) {
                for (let i = 0; i < item.customExpenses.length; i++) {
                  item.customExpenses[i].expenseId = expenseResult.data[expenseIndex];
                  expenseIndex++;
                }
              }
            }
            await savedInvoice.save();
          }
        }
      } catch (expenseError) {
        console.error('Error creating invoice expenses:', expenseError);
        // Continue - invoice is created but expense records failed
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
        // Only restore stock if invoice is NOT from a project
        // Project invoices don't own the stock - the project does
        console.log(`[cancelInvoice] Invoice ${invoice.invoiceNumber} - projectId: ${invoice.projectId || 'none'}`);
        
        if (!invoice.projectId) {
          console.log(`[cancelInvoice] Restoring stock for non-project invoice ${invoice.invoiceNumber}`);
          const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
          await restoreStockForInvoice(
            invoice.items.map(item => ({
              purchaseId: item.purchaseId,
              quantity: item.quantity,
              isVirtualProduct: item.isVirtualProduct,
              virtualProductId: item.virtualProductId,
              componentBreakdown: item.componentBreakdown
            }))
          );
        } else {
          console.log(`[cancelInvoice] Skipping stock restoration for project invoice ${invoice.invoiceNumber} (projectId: ${invoice.projectId})`);
        }
        // If invoice is from project, stock remains with project - no restoration needed
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

    // Delete associated expense records for cancelled invoices
    if (invoice.type === 'invoice') {
      try {
        const { deleteInvoiceExpenses } = await import('@/features/expenses/actions');
        await deleteInvoiceExpenses(id);
      } catch (expenseError) {
        console.error('Error deleting invoice expenses:', expenseError);
        // Continue - invoice is cancelled but expense deletion failed
      }
    }

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
        { $match: { ...query, status: { $ne: 'cancelled' }, date: { $gte: monthStart }, profit: { $exists: true } } },
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

      // Update invoice items with actual deduction data
      if (stockResult.actualDeductions && stockResult.actualDeductions.length > 0) {
        for (let i = 0; i < invoice.items.length; i++) {
          const item = invoice.items[i];
          const deductionData = stockResult.actualDeductions[i];

          if (!deductionData) {
            continue;
          }

          // Update component breakdown with actual purchases used for virtual products
          if (item.isVirtualProduct && deductionData.componentBreakdown) {
            // Flatten all component purchases into invoice component breakdown
            const allComponentPurchases: Array<{
              productId: string;
              variantId: string;
              productName: string;
              sku: string;
              quantity: number;
              purchaseId: string;
              unitCost: number;
              totalCost: number;
            }> = [];

            for (const component of deductionData.componentBreakdown) {
              for (const purchase of component.purchases) {
                allComponentPurchases.push({
                  productId: component.productId,
                  variantId: component.variantId,
                  productName: component.productName,
                  sku: component.sku,
                  quantity: purchase.quantity,
                  purchaseId: purchase.purchaseId,
                  unitCost: purchase.unitCost,
                  totalCost: purchase.totalCost
                });
              }
            }

            item.componentBreakdown = allComponentPurchases;

            // Calculate total component cost
            item.totalComponentCost = allComponentPurchases.reduce(
              (sum, p) => sum + p.totalCost,
              0
            );
          } else if (!item.isVirtualProduct && deductionData.regularPurchases && deductionData.regularPurchases.length > 0) {
            // For regular products, store the first purchase info
            const firstPurchase = deductionData.regularPurchases[0];
            item.purchaseId = firstPurchase.purchaseId;
            item.originalRate = firstPurchase.unitCost;
          }
        }
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

    // Skip stock restoration for project invoices - stock belongs to the project
    if (invoice.projectId) {
      console.log(`[restoreInvoiceStock] Skipping stock restoration for project invoice ${invoice.invoiceNumber} (projectId: ${invoice.projectId})`);
      // Just return the invoice without restoring stock
      return transformInvoice(invoice.toObject() as unknown as LeanInvoice);
    }

    if (invoice.items.length > 0) {
      const { restoreStockForInvoice } = await import('@/features/purchases/actions/stock');
      const stockResult = await restoreStockForInvoice(
        invoice.items.map(item => ({
          purchaseId: item.purchaseId,
          quantity: item.quantity,
          isVirtualProduct: item.isVirtualProduct,
          virtualProductId: item.virtualProductId,
          componentBreakdown: item.componentBreakdown
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

/**
 * Check if an invoice can be edited
 */
export async function canEditInvoice(invoiceId: string): Promise<{
  allowed: boolean;
  reason?: string;
  requiresStockRestore: boolean;
  warning?: string;
}> {
  try {
    await dbConnect();
    const invoice = await InvoiceModel.findById(invoiceId).lean();

    if (!invoice) {
      return { allowed: false, reason: 'Invoice not found', requiresStockRestore: false };
    }

    // Cannot edit cancelled invoices
    if (invoice.status === 'cancelled') {
      return { allowed: false, reason: 'Cannot edit cancelled invoices', requiresStockRestore: false };
    }

    // Cannot edit paid invoices (financial records finalized)
    if (invoice.status === 'paid') {
      return { allowed: false, reason: 'Cannot edit paid invoices', requiresStockRestore: false };
    }

    // Quotations can always be edited (unless cancelled)
    if (invoice.type === 'quotation') {
      return { allowed: true, requiresStockRestore: false };
    }

    // Pending invoices
    if (invoice.status === 'pending') {
      // If stock not deducted - safe to edit
      if (!invoice.stockDeducted) {
        return { allowed: true, requiresStockRestore: false };
      }

      // If stock deducted - can edit but needs restore/re-deduct
      return {
        allowed: true,
        requiresStockRestore: true,
        warning: 'Stock will be restored and re-deducted after editing'
      };
    }

    return { allowed: false, reason: 'Invoice cannot be edited in current status', requiresStockRestore: false };
  } catch (error) {
    console.error(`Error checking edit permission for invoice ${invoiceId}:`, error);
    return { allowed: false, reason: 'Error checking permissions', requiresStockRestore: false };
  }
}

/**
 * Update invoice with full edit capability (items, quantities, etc.)
 * Handles stock restoration and re-deduction automatically
 */
export async function updateInvoiceFull(id: string, data: UpdateInvoiceDto): Promise<Invoice> {
  try {
    await dbConnect();

    // Check if editing is allowed
    const editCheck = await canEditInvoice(id);
    if (!editCheck.allowed) {
      throw new Error(editCheck.reason || 'Invoice cannot be edited');
    }

    // Get the original invoice
    const originalInvoice = await InvoiceModel.findById(id);
    if (!originalInvoice) {
      throw new Error('Invoice not found');
    }

    const wasStockDeducted = originalInvoice.stockDeducted;

    // Step 1: Restore stock if it was deducted
    if (wasStockDeducted && editCheck.requiresStockRestore) {
      await restoreInvoiceStock(id);
    }

    try {
      // Step 2: Update the invoice with new data
      // Convert date strings to UTC Date objects
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

      // Recalculate profit if items or discount changed
      if (data.items || data.discountAmount !== undefined) {
        const items = data.items || originalInvoice.items;
        const discountAmount = data.discountAmount !== undefined ? data.discountAmount : originalInvoice.discountAmount;

        processedData.profit = calculateInvoiceProfit(
          items.map(item => ({
            rate: item.unitPrice,
            originalRate: item.originalRate,
            quantity: item.quantity
          })),
          discountAmount
        );
      }

      const updateData = Object.fromEntries(
        Object.entries(processedData).filter(([, value]) => value !== undefined)
      );

      // Reset stockDeducted to false since we restored it
      if (wasStockDeducted) {
        updateData.stockDeducted = false;
      }

      const updatedInvoice = await InvoiceModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

      if (!updatedInvoice) {
        throw new Error('Failed to update invoice');
      }

      // Step 3: Re-deduct stock if it was originally deducted
      if (wasStockDeducted && updatedInvoice.type === 'invoice') {
        try {
          await deductInvoiceStock(id);
        } catch (stockError) {
          // If re-deduction fails, we need to handle it gracefully
          console.error('Failed to re-deduct stock after update:', stockError);
          throw new Error(
            `Invoice updated but stock re-deduction failed: ${(stockError as Error).message}. Please manually deduct stock.`
          );
        }
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
          }
        }
      }

      // Sync expense records if items changed (only for invoices)
      if (updatedInvoice.type === 'invoice' && data.items) {
        try {
          const customExpenses = data.items
            .filter(item => item.customExpenses && item.customExpenses.length > 0)
            .flatMap(item => item.customExpenses || []);

          const { syncInvoiceExpenses } = await import('@/features/expenses/actions');
          const expenseResult = await syncInvoiceExpenses(
            (updatedInvoice._id as mongoose.Types.ObjectId).toString(),
            updatedInvoice.invoiceNumber,
            updatedInvoice.date,
            customExpenses,
            updatedInvoice.createdBy,
            updatedInvoice.projectId
          );

          if (expenseResult.success && expenseResult.data.length > 0) {
            let expenseIndex = 0;
            for (const item of updatedInvoice.items) {
              if (item.customExpenses && item.customExpenses.length > 0) {
                for (let i = 0; i < item.customExpenses.length; i++) {
                  item.customExpenses[i].expenseId = expenseResult.data[expenseIndex];
                  expenseIndex++;
                }
              }
            }
            await updatedInvoice.save();
          }
        } catch (expenseError) {
          console.error('Error syncing invoice expenses:', expenseError);
          // Continue - invoice is updated but expense sync failed
        }
      }

      revalidatePath('/invoices');
      revalidatePath(`/invoices/${id}`);
      revalidatePath('/dashboard');
      revalidatePath('/ledger', 'layout');
      revalidatePath('/customers');
      revalidatePath('/purchases');
      revalidatePath('/inventory');

      return transformInvoice(updatedInvoice.toObject() as unknown as LeanInvoice);
    } catch (updateError) {
      // If update failed and we restored stock, try to re-deduct the original stock
      if (wasStockDeducted && editCheck.requiresStockRestore) {
        try {
          await deductInvoiceStock(id);
        } catch (redeductError) {
          console.error('Failed to restore original stock state after update failure:', redeductError);
        }
      }
      throw updateError;
    }
  } catch (error) {
    console.error(`Error in full invoice update ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to update invoice');
  }
}
