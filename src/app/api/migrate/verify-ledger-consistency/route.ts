import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import LedgerEntryModel from '@/models/LedgerEntry';

export async function GET() {
  try {
    await dbConnect();

    const issues: Array<{
      type: string;
      description: string;
      count: number;
      details?: unknown;
    }> = [];

    // Check 1: Cancelled invoices with ledger entries
    const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id invoiceNumber').lean();
    const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

    const ledgerEntriesForCancelled = await LedgerEntryModel.countDocuments({
      transactionType: { $in: ['invoice', 'payment'] },
      transactionId: { $in: cancelledInvoiceIds }
    });

    if (ledgerEntriesForCancelled > 0) {
      issues.push({
        type: 'cancelled_invoice_entries',
        description: 'Ledger entries exist for cancelled invoices (these are excluded from calculations but remain for audit)',
        count: ledgerEntriesForCancelled,
        details: {
          cancelledInvoices: cancelledInvoices.length,
          note: 'This is expected behavior - entries remain for audit trail'
        }
      });
    }

    // Check 2: Invoices with payments that have mismatched ledger entries
    const invoicesWithPayments = await InvoiceModel.find({
      type: 'invoice',
      'payments.0': { $exists: true }
    }).lean();

    let mismatchedPayments = 0;
    const mismatchedInvoices: string[] = [];

    for (const invoice of invoicesWithPayments) {
      const invoiceId = invoice._id.toString();
      const paymentCount = invoice.payments?.length || 0;
      const ledgerPaymentCount = await LedgerEntryModel.countDocuments({
        transactionType: 'payment',
        transactionId: invoiceId
      });

      if (paymentCount !== ledgerPaymentCount) {
        mismatchedPayments++;
        mismatchedInvoices.push(invoice.invoiceNumber);
      }
    }

    if (mismatchedPayments > 0) {
      issues.push({
        type: 'mismatched_payments',
        description: 'Invoices where payment count does not match ledger entry count',
        count: mismatchedPayments,
        details: {
          invoices: mismatchedInvoices.slice(0, 10),
          note: mismatchedInvoices.length > 10 ? `Showing first 10 of ${mismatchedInvoices.length}` : undefined
        }
      });
    }

    // Check 3: Duplicate transaction numbers
    const duplicates = await LedgerEntryModel.aggregate([
      {
        $group: {
          _id: '$transactionNumber',
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_transaction_numbers',
        description: 'Duplicate transaction numbers found',
        count: duplicates.length,
        details: {
          examples: duplicates.slice(0, 5).map(d => ({
            transactionNumber: d._id,
            count: d.count
          }))
        }
      });
    }

    // Check 4: Invoices with payments but status not 'partial' or 'paid'
    const incorrectStatus = await InvoiceModel.countDocuments({
      type: 'invoice',
      status: { $nin: ['paid', 'partial', 'cancelled'] },
      paidAmount: { $gt: 0 }
    });

    if (incorrectStatus > 0) {
      issues.push({
        type: 'incorrect_invoice_status',
        description: 'Invoices with payments but incorrect status',
        count: incorrectStatus
      });
    }

    // Check 5: Partially paid invoices (should not be cancellable)
    const partiallyPaidCancelled = await InvoiceModel.countDocuments({
      status: 'cancelled',
      paidAmount: { $gt: 0 }
    });

    if (partiallyPaidCancelled > 0) {
      issues.push({
        type: 'cancelled_with_payments',
        description: 'Cancelled invoices that have payments (should not be allowed)',
        count: partiallyPaidCancelled,
        details: {
          note: 'These invoices were cancelled but have payments - this should not be possible with current validation'
        }
      });
    }

    return NextResponse.json({
      success: true,
      totalIssues: issues.length,
      issues,
      summary: issues.length === 0 
        ? 'No consistency issues found' 
        : `Found ${issues.length} types of issues`
    });
  } catch (error) {
    console.error('Error verifying ledger consistency:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify ledger consistency',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
