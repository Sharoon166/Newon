import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import LedgerEntry from '@/models/LedgerEntry';
import Invoice from '@/models/Invoice';

export async function GET() {
  try {
    await dbConnect();

    // Get all customers
    const customers = await Customer.find({}).lean();

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No customers found',
        updated: 0
      });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // Get cancelled invoice IDs to exclude
    const cancelledInvoices = await Invoice.find({ status: 'cancelled' }).select('_id').lean();
    const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

    for (const customer of customers) {
      try {
        const customerId = customer._id.toString();

        // Calculate financials from ledger (excluding cancelled invoices)
        const ledgerSummary = await LedgerEntry.aggregate([
          {
            $match: {
              customerId,
              $or: [
                { transactionType: { $ne: 'invoice' } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          },
          {
            $group: {
              _id: null,
              totalDebit: { $sum: '$debit' },
              totalCredit: { $sum: '$credit' }
            }
          }
        ]);

        const totalInvoiced = ledgerSummary[0]?.totalDebit || 0;
        const totalPaid = ledgerSummary[0]?.totalCredit || 0;
        const outstandingBalance = totalInvoiced - totalPaid;

        // Get last invoice date (excluding cancelled)
        const lastInvoiceEntry = await LedgerEntry.findOne({
          customerId,
          transactionType: 'invoice',
          transactionId: { $nin: cancelledInvoiceIds }
        })
          .sort({ date: -1 })
          .lean();

        // Get last payment date
        const lastPaymentEntry = await LedgerEntry.findOne({
          customerId,
          transactionType: 'payment'
        })
          .sort({ date: -1 })
          .lean();

        // Update customer
        await Customer.updateOne(
          { _id: customerId },
          {
            $set: {
              totalInvoiced,
              totalPaid,
              outstandingBalance,
              lastInvoiceDate: lastInvoiceEntry?.date || null,
              lastPaymentDate: lastPaymentEntry?.date || null
            }
          }
        );

        updatedCount++;
      } catch (error) {
        const errorMsg = `Failed to update customer ${customer.customerId || customer._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully recalculated financials for ${updatedCount} customers`,
      updated: updatedCount,
      total: customers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error recalculating customer financials:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to recalculate customer financials',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
