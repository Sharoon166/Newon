'use server';

import { revalidatePath } from 'next/cache';
import {
  LedgerEntry,
  LedgerBreakdownLine,
  CustomerLedger,
  LedgerSummary,
  CreateLedgerEntryDto,
  LedgerFilters,
  PaginatedLedgerEntries,
  PaginatedCustomerLedgers
} from '../types';
import dbConnect from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import LedgerEntryModel from '@/models/LedgerEntry';
import CustomerModel from '@/models/Customer';
import mongoose from 'mongoose';

// Type for lean Mongoose document
interface LeanLedgerEntry {
  _id: Record<string, unknown>;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  transactionType: 'invoice' | 'payment' | 'adjustment' | 'credit_note' | 'debit_note';
  transactionId?: string;
  transactionNumber: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi' | 'card';
  reference?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

// Helper function to transform lean ledger entry
function transformLeanEntry(leanDoc: LeanLedgerEntry): LedgerEntry {
  return {
    ...leanDoc,
    id: leanDoc._id.toString(),
    _id: undefined,
    __v: undefined
  } as LedgerEntry;
}

export async function getLedgerEntries(filters?: LedgerFilters): Promise<PaginatedLedgerEntries> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (filters?.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters?.transactionType) {
      query.transactionType = filters.transactionType;
    }

