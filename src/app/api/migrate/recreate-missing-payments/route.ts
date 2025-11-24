import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import LedgerEntryModel from '@/models/LedgerEntry';

export async function POST() {
  try {
    await dbConnect();

    // Get all invoices with payments
    const invoicesWithPayments = await InvoiceModel.find({
      type: 'invoice',
      'payments.0': { $exists: true }
    }).lean();

    let paymentsRecreated = 0;
    const errors: string[] = [];

    for (const invoice of invoicesWithPayments) {
      try {
        const invoiceId = invoice._id.toString();
        const payments = invoice.payments || [];

        // Get existing payment ledger entries for this invoice
        const existingPaymentEntries = await LedgerEntryModel.find({
          transactionType: 'payment',
          transactionId: invoiceId
        }).sort({ createdAt: 1 }).lean();

        // If we have fewer ledger entries than payments, recreate missing ones
        if (existingPaymentEntries.length < payments.length) {
          // Delete all existing payment entries for this invoice to recreate them properly
          await LedgerEntryModel.deleteMany({
            transactionType: 'payment',
            transactionId: invoiceId
          });

          // Recreate all payment entries with proper transaction numbers
          for (let i = 0; i < payments.length; i++) {
            const payment = payments[i];
            const paymentNumber = i + 1;
            const transactionNumber = `PAY-${invoiceId.slice(-6).toUpperCase()}-${paymentNumber}`;

            // Get balance before this payment
            const balanceBeforeResult = await LedgerEntryModel.aggregate([
              {
                $match: {
                  customerId: invoice.customerId,
                  $or: [
                    { date: { $lt: payment.date } },
                    {
                      date: payment.date,
                      createdAt: { $lt: new Date() }
                    }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  totalDebit: { $sum: '$debit' },
                  totalCredit: { $sum: '$credit' }
                }
              },
              {
                $project: {
                  balance: { $subtract: ['$totalDebit', '$totalCredit'] }
                }
              }
            ]);

            const balanceBefore = balanceBeforeResult[0]?.balance || 0;
            const newBalance = balanceBefore - payment.amount;

            await LedgerEntryModel.create({
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              customerCompany: invoice.customerCompany,
              transactionType: 'payment',
              transactionId: invoiceId,
              transactionNumber,
              date: payment.date,
              description: 'Payment received',
              debit: 0,
              credit: payment.amount,
              balance: newBalance,
              paymentMethod: payment.method,
              reference: payment.reference,
              createdBy: invoice.createdBy
            });

            paymentsRecreated++;
          }

          // Update all subsequent entries for this customer
          const lastPaymentDate = payments[payments.length - 1].date;
          await LedgerEntryModel.updateMany(
            {
              customerId: invoice.customerId,
              date: { $gt: lastPaymentDate }
            },
            {
              $inc: { balance: 0 } // Trigger recalculation
            }
          );
        }
      } catch (invoiceError) {
        console.error(`Error recreating payments for invoice ${invoice.invoiceNumber}:`, invoiceError);
        errors.push(`Invoice ${invoice.invoiceNumber}: ${(invoiceError as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recreated ${paymentsRecreated} payment ledger entries`,
      totalInvoicesProcessed: invoicesWithPayments.length,
      paymentsRecreated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error recreating missing payments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to recreate missing payments',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
