import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import PurchaseModel from '@/models/Purchase';

export async function GET() {
  try {
    await dbConnect();

    // Find invoices that need updating
    const invoices = await InvoiceModel.find({
      $or: [
        { profit: { $exists: false } },
        { 'items.originalRate': { $exists: false } }
      ]
    });

    let updatedCount = 0;
    let errors = 0;

    for (const invoice of invoices) {
      try {
        let totalProfit = 0;
        let itemsUpdated = false;

        // Process each item in the invoice
        for (const item of invoice.items) {
          // Skip if item already has originalRate
          if (item.originalRate) continue;

          // If purchaseId exists, get the original rate from purchase
          if (item.purchaseId) {
            const purchase = await PurchaseModel.findOne({ purchaseId: item.purchaseId });
            if (purchase) {
              item.originalRate = purchase.unitPrice;
              itemsUpdated = true;
            }
          }

          // Calculate item profit if we have originalRate
          if (item.originalRate) {
            const itemProfit = (item.unitPrice - item.originalRate) * item.quantity;
            totalProfit += itemProfit;
          }
        }

        // Update invoice with profit and modified items if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const update: any = {};
        if (itemsUpdated) {
          update.$set = {
            'items': invoice.items,
            updatedAt: new Date()
          };
        }
        if (totalProfit > 0) {
          update.$set = update.$set || {};
          update.$set.profit = totalProfit;
          update.$set.updatedAt = new Date();
        }

        if (Object.keys(update).length > 0) {
          await InvoiceModel.updateOne({ _id: invoice._id }, update);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing invoice ${invoice._id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed. Updated ${updatedCount} invoices with ${errors} errors.`,
      updatedCount,
      errorCount: errors
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run migration' },
      { status: 500 }
    );
  }
}