import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LedgerEntry from '@/models/LedgerEntry';

export async function GET() {
  try {
    await dbConnect();

    // Get all unique customer IDs
    const customerIds = await LedgerEntry.distinct('customerId');

    if (customerIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No ledger entries found',
        customersProcessed: 0,
        entriesUpdated: 0
      });
    }

    let totalEntriesUpdated = 0;
    let customersProcessed = 0;
    const errors: string[] = [];

    // Process each customer
    for (const customerId of customerIds) {
      try {
        // Get all entries for this customer, sorted by date and creation time
        const entries = await LedgerEntry.find({ customerId })
          .sort({ date: 1, createdAt: 1 })
          .exec();

        let runningBalance = 0;
        let entriesUpdated = 0;

        // Recalculate running balance for each entry
        for (const entry of entries) {
          const correctBalance = runningBalance + entry.debit - entry.credit;

          // Update if balance is incorrect
          if (entry.balance !== correctBalance) {
            entry.balance = correctBalance;
            await entry.save();
            entriesUpdated++;
          }

          // Update running balance for next entry
          runningBalance = correctBalance;
        }

        totalEntriesUpdated += entriesUpdated;
        customersProcessed++;

      } catch (error) {
        const errorMsg = `Failed to process customer ${customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully recalculated ledger balances for ${customersProcessed} customers`,
      customersProcessed,
      totalCustomers: customerIds.length,
      entriesUpdated: totalEntriesUpdated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error recalculating ledger balances:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to recalculate ledger balances',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
