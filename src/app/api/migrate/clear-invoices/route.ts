import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const count = await Invoice.countDocuments();
    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoices found'
      });
    }

    await Invoice.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} invoices`
    });
  } catch (error) {
    console.error('Error clearing invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to clear invoices' }, { status: 500 });
  }
}
