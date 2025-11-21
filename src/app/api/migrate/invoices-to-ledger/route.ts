import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import LedgerEntry from '@/models/LedgerEntry';

export async function GET() {
  try {
    await dbConnect();

    // Check if ledger entries already exist
    const existingEntriesCount = await LedgerEntry.countDocuments();
    if (existingEntriesCount > 0) {
      return NextResponse.json({
        success: false,
        message: 'Ledger entries already exist. Clear ledger entries first if you want to re-migrate.',
        existingCount: existingEntriesCount
      }, { status: 400 });
    }

    // Get all invoices (not quotations)
    const invoices = await Invoice.find({ 
      type: 'invoice',
      invoiceNumber: { $exists: true, $ne: null }
    }).sort({ date: 1 }).lean();

    if (invoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoices found to migrate',
        migrated: 0
      });
    }

    const ledgerEntries = [];
    const customerBalances = new Map<string, number>();

    // Create ledger entries for each invoice
    for (const invoice of invoices) {
      const customerId = invoice.customerId;
      const previousBalance = customerBalances.get(customerId) || 0;
      
      // Calculate new balance
      const newBalance = previousBalance + invoice.totalAmount;
      customerBalances.set(customerId, newBalance);

      // Create invoice ledger entry (debit)
      const invoiceEntry = {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerCompany: invoice.customerCompany,
        transactionType: 'invoice',
        transactionId: invoice._id.toString(),
        transactionNumber: invoice.invoiceNumber,
        date: invoice.date,
        description: `Invoice ${invoice.invoiceNumber}`,
        debit: invoice.totalAmount,
        credit: 0,
        balance: newBalance,
        createdBy: invoice.createdBy || 'system'
      };

      ledgerEntries.push(invoiceEntry);

      // Create payment ledger entries (credit) if invoice has payments
      if (invoice.payments && invoice.payments.length > 0) {
        // Sort payments by date to maintain chronological order
        const sortedPayments = [...invoice.payments].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        for (const payment of sortedPayments) {
          const currentBalance = customerBalances.get(customerId) || 0;
          const newPaymentBalance = currentBalance - payment.amount;
          customerBalances.set(customerId, newPaymentBalance);

          const paymentEntry = {
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            customerCompany: invoice.customerCompany,
            transactionType: 'payment',
            transactionId: invoice._id.toString(),
            transactionNumber: `PAY-${invoice.invoiceNumber}-${payment.date.getTime().toString().slice(-6)}`,
            date: payment.date,
            description: `Payment for ${invoice.invoiceNumber}`,
            debit: 0,
            credit: payment.amount,
            balance: newPaymentBalance,
            paymentMethod: payment.method,
            reference: payment.reference,
            createdBy: invoice.createdBy || 'system'
          };

          ledgerEntries.push(paymentEntry);
        }
      }
    }

    // Bulk insert all ledger entries
    const result = await LedgerEntry.insertMany(ledgerEntries, { ordered: true });

    return NextResponse.json({
      success: true,
      message: 'Successfully migrated invoices to ledger',
      migrated: result.length,
      invoicesProcessed: invoices.length,
      details: {
        invoiceEntries: ledgerEntries.filter(e => e.transactionType === 'invoice').length,
        paymentEntries: ledgerEntries.filter(e => e.transactionType === 'payment').length,
        uniqueCustomers: customerBalances.size
      }
    });

  } catch (error) {
    console.error('Error migrating invoices to ledger:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to migrate invoices to ledger',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