    if (filters?.search) {
      query.$or = [
        { customerName: { $regex: filters.search, $options: 'i' } },
        { transactionNumber: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { reference: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.date = dateQuery;
    }

    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      const amountQuery: Record<string, number> = {};
      if (filters.minAmount !== undefined) {
        amountQuery.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        amountQuery.$lte = filters.maxAmount;
      }
      query.$or = [{ debit: amountQuery }, { credit: amountQuery }];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await LedgerEntryModel.paginate(query, {
      page,
      limit,
      sort: { date: -1, createdAt: -1 },
      lean: true
    });

    const transformedEntries = result.docs.map((entry: unknown) => transformLeanEntry(entry as LeanLedgerEntry));

    return {
      docs: transformedEntries,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page || 1,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
      nextPage: result.nextPage || null,
      prevPage: result.prevPage || null
    };
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    throw new Error('Failed to fetch ledger entries');
  }
}

export async function getCustomerLedgers(filters?: LedgerFilters): Promise<PaginatedCustomerLedgers> {
  try {
    await dbConnect();

    // Get cancelled invoice IDs to exclude from ledger calculations
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id').lean();
    const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

    // Exclude both invoice entries AND payment entries for cancelled invoices
    const matchStage: Record<string, unknown> = {
      $and: [
        {
          $or: [
            { transactionType: { $nin: ['invoice', 'payment'] } },
            {
              $and: [
                { transactionType: { $in: ['invoice', 'payment'] } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          ]
        }
      ]
    };

    if (filters?.search) {
      matchStage.$and = [
        {
          $or: [
            { customerName: { $regex: filters.search, $options: 'i' } },
            { customerCompany: { $regex: filters.search, $options: 'i' } }
          ]
        }
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      matchStage.date = dateQuery;
    }

    const pipeline: Record<string, unknown>[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$customerId',
          customerName: { $first: '$customerName' },
          customerCompany: { $first: '$customerCompany' },
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
          lastTransactionDate: { $max: '$date' }
        }
      },
      {
        $addFields: {
          currentBalance: { $subtract: ['$totalDebit', '$totalCredit'] }
        }
      }
    ];

    if (filters?.hasBalance !== undefined) {
      pipeline.push({
        $match: {
          currentBalance: filters.hasBalance ? { $gt: 0 } : { $lte: 0 }
        }
      });
    }

    pipeline.push({ $sort: { currentBalance: -1 } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggregateResult = await LedgerEntryModel.aggregate(pipeline as any);

    // Get customer details - filter out invalid ObjectIds
    const customerIds = aggregateResult
      .map(r => r._id)
      .filter(id => {
        // Check if it's a valid MongoDB ObjectId (24 hex characters)
        return /^[0-9a-fA-F]{24}$/.test(id);
      });

    const customers = customerIds.length > 0 ? await CustomerModel.find({ _id: { $in: customerIds } }).lean() : [];
    const customerMap = new Map(customers.map(c => [c._id.toString(), c]));

    const ledgers: CustomerLedger[] = aggregateResult.map(result => {
      const customer = customerMap.get(result._id);
      return {
        customerId: result._id,
        customerName: result.customerName,
        customerCompany: result.customerCompany,
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        currentBalance: result.currentBalance,
        lastTransactionDate: result.lastTransactionDate,
        entries: []
      };
    });

    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10000;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLedgers = ledgers.slice(startIndex, endIndex);

    return {
      docs: paginatedLedgers,
      totalDocs: ledgers.length,
      limit,
      page,
      totalPages: Math.ceil(ledgers.length / limit),
      hasNextPage: endIndex < ledgers.length,
      hasPrevPage: page > 1,
      nextPage: endIndex < ledgers.length ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  } catch (error) {
    console.error('Error fetching customer ledgers:', error);
    throw new Error('Failed to fetch customer ledgers');
  }
}

export async function getLedgerSummary(): Promise<LedgerSummary> {
  try {
    await dbConnect();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // Previous month for trends
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    lastMonthStart.setHours(0, 0, 0, 0);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setMilliseconds(-1);

    // Get cancelled invoice IDs to exclude from ledger calculations
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id').lean();
    const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Exclude both invoice entries AND payment entries for cancelled invoices
    const summary = await LedgerEntryModel.aggregate([
      {
        $match: {
          $or: [
            { transactionType: { $nin: ['invoice', 'payment'] } },
            {
              $and: [
                { transactionType: { $in: ['invoice', 'payment'] } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
          uniqueCustomers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          totalInvoiced: '$totalDebit',
          totalReceived: '$totalCredit',
          totalOutstanding: { $subtract: ['$totalDebit', '$totalCredit'] },
          totalCustomers: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    // Get monthly data - exclude cancelled invoice entries and their payments
    const monthlySummary = await LedgerEntryModel.aggregate([
      {
        $match: {
          date: { $gte: monthStart },
          $or: [
            { transactionType: { $nin: ['invoice', 'payment'] } },
            {
              $and: [
                { transactionType: { $in: ['invoice', 'payment'] } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          monthlyDebit: { $sum: '$debit' },
          monthlyCredit: { $sum: '$credit' }
        }
      }
    ]);

    // Get last month data for trends
    const lastMonthSummary = await LedgerEntryModel.aggregate([
      {
        $match: {
          date: { $gte: lastMonthStart, $lte: lastMonthEnd },
          $or: [
            { transactionType: { $nin: ['invoice', 'payment'] } },
            {
              $and: [
                { transactionType: { $in: ['invoice', 'payment'] } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          lastMonthDebit: { $sum: '$debit' },
          lastMonthCredit: { $sum: '$credit' }
        }
      }
    ]);

    // Count customers with balance - exclude cancelled invoice entries and their payments
    const customersWithBalance = await LedgerEntryModel.aggregate([
      {
        $match: {
          $or: [
            { transactionType: { $nin: ['invoice', 'payment'] } },
            {
              $and: [
                { transactionType: { $in: ['invoice', 'payment'] } },
                { transactionId: { $nin: cancelledInvoiceIds } }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: '$customerId',
          balance: { $sum: { $subtract: ['$debit', '$credit'] } }
        }
      },
      {
        $match: { balance: { $gt: 0 } }
      },
      {
        $count: 'count'
      }
    ]);

    // Calculate overdue amount from invoices
    const overdueInvoices = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $in: ['pending', 'partial'] },
          dueDate: { $lt: today },
          balanceAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalOverdue: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const result = summary[0] || {
      totalInvoiced: 0,
      totalReceived: 0,
      totalOutstanding: 0,
      totalCustomers: 0
    };

    const monthlyResult = monthlySummary[0] || {
      monthlyDebit: 0,
      monthlyCredit: 0
    };

    const lastMonthResult = lastMonthSummary[0] || {
      lastMonthDebit: 0,
      lastMonthCredit: 0
    };

    // Calculate trends
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalCustomers: result.totalCustomers,
      totalOutstanding: result.totalOutstanding,
      totalReceived: result.totalReceived,
      totalInvoiced: result.totalInvoiced,
      customersWithBalance: customersWithBalance[0]?.count || 0,
      overdueAmount: overdueInvoices[0]?.totalOverdue || 0,
      monthlyInvoiced: monthlyResult.monthlyDebit,
      monthlyInvoicedTrend: calculateTrend(monthlyResult.monthlyDebit, lastMonthResult.lastMonthDebit),
      monthlyReceived: monthlyResult.monthlyCredit,
      monthlyReceivedTrend: calculateTrend(monthlyResult.monthlyCredit, lastMonthResult.lastMonthCredit)
    };
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    throw new Error('Failed to fetch ledger summary');
  }
}

export async function getCustomerLedgerEntries(customerId: string): Promise<LedgerEntry[]> {
  try {
    await dbConnect();

    // Get cancelled invoice IDs to exclude
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id').lean();
    const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

    // Exclude both invoice entries AND payment entries for cancelled invoices
    const entries = await LedgerEntryModel.find({
      customerId,
      $or: [
        { transactionType: { $nin: ['invoice', 'payment'] } },
        {
          $and: [{ transactionType: { $in: ['invoice', 'payment'] } }, { transactionId: { $nin: cancelledInvoiceIds } }]
        }
      ]
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const transformed = entries.map((entry: unknown) => transformLeanEntry(entry as LeanLedgerEntry));

    // Read-only presentation merge: collapse the rows written by a single
    // GeneralPayment into one receipt row. Nothing is written or deleted.
    return await mergeGeneralPaymentGroups(transformed);
  } catch (error) {
    console.error(`Error fetching ledger entries for customer ${customerId}:`, error);
    throw new Error('Failed to fetch customer ledger entries');
  }
}

/**
 * Group ledger payment rows that originate from the same GeneralPayment.
 *
 * The ledger stores one row per allocation (PAY-xxxxxx-n) and never records
 * which GeneralPayment it came from. The link lives on the invoice:
 * `invoice.payments[].sourcePaymentId`, so we resolve it with two batched,
 * read-only queries and merge in memory.
 *
 * Guarantees:
 * - No document, schema or write path is touched — this runs after the query.
 * - The merged row is placed at the position of its newest child and copies
 *   that child's stored `balance`, which already reflects the whole event.
 *   Rows are only hidden, never recalculated, so every balance on screen is
 *   still a real stored value.
 * - If the join cannot be resolved (missing GP, desynced invoice payment),
 *   the rows are returned untouched.
 */
async function mergeGeneralPaymentGroups(entries: LedgerEntry[]): Promise<LedgerEntry[]> {
  const paymentRows = entries.filter(entry => entry.transactionType === 'payment' && entry.transactionId);
  if (paymentRows.length === 0) return entries;

  const InvoiceModel = (await import('@/models/Invoice')).default;
  const invoiceIds = [...new Set(paymentRows.map(entry => entry.transactionId as string))];
  const invoices = await InvoiceModel.find({ _id: { $in: invoiceIds } })
    .select('invoiceNumber payments.amount payments.sourceType payments.sourcePaymentId')
    .lean();

  // invoiceId -> invoice number (for breakdown labels)
  const invoiceNumbers = new Map<string, string>();
  // invoiceId -> GeneralPayment payments still waiting to be matched to a ledger row
  const pendingSources = new Map<string, { gpId: string; amount: number }[]>();

  for (const invoice of invoices) {
    const invoiceId = invoice._id.toString();
    invoiceNumbers.set(invoiceId, invoice.invoiceNumber);
    const sources = (invoice.payments ?? [])
      .filter(
        (payment: { sourceType?: string; sourcePaymentId?: string; amount?: number }) =>
          payment.sourceType === 'general' && Boolean(payment.sourcePaymentId)
      )
      .map(payment => ({
        gpId: String(payment.sourcePaymentId),
        amount: Number(payment.amount) || 0
      }));
    if (sources.length > 0) pendingSources.set(invoiceId, sources);
  }

  const rowsByGpId = new Map<string, LedgerEntry[]>();
  const addRow = (gpId: string, row: LedgerEntry) => {
    const rows = rowsByGpId.get(gpId);
    if (rows) rows.push(row);
    else rowsByGpId.set(gpId, [row]);
  };

  // Pass 1: match allocation rows to their GeneralPayment via invoice + amount
  for (const row of paymentRows) {
    const pending = pendingSources.get(row.transactionId as string);
    if (!pending) continue;
    const index = pending.findIndex(source => Math.abs(source.amount - row.credit) < 0.005);
    if (index === -1) continue;
    const [source] = pending.splice(index, 1);
    addRow(source.gpId, row);
  }

  if (rowsByGpId.size === 0) return entries;
  const gpIds = [...rowsByGpId.keys()];

  // Pass 2: the GeneralPayment's own "unallocated" row is keyed by the GP id
  for (const row of paymentRows) {
    if (row.transactionId && gpIds.includes(row.transactionId)) addRow(row.transactionId, row);
  }

  const GeneralPaymentModel = (await import('@/models/GeneralPayment')).default;
  const generalPayments = await GeneralPaymentModel.find({ _id: { $in: gpIds } })
    .select('paymentNumber method reference')
    .lean();
  const gpById = new Map(generalPayments.map(gp => [gp._id.toString(), gp]));

  const hiddenIds = new Set<string>();
  const parentByRowId = new Map<string, LedgerEntry>();

  for (const [gpId, rows] of rowsByGpId) {
    const gp = gpById.get(gpId);
    if (!gp) continue; // GP gone: leave the rows exactly as they are

    const [lead] = rows; // entries are sorted date desc / createdAt desc -> newest first
    const allocatedRows = rows.filter(row => row.transactionId !== gpId);
    const onAccountRows = rows.filter(row => row.transactionId === gpId);
    const onAccount = onAccountRows.reduce((sum, row) => sum + row.credit, 0);
    const credit = rows.reduce((sum, row) => sum + row.credit, 0);
    if (credit <= 0) continue;

    const invoiceLines = allocatedRows.map(row => ({
      kind: 'invoice' as const,
      label: invoiceNumbers.get(row.transactionId as string) ?? row.transactionId ?? '',
      invoiceId: row.transactionId,
      amount: row.credit
    }));

    const descriptionParts = ['Payment received'];
    if (invoiceLines.length > 1) descriptionParts.push(`allocated to ${invoiceLines.length} invoices`);
    if (onAccount > 0) descriptionParts.push(`${formatCurrency(onAccount, false)} on account`);

    const breakdown: LedgerBreakdownLine[] =
      onAccount > 0
        ? [...invoiceLines, { kind: 'on_account', label: 'On account', amount: onAccount }]
        : invoiceLines;

    parentByRowId.set(lead.id, {
      ...lead,
      transactionNumber: gp.paymentNumber,
      credit,
      debit: 0,
      paymentMethod: (gp.method as LedgerEntry['paymentMethod']) ?? lead.paymentMethod,
      reference: gp.reference ?? lead.reference,
      description: descriptionParts.join(' · '),
      breakdown
    });
    rows.forEach(row => hiddenIds.add(row.id));
  }

  if (parentByRowId.size === 0) return entries;

  return entries.flatMap(entry => {
    const parent = parentByRowId.get(entry.id);
    if (parent) return [parent];
    if (hiddenIds.has(entry.id)) return [];
    return [entry];
  });
}

// Helper function to get customer balance at a specific point in time
async function getCustomerBalanceBeforeDate(customerId: string, date: Date, createdAt?: Date): Promise<number> {
  // Get cancelled invoice IDs to exclude
  const InvoiceModel = (await import('@/models/Invoice')).default;
  const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id').lean();
  const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

  const matchCondition: Record<string, unknown> = {
    customerId,
    // Exclude cancelled invoice entries and their payments
    $or: [
      { transactionType: { $nin: ['invoice', 'payment'] } },
      {
        $and: [{ transactionType: { $in: ['invoice', 'payment'] } }, { transactionId: { $nin: cancelledInvoiceIds } }]
      }
    ]
  };

  if (createdAt) {
    // Get balance before this specific entry (by date and creation time)
    matchCondition.$and = [
      matchCondition.$or ? { $or: matchCondition.$or } : {},
      {
        $or: [
          { date: { $lt: date } },
          {
            date: date,
            createdAt: { $lt: createdAt }
          }
        ]
      }
    ];
    delete matchCondition.$or;
  } else {
    // Get balance before this date
    matchCondition.$and = [matchCondition.$or ? { $or: matchCondition.$or } : {}, { date: { $lt: date } }];
    delete matchCondition.$or;
  }

  const result = await LedgerEntryModel.aggregate([
    { $match: matchCondition },
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
  return result[0]?.balance || 0;
}

// Helper function to get customer balance (all entries)
export async function getCustomerBalance(customerId: string): Promise<number> {
  // Get cancelled invoice IDs to exclude
  const InvoiceModel = (await import('@/models/Invoice')).default;
  const cancelledInvoices = await InvoiceModel.find({ status: 'cancelled' }).select('_id').lean();
  const cancelledInvoiceIds = cancelledInvoices.map(inv => inv._id.toString());

  const result = await LedgerEntryModel.aggregate([
    {
      $match: {
        customerId,
        // Exclude cancelled invoice entries and their payments
        $or: [
          { transactionType: { $nin: ['invoice', 'payment'] } },
          {
            $and: [
              { transactionType: { $in: ['invoice', 'payment'] } },
              { transactionId: { $nin: cancelledInvoiceIds } }
            ]
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
  return result[0]?.balance || 0;
}

export async function createLedgerEntry(data: CreateLedgerEntryDto): Promise<LedgerEntry> {
  try {
    await dbConnect();

    // Get previous balance for the customer at this point in time
    const previousBalance = await getCustomerBalanceBeforeDate(data.customerId, data.date);

    // Calculate new balance
    const newBalance = previousBalance + data.debit - data.credit;

    const entry = new LedgerEntryModel({
      ...data,
      balance: newBalance
    });

    await entry.save();

    // Update all subsequent entries for this customer (entries after this one by date/time)
    const balanceChange = data.debit - data.credit;
    if (balanceChange !== 0) {
      await LedgerEntryModel.updateMany(
        {
          customerId: data.customerId,
          $or: [
            { date: { $gt: data.date } },
            {
              date: data.date,
              createdAt: { $gt: entry.createdAt }
            }
          ]
        },
        {
          $inc: { balance: balanceChange }
        }
      );
    }

    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    revalidatePath(`/customers/${data.customerId}`);

    return transformLeanEntry(entry.toObject() as unknown as LeanLedgerEntry);
  } catch (error: unknown) {
    console.error('Error creating ledger entry:', error);
    throw new Error((error as Error).message || 'Failed to create ledger entry');
  }
}

export async function createLedgerEntryFromInvoice(invoiceData: {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: Date;
  totalAmount: number;
  createdBy: string;
}): Promise<LedgerEntry> {
  try {
    const entry = await createLedgerEntry({
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerCompany: invoiceData.customerCompany,
      transactionType: 'invoice',
      transactionId: invoiceData.id,
      transactionNumber: invoiceData.invoiceNumber,
      date: invoiceData.date,
      description: `Invoice ${invoiceData.invoiceNumber}`,
      debit: invoiceData.totalAmount,
      credit: 0,
      createdBy: invoiceData.createdBy
    });

    return entry;
  } catch (error) {
    console.error('Error creating ledger entry from invoice:', error);
    throw new Error('Failed to create ledger entry from invoice');
  }
}

export async function createLedgerEntryFromPayment(paymentData: {
  id: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: Date;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi' | 'card';
  reference?: string;
  createdBy: string;
}): Promise<LedgerEntry> {
  try {
    // Generate unique transaction number for this payment
    // Count existing payment entries for this invoice to create unique number
    const existingPayments = await LedgerEntryModel.countDocuments({
      transactionType: 'payment',
      transactionId: paymentData.id
    });

    const paymentNumber = existingPayments + 1;
    const transactionNumber = `PAY-${paymentData.id.slice(-6).toUpperCase()}-${paymentNumber}`;

    const entry = await createLedgerEntry({
      customerId: paymentData.customerId,
      customerName: paymentData.customerName,
      customerCompany: paymentData.customerCompany,
      transactionType: 'payment',
      transactionId: paymentData.id,
      transactionNumber,
      date: paymentData.date,
      description: 'Payment received',
      debit: 0,
      credit: paymentData.amount,
      paymentMethod: paymentData.method,
      reference: paymentData.reference,
      createdBy: paymentData.createdBy
    });

    return entry;
  } catch (error) {
    console.error('Error creating ledger entry from payment:', error);
    throw new Error('Failed to create ledger entry from payment');
  }
}

export async function updateLedgerEntryFromInvoice(
  invoiceData: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
  },
  session: mongoose.ClientSession | null = null
): Promise<void> {
  try {
    await dbConnect();

    // Find the ledger entry for this invoice
    const entry = await LedgerEntryModel.findOne({
      transactionType: 'invoice',
      transactionId: invoiceData.id
    }).session(session);

    if (!entry) {
      console.warn(`No ledger entry found for invoice ${invoiceData.id}`);
      return;
    }

    // Calculate the difference
    const oldDebit = entry.debit;
    const newDebit = invoiceData.totalAmount;
    const difference = newDebit - oldDebit;

    // Update the entry
    entry.debit = newDebit;
    entry.description = `Invoice ${invoiceData.invoiceNumber}`;

    // Use the helper function to get balance before this entry (excludes cancelled invoices)
    const balanceBefore = await getCustomerBalanceBeforeDate(entry.customerId, entry.date, entry.createdAt);

    // New balance = balance before this entry + this entry's debit - this entry's credit
    entry.balance = balanceBefore + entry.debit - entry.credit;

    await entry.save({ session });

    // Update all subsequent entries for this customer
    if (difference !== 0) {
      await LedgerEntryModel.updateMany(
        {
          customerId: entry.customerId,
          $or: [
            { date: { $gt: entry.date } },
            {
              date: entry.date,
              createdAt: { $gt: entry.createdAt }
            }
          ]
        },
        {
          $inc: { balance: difference }
        },
        { session: session ?? undefined }
      );
    }

    revalidatePath('/ledger');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error updating ledger entry from invoice:', error);
    throw new Error('Failed to update ledger entry from invoice');
  }
}

export async function deleteLedgerEntryFromInvoice(invoiceId: string): Promise<void> {
  try {
    await dbConnect();

    // Find and delete the ledger entry for this invoice
    const entry = await LedgerEntryModel.findOne({
      transactionType: 'invoice',
      transactionId: invoiceId
    });

    if (!entry) {
      console.warn(`No ledger entry found for invoice ${invoiceId}`);
      return;
    }

    const customerId = entry.customerId;
    const entryDate = entry.date;
    const entryCreatedAt = entry.createdAt;
    const debitAmount = entry.debit;
    const creditAmount = entry.credit;
    const balanceChange = debitAmount - creditAmount;

    // Delete the entry
    await LedgerEntryModel.deleteOne({ _id: entry._id });

    // Update all subsequent entries for this customer (entries after this one by date/time)
    await LedgerEntryModel.updateMany(
      {
        customerId,
        $or: [
          { date: { $gt: entryDate } },
          {
            date: entryDate,
            createdAt: { $gt: entryCreatedAt }
          }
        ]
      },
      {
        $inc: { balance: -balanceChange }
      }
    );

    revalidatePath('/ledger');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error deleting ledger entry from invoice:', error);
    throw new Error('Failed to delete ledger entry from invoice');
  }
}

export async function updateLedgerEntryFromPayment(paymentData: {
  invoiceId: string;
  paymentIndex: number;
  oldAmount: number;
  newAmount: number;
  newDate: Date;
  newMethod: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi' | 'card';
  newReference?: string;
}): Promise<void> {
  try {
    await dbConnect();

    // Find the ledger entry for this payment
    // Payment entries are linked by transactionId (invoiceId) and we need to find the specific payment
    // Since multiple payments can exist for one invoice, we need a better way to identify them
    // For now, we'll find all payment entries for this invoice and update by index
    const entries = await LedgerEntryModel.find({
      transactionType: 'payment',
      transactionId: paymentData.invoiceId
    }).sort({ createdAt: 1 });

    if (!entries || entries.length <= paymentData.paymentIndex) {
      console.warn(`No ledger entry found for payment ${paymentData.paymentIndex} of invoice ${paymentData.invoiceId}`);
      return;
    }

    const entry = entries[paymentData.paymentIndex];

    // Calculate the difference
    const oldCredit = entry.credit;
    const newCredit = paymentData.newAmount;
    const difference = newCredit - oldCredit;

    // Update the entry
    entry.credit = newCredit;
    entry.date = paymentData.newDate;
    entry.paymentMethod = paymentData.newMethod;
    entry.reference = paymentData.newReference;

    // Use the helper function to get balance before this entry (excludes cancelled invoices)
    const balanceBefore = await getCustomerBalanceBeforeDate(entry.customerId, entry.date, entry.createdAt);

    // New balance = balance before this entry + this entry's debit - this entry's credit
    entry.balance = balanceBefore + entry.debit - entry.credit;

    await entry.save();

    // Update all subsequent entries for this customer
    if (difference !== 0) {
      await LedgerEntryModel.updateMany(
        {
          customerId: entry.customerId,
          $or: [
            { date: { $gt: entry.date } },
            {
              date: entry.date,
              createdAt: { $gt: entry.createdAt }
            }
          ]
        },
        {
          $inc: { balance: -difference } // Negative because credit reduces balance
        }
      );
    }

    revalidatePath('/ledger');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error updating ledger entry from payment:', error);
    throw new Error('Failed to update ledger entry from payment');
  }
}

export async function deleteLedgerEntryFromPayment(paymentData: {
  invoiceId: string;
  paymentIndex: number;
}): Promise<void> {
  try {
    await dbConnect();

    // Find the ledger entry for this payment
    const entries = await LedgerEntryModel.find({
      transactionType: 'payment',
      transactionId: paymentData.invoiceId
    }).sort({ createdAt: 1 });

    if (!entries || entries.length <= paymentData.paymentIndex) {
      console.warn(`No ledger entry found for payment ${paymentData.paymentIndex} of invoice ${paymentData.invoiceId}`);
      return;
    }

    const entry = entries[paymentData.paymentIndex];
    const customerId = entry.customerId;
    const entryDate = entry.date;
    const entryCreatedAt = entry.createdAt;
    const debitAmount = entry.debit;
    const creditAmount = entry.credit;
    const balanceChange = debitAmount - creditAmount;

    // Delete the entry
    await LedgerEntryModel.deleteOne({ _id: entry._id });

    // Update all subsequent entries for this customer (entries after this one by date/time)
    await LedgerEntryModel.updateMany(
      {
        customerId,
        $or: [
          { date: { $gt: entryDate } },
          {
            date: entryDate,
            createdAt: { $gt: entryCreatedAt }
          }
        ]
      },
      {
        $inc: { balance: -balanceChange }
      }
    );

    revalidatePath('/ledger');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error deleting ledger entry from payment:', error);
    throw new Error('Failed to delete ledger entry from payment');
  }
}
