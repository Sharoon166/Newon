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

    // Get all invoices (not quotations, not cancelled)
    const invoices = await Invoice.find({ 
      type: 'invoice',
      status: { $ne: 'cancelled' },
      invoiceNumber: { $exists: true, $ne: null }
    }).sort({ date: 1 }).lean();

    if (invoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoices found to migrate',
        migrated: 0
      });
    }

    // Collect all entries (invoices + payments) with timestamps
    interface EntryToInsert {
      customerId: string;
      customerName: string;
      customerCompany?: string;
      transactionType: 'invoice' | 'payment';
      transactionId: string;
      transactionNumber: string;
      date: Date;
      description: string;
      debit: number;
      credit: number;
      balance: number;
      paymentMethod?: string;
      reference?: string;
      createdBy: string;
      sortKey: number;
    }

    const allEntries: EntryToInsert[] = [];

    // Create entries for each invoice and its payments
    for (const invoice of invoices) {
      // Create invoice ledger entry (debit)
      allEntries.push({
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
        balance: 0, // Will be calculated later
        createdBy: invoice.createdBy || 'system',
        sortKey: new Date(invoice.date).getTime()
      });

      // Create payment ledger entries (credit) if invoice has payments
      if (invoice.payments && invoice.payments.length > 0) {
        for (const payment of invoice.payments) {
          allEntries.push({
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            customerCompany: invoice.customerCompany,
            transactionType: 'payment',
            transactionId: invoice._id.toString(),
            transactionNumber: `PAY-${invoice.invoiceNumber}-${new Date(payment.date).getTime().toString().slice(-6)}`,
            date: payment.date,
            description: `Payment for ${invoice.invoiceNumber}`,
            debit: 0,
            credit: payment.amount,
            balance: 0, // Will be calculated later
            paymentMethod: payment.method,
            reference: payment.reference,
            createdBy: invoice.createdBy || 'system',
            sortKey: new Date(payment.date).getTime()
          });
        }
      }
    }

    // Sort all entries by date (and sortKey for same dates)
    allEntries.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      return a.sortKey - b.sortKey;
    });

    // Calculate running balances per customer
    const customerBalances = new Map<string, number>();

    for (const entry of allEntries) {
      const currentBalance = customerBalances.get(entry.customerId) || 0;
      const newBalance = currentBalance + entry.debit - entry.credit;
      entry.balance = newBalance;
      customerBalances.set(entry.customerId, newBalance);
    }

    // Remove sortKey before inserting
    const ledgerEntries = allEntries.map(({ sortKey, ...entry }) => entry);

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
