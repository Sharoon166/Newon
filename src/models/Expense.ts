import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

interface IPaymentTransaction {
  amount: number;
  date: Date;
  source: 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other';
  notes?: string;
  addedBy: string;
  addedByName?: string;
  createdAt: Date;
}

interface IExpense extends Document {
  expenseId: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  vendor?: string;
  receipt?: string;
  notes?: string;
  addedBy: string;
  addedByName?: string;
  source: 'manual' | 'invoice' | 'project';
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  actualCost?: number;
  clientCost?: number;
  transactions: IPaymentTransaction[];
  totalPaid: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount must be positive']
    },
    date: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now
    },
    source: {
      type: String,
      enum: ['cash', 'jazzcash', 'easypaisa', 'bank-transfer', 'cheque', 'other'],
      required: [true, 'Payment source is required']
    },
    notes: {
      type: String,
      trim: true
    },
    addedBy: {
      type: String,
      required: [true, 'Added by is required']
    },
    addedByName: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const expenseSchema = new Schema<IExpense>(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    expenseId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'materials',
        'labor',
        'equipment',
        'transport',
        'rent',
        'utilities',
        'fuel',
        'maintenance',
        'marketing',
        'office-supplies',
        'professional-services',
        'insurance',
        'taxes',
        'other'
      ]
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true
    },
    vendor: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    addedBy: {
      type: String,
      required: [true, 'Added by is required'],
      index: true
    },
    addedByName: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ['manual', 'invoice', 'project'],
      default: 'manual',
      required: true,
      index: true
    },
    invoiceId: {
      type: String,
      index: true
    },
    invoiceNumber: {
      type: String,
      index: true
    },
    projectId: {
      type: String,
      index: true
    },
    actualCost: {
      type: Number,
      min: [0, 'Actual cost must be positive']
    },
    clientCost: {
      type: Number,
      min: [0, 'Client cost must be positive']
    },
    transactions: {
      type: [paymentTransactionSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ addedBy: 1, date: -1 });
expenseSchema.index({ source: 1, invoiceId: 1 });
expenseSchema.index({ projectId: 1, date: -1 });

expenseSchema.plugin(mongoosePaginate);

// Virtual properties for payment calculations
expenseSchema.virtual('totalPaid').get(function () {
  return this.transactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
});

expenseSchema.virtual('remainingAmount').get(function () {
  return this.amount - this.totalPaid;
});

expenseSchema.virtual('paymentStatus').get(function () {
  const paid = this.totalPaid;
  if (paid === 0) return 'unpaid';
  if (paid >= this.amount) return 'paid';
  return 'partial';
});

expenseSchema.pre('save', async function (next) {
  if (this.isNew && !this.expenseId) {
    try {
      this.expenseId = await generateId('EXP');
    } catch (error) {
      console.error('Error generating expenseId:', error);
    }
  }
  next();
});

if (mongoose.models.Expense) {
  delete mongoose.models.Expense;
}

const Expense = mongoose.model<IExpense, PaginateModel<IExpense>>('Expense', expenseSchema);

export default Expense;
