/**
 * Ledger Model (MongoDB/Mongoose)
 * 
 * This file defines the database schema for the ledger system.
 * Uncomment and implement when ready to connect to database.
 */

// import mongoose, { Schema, Document } from 'mongoose';

/**
 * LedgerEntry Document Interface
 * Extends the LedgerEntry type with Mongoose Document properties
 */
// interface ILedgerEntry extends Document {
//   customerId: string;
//   customerName: string;
//   customerCompany?: string;
//   transactionType: 'invoice' | 'payment' | 'adjustment' | 'credit_note' | 'debit_note';
//   transactionId?: string;
//   transactionNumber: string;
//   date: Date;
//   description: string;
//   debit: number;
//   credit: number;
//   balance: number;
//   paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi' | 'card';
//   reference?: string;
//   notes?: string;
//   createdBy: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

/**
 * Ledger Schema Definition
 * 
 * Fields explained:
 * - customerId: Reference to Customer collection (indexed for fast queries)
 * - customerName: Denormalized for performance (avoid joins)
 * - customerCompany: Optional company name
 * - transactionType: Type of transaction (invoice, payment, adjustment, etc.)
 * - transactionId: Reference to source document (Invoice, Payment, etc.)
 * - transactionNumber: Human-readable transaction number
 * - date: Transaction date (indexed for date range queries)
 * - description: Transaction description
 * - debit: Amount owed by customer (increases balance)
 * - credit: Amount paid by customer (decreases balance)
 * - balance: Running balance after this transaction
 * - paymentMethod: Method of payment (if applicable)
 * - reference: External reference (cheque number, transaction ID, etc.)
 * - notes: Additional notes
 * - createdBy: User who created the entry
 * - createdAt: Auto-generated timestamp
 * - updatedAt: Auto-generated timestamp
 */
// const LedgerEntrySchema = new Schema<ILedgerEntry>(
//   {
//     customerId: {
//       type: String,
//       required: true,
//       index: true // Index for fast customer queries
//     },
//     customerName: {
//       type: String,
//       required: true,
//       index: true // Index for search functionality
//     },
//     customerCompany: {
//       type: String,
//       index: true // Index for search functionality
//     },
//     transactionType: {
//       type: String,
//       required: true,
//       enum: ['invoice', 'payment', 'adjustment', 'credit_note', 'debit_note'],
//       index: true // Index for filtering by type
//     },
//     transactionId: {
//       type: String,
//       index: true // Index for linking to source documents
//     },
//     transactionNumber: {
//       type: String,
//       required: true,
//       unique: true, // Ensure unique transaction numbers
//       index: true // Index for search functionality
//     },
//     date: {
//       type: Date,
//       required: true,
//       index: true // Index for date range queries
//     },
//     description: {
//       type: String,
//       required: true
//     },
//     debit: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: 0 // Debit cannot be negative
//     },
//     credit: {
//       type: Number,
//       required: true,
//       default: 0,
//       min: 0 // Credit cannot be negative
//     },
//     balance: {
//       type: Number,
//       required: true,
//       default: 0,
//       index: true // Index for balance queries
//     },
//     paymentMethod: {
//       type: String,
//       enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi', 'card']
//     },
//     reference: {
//       type: String,
//       index: true // Index for reference searches
//     },
//     notes: {
//       type: String
//     },
//     createdBy: {
//       type: String,
//       required: true
//     }
//   },
//   {
//     timestamps: true, // Automatically add createdAt and updatedAt
//     collection: 'ledger_entries' // Collection name
//   }
// );

/**
 * Compound Indexes
 * These indexes improve query performance for common operations
 */
// LedgerEntrySchema.index({ customerId: 1, date: -1 }); // Customer ledger sorted by date
// LedgerEntrySchema.index({ date: -1, transactionType: 1 }); // Date range with type filter
// LedgerEntrySchema.index({ customerId: 1, balance: -1 }); // Customer balance queries

