import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LedgerEntryModel from '@/models/LedgerEntry';

export async function POST() {
  try {
    await dbConnect();

    // Step 1: Fix duplicate transaction numbers for payments
    let duplicatesFixed = 0;
    const paymentsByInvoice = await LedgerEntryModel.aggregate([
      {
        $match: { transactionType: 'payment' }
      },
      {
        $group: {
          _id: '$transactionId',
          entries: { $push: { id: '$_id', transactionNumber: '$transactionNumber', createdAt: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    for (const group of paymentsByInvoice) {
      // Sort by createdAt to maintain order
      const sortedEntries = group.entries.sort((a: { createdAt: Date }, b: { createdAt: Date }) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Update transaction numbers to be unique
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const invoiceIdPart = group._id.slice(-6).toUpperCase();
        const newTransactionNumber = `PAY-${invoiceIdPart}-${i + 1}`;
        
        if (entry.transactionNumber !== newTransactionNumber) {
          await LedgerEntryModel.updateOne(
            { _id: entry.id },
            { $set: { transactionNumber: newTransactionNumber } }
          );
          duplicatesFixed++;
        }
      }
    }

    // Step 2: Get all unique customer IDs
    const customers = await LedgerEntryModel.distinct('customerId');

    let totalFixed = 0;
    const errors: string[] = [];

    for (const customerId of customers) {
      try {
        // Get all entries for this customer, sorted by date and createdAt
        const entries = await LedgerEntryModel.find({ customerId })
          .sort({ date: 1, createdAt: 1 })
          .lean();

        let runningBalance = 0;

        // Recalculate balance for each entry
        for (const entry of entries) {
          runningBalance += entry.debit - entry.credit;

          // Update if balance is incorrect
          if (entry.balance !== runningBalance) {
            await LedgerEntryModel.updateOne(
              { _id: entry._id },
              { $set: { balance: runningBalance } }
            );
            totalFixed++;
          }
        }
      } catch (customerError) {
        console.error(`Error fixing ledger for customer ${customerId}:`, customerError);
        errors.push(`Customer ${customerId}: ${(customerError as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${totalFixed} ledger balances and ${duplicatesFixed} duplicate transaction numbers across ${customers.length} customers`,
      totalCustomers: customers.length,
      balancesFixed: totalFixed,
      duplicatesFixed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error fixing ledger balances:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix ledger balances',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
