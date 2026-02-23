import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

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
  source: 'manual' | 'invoice';
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  actualCost?: number;
  clientCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

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
      enum: ['manual', 'invoice'],
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
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ addedBy: 1, date: -1 });
expenseSchema.index({ source: 1, invoiceId: 1 });
expenseSchema.index({ projectId: 1, date: -1 });

expenseSchema.plugin(mongoosePaginate);

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
