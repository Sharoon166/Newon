import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import LedgerEntryModel from '@/models/LedgerEntry';

export async function GET() {
  try {
    await dbConnect();

    // Get all invoices with payments
    const invoicesWithPayments = await InvoiceModel.find({
      type: 'invoice',
      'payments.0': { $exists: true }
    }).lean();

    const missingPayments: Array<{
      invoiceId: string;
      invoiceNumber: string;
      totalPayments: number;
      ledgerPayments: number;
      missing: number;
    }> = [];

    for (const invoice of invoicesWithPayments) {
      const invoiceId = invoice._id.toString();
      const paymentCount = invoice.payments?.length || 0;

      // Count ledger entries for this invoice's payments
      const ledgerPaymentCount = await LedgerEntryModel.countDocuments({
        transactionType: 'payment',
        transactionId: invoiceId
      });

      if (paymentCount !== ledgerPaymentCount) {
        missingPayments.push({
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          totalPayments: paymentCount,
          ledgerPayments: ledgerPaymentCount,
          missing: paymentCount - ledgerPaymentCount
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalInvoicesChecked: invoicesWithPayments.length,
      invoicesWithMissingPayments: missingPayments.length,
      missingPayments: missingPayments.slice(0, 50) // Limit to first 50 for readability
    });
  } catch (error) {
    console.error('Error checking missing payments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check missing payments',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
