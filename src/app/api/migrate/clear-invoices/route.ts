import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
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

    // Delete all invoices
    await Invoice.deleteMany({});

    // Reset customer financial fields
    const customerUpdateResult = await Customer.updateMany(
      {},
      {
        $set: {
          totalInvoiced: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          lastInvoiceDate: null,
          lastPaymentDate: null
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} invoices and reset ${customerUpdateResult.modifiedCount} customer financial records`
    });
  } catch (error) {
    console.error('Error clearing invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to clear invoices' }, { status: 500 });
  }
}
