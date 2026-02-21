'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import { getProject } from './index';
import type { Invoice } from '@/features/invoices/types';

export interface GenerateInvoiceFromProjectDto {
  projectId: string;
  type: 'invoice' | 'quotation';
  markupPercentage?: number; // e.g., 20 for 20% markup
  customPricing?: Array<{
    inventoryItemId: string;
    unitPrice: number;
  }>;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  dueDate?: Date;
  validUntil?: Date;
  notes?: string;
  termsAndConditions?: string;
  selectedInventoryIds?: string[]; // Optional: only include specific items
  createdBy: string;
  market: 'newon' | 'waymor';
  billingType: 'wholesale' | 'retail';
}

export async function generateInvoiceFromProject(
  data: GenerateInvoiceFromProjectDto
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
  try {
    await dbConnect();

    // Get project data
    const project = await getProject(data.projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    if (!project.customerId || project.customerId === 'otc') {
      return { success: false, error: 'Cannot generate invoice for OTC or projects without customer' };
    }

    // Filter inventory items if specific items selected
    let inventoryItems = project.inventory;
    if (data.selectedInventoryIds && data.selectedInventoryIds.length > 0) {
      inventoryItems = project.inventory.filter(item => 
        data.selectedInventoryIds!.includes(item.id!)
      );
    }

    if (inventoryItems.length === 0) {
      return { success: false, error: 'No inventory items to invoice' };
    }

    // Convert inventory items to invoice items
    const invoiceItems = inventoryItems.map(item => {
      // Find custom pricing if provided
      const customPrice = data.customPricing?.find(cp => cp.inventoryItemId === item.id);
      
      // Calculate unit price: custom price > markup > original rate
      let unitPrice = item.rate;
      if (customPrice) {
        unitPrice = customPrice.unitPrice;
      } else if (data.markupPercentage) {
        unitPrice = item.rate * (1 + data.markupPercentage / 100);
      }

      return {
        productId: item.productId || item.virtualProductId || 'manual',
        productName: item.productName,
        variantId: item.variantId,
        variantSKU: item.sku,
        virtualProductId: item.virtualProductId,
        isVirtualProduct: item.isVirtualProduct,
        quantity: item.quantity,
        unit: 'pcs',
        unitPrice: unitPrice,
        discountType: undefined,
        discountValue: 0,
        discountAmount: 0,
        totalPrice: unitPrice * item.quantity,
        purchaseId: item.purchaseId,
        originalRate: item.rate,
        componentBreakdown: item.componentBreakdown,
        customExpenses: item.customExpenses,
        totalComponentCost: item.totalComponentCost,
        totalCustomExpenses: item.totalCustomExpenses
      };
    });

    // Calculate subtotal
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate discount
    let discountAmount = 0;
    if (data.discountType && data.discountValue) {
      if (data.discountType === 'percentage') {
        discountAmount = (subtotal * data.discountValue) / 100;
      } else {
        discountAmount = data.discountValue;
      }
    }

    // Calculate GST
    let gstAmount = 0;
    const amountAfterDiscount = subtotal - discountAmount;
    if (data.gstType && data.gstValue) {
      if (data.gstType === 'percentage') {
        gstAmount = (amountAfterDiscount * data.gstValue) / 100;
      } else {
        gstAmount = data.gstValue;
      }
    }

    // Calculate total
    const totalAmount = amountAfterDiscount + gstAmount;

    // Get customer details from project
    // Note: You might want to fetch full customer details from Customer model
    const invoiceData = {
      type: data.type,
      date: new Date(),
      dueDate: data.dueDate,
      validUntil: data.validUntil,
      billingType: data.billingType,
      market: data.market,
      customerId: project.customerId,
      customerName: project.customerName,
      customerCompany: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      items: invoiceItems,
      subtotal,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount,
      gstType: data.gstType,
      gstValue: data.gstValue,
      gstAmount,
      totalAmount,
      status: data.type === 'invoice' ? 'pending' : 'draft',
      paymentMethod: data.paymentMethod,
      paidAmount: 0,
      balanceAmount: totalAmount,
      payments: [],
      stockDeducted: false, // Important: stock already deducted in project
      notes: data.notes || `Generated from Project: ${project.title} (${project.projectId})`,
      termsAndConditions: data.termsAndConditions,
      custom: false,
      createdBy: data.createdBy,
      projectId: project.projectId // Link back to project
    };

    // Create invoice
    const invoice = new InvoiceModel(invoiceData);
    await invoice.save();

    revalidatePath('/invoices');
    revalidatePath(`/projects/${data.projectId}`);

    return {
      success: true,
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber
    };
  } catch (error) {
    console.error('Error generating invoice from project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate invoice'
    };
  }
}
