import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Expense subdocument interface
interface IExpense {
  expenseId?: string;
  description: string;
  amount: number;
  category: 'materials' | 'labor' | 'equipment' | 'transport' | 'other';
  date: Date;
  addedBy: string;
  addedByName?: string;
  receipt?: string;
  notes?: string;
  createdAt: Date;
}

// Main Project document interface
interface IProject extends Document {
  projectId?: string;
  title: string;
  description: string;
  budget: number;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  assignedStaff: string[];
  expenses: IExpense[];
  totalExpenses: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Expense subdocument schema
const expenseSchema = new Schema<IExpense>(
  {
    expenseId: {
      type: String,
      required: false
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount must be positive']
    },
    category: {
      type: String,
      enum: ['materials', 'labor', 'equipment', 'transport', 'other'],
      required: [true, 'Expense category is required']
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now
    },
    addedBy: {
      type: String,
      required: [true, 'Added by is required']
    },
    addedByName: {
      type: String
    },
    receipt: {
      type: String
    },
    notes: {
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

// Main Project schema
const projectSchema = new Schema<IProject>(
  {
    projectId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget must be positive']
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      required: true,
      default: 'planning',
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },
    endDate: {
      type: Date
    },
    assignedStaff: {
      type: [String],
      default: [],
      index: true
    },
    expenses: {
      type: [expenseSchema],
      default: []
    },
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingBudget: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required']
    },
    createdByName: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
projectSchema.index({ status: 1, startDate: -1 });
projectSchema.index({ assignedStaff: 1 });
projectSchema.index({ createdAt: -1 });

// Add pagination plugin
projectSchema.plugin(mongoosePaginate);

// Pre-save hook to generate projectId and calculate totals
projectSchema.pre('save', async function (next) {
  // Generate project ID for new documents
  if (this.isNew && !this.projectId) {
    try {
      const currentYear = new Date().getFullYear();
      this.projectId = await generateId('PRJ', currentYear);
    } catch (error) {
      console.error('Error generating project ID:', error);
      return next(error as Error);
    }
  }

  // Calculate total expenses and remaining budget
  this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  this.remainingBudget = this.budget - this.totalExpenses;

  next();
});

// Delete the model if it exists
if (mongoose.models.Project) {
  delete mongoose.models.Project;
}

// Create and export the model
const Project = mongoose.model<IProject, PaginateModel<IProject>>('Project', projectSchema);

export default Project;
