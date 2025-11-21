import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LedgerEntry from '@/models/LedgerEntry';

export async function GET() {
  try {
    await dbConnect();

    const count = await LedgerEntry.countDocuments();
    
    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: 'Ledger is already empty',
        deleted: 0
      });
    }

    const result = await LedgerEntry.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Successfully cleared all ledger entries',
      deleted: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing ledger:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to clear ledger entries',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
