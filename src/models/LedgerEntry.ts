import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

interface ILedgerEntry extends Document {
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
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
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    customerId: {
      type: String,
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      index: true
    },
    customerCompany: {
      type: String,
      index: true
    },
    customerEmail: {
      type: String,
      index: true
    },
    customerPhone: {
      type: String,
      index: true
    },
    transactionType: {
      type: String,
      required: true,
      enum: ['invoice', 'payment', 'adjustment', 'credit_note', 'debit_note'],
      index: true
    },
    transactionId: {
      type: String,
      index: true
    },
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    debit: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    credit: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    balance: {
      type: Number,
      required: true,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi', 'card']
    },
    reference: {
      type: String,
      index: true
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for better query performance
ledgerEntrySchema.index({ customerId: 1, date: -1 });
ledgerEntrySchema.index({ customerEmail: 1, date: -1 });
ledgerEntrySchema.index({ date: -1, transactionType: 1 });
ledgerEntrySchema.index({ customerId: 1, balance: -1 });

// Virtual field for amount
ledgerEntrySchema.virtual('amount').get(function() {
  return this.debit - this.credit;
});

// Static method to get customer balance
ledgerEntrySchema.statics.getCustomerBalance = async function(customerId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { customerId } },
    { $group: {
      _id: null,
      totalDebit: { $sum: '$debit' },
      totalCredit: { $sum: '$credit' }
    }},
    { $project: {
      balance: { $subtract: ['$totalDebit', '$totalCredit'] }
    }}
  ]);
  return result[0]?.balance || 0;
};

// Pre-save validation
ledgerEntrySchema.pre('save', function(next) {
  if (this.debit > 0 && this.credit > 0) {
    next(new Error('Entry cannot have both debit and credit'));
  }
  if (this.debit === 0 && this.credit === 0) {
    next(new Error('Entry must have either debit or credit'));
  }
  next();
});

// Add pagination plugin
ledgerEntrySchema.plugin(mongoosePaginate);

// Delete the model if it exists
if (mongoose.models.LedgerEntry) {
  delete mongoose.models.LedgerEntry;
}

const LedgerEntry = mongoose.model<ILedgerEntry, mongoose.PaginateModel<ILedgerEntry>>('LedgerEntry', ledgerEntrySchema);

export default LedgerEntry;