/**
 * Virtual Fields
 * Computed fields that don't exist in the database
 */
// LedgerEntrySchema.virtual('amount').get(function() {
//   return this.debit - this.credit;
// });

/**
 * Instance Methods
 */
// LedgerEntrySchema.methods.isDebit = function(): boolean {
//   return this.debit > 0;
// };

// LedgerEntrySchema.methods.isCredit = function(): boolean {
//   return this.credit > 0;
// };

/**
 * Static Methods
 */
// LedgerEntrySchema.statics.getCustomerBalance = async function(customerId: string): Promise<number> {
//   const result = await this.aggregate([
//     { $match: { customerId } },
//     { $group: {
//       _id: null,
//       totalDebit: { $sum: '$debit' },
//       totalCredit: { $sum: '$credit' }
//     }},
//     { $project: {
//       balance: { $subtract: ['$totalDebit', '$totalCredit'] }
//     }}
//   ]);
//   return result[0]?.balance || 0;
// };

// LedgerEntrySchema.statics.getCustomerLedger = async function(customerId: string) {
//   return this.find({ customerId }).sort({ date: -1 });
// };

/**
 * Pre-save Hook
 * Validate that either debit or credit is set, but not both
 */
// LedgerEntrySchema.pre('save', function(next) {
//   if (this.debit > 0 && this.credit > 0) {
//     next(new Error('Entry cannot have both debit and credit'));
//   }
//   if (this.debit === 0 && this.credit === 0) {
//     next(new Error('Entry must have either debit or credit'));
//   }
//   next();
// });

/**
 * Post-save Hook
 * Update customer balance after saving entry
 */
// LedgerEntrySchema.post('save', async function(doc) {
//   // Update customer's current balance in Customer collection
//   // const balance = await this.constructor.getCustomerBalance(doc.customerId);
//   // await CustomerModel.updateOne(
//   //   { _id: doc.customerId },
//   //   { currentBalance: balance }
//   // );
// });

/**
 * Export Model
 */
// export const LedgerEntryModel = mongoose.models.LedgerEntry || 
//   mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);

/**
 * Usage Examples:
 * 
 * 1. Create a ledger entry from invoice:
 *    const entry = new LedgerEntryModel({
 *      customerId: invoice.customerId,
 *      customerName: invoice.customerName,
 *      transactionType: 'invoice',
 *      transactionId: invoice._id,
 *      transactionNumber: invoice.invoiceNumber,
 *      date: invoice.date,
 *      description: `Invoice ${invoice.invoiceNumber}`,
 *      debit: invoice.totalAmount,
 *      credit: 0,
 *      balance: previousBalance + invoice.totalAmount,
 *      createdBy: userId
 *    });
 *    await entry.save();
 * 
 * 2. Create a ledger entry from payment:
 *    const entry = new LedgerEntryModel({
 *      customerId: payment.customerId,
 *      customerName: payment.customerName,
 *      transactionType: 'payment',
 *      transactionId: payment._id,
 *      transactionNumber: `PAY-${payment._id}`,
 *      date: payment.date,
 *      description: 'Payment received',
 *      debit: 0,
 *      credit: payment.amount,
 *      balance: previousBalance - payment.amount,
 *      paymentMethod: payment.method,
 *      reference: payment.reference,
 *      createdBy: userId
 *    });
 *    await entry.save();
 * 
 * 3. Get customer balance:
 *    const balance = await LedgerEntryModel.getCustomerBalance(customerId);
 * 
 * 4. Get customer ledger:
 *    const entries = await LedgerEntryModel.getCustomerLedger(customerId);
 * 
 * 5. Query with filters:
 *    const entries = await LedgerEntryModel.find({
 *      customerId,
 *      date: { $gte: startDate, $lte: endDate },
 *      transactionType: 'invoice'
 *    }).sort({ date: -1 });
 */

export {};
