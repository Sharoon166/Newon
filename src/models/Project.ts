import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Expense subdocument interface
interface IExpense {
  expenseId?: string;
  description: string;
  amount: number;
  category: 'materials' | 'labor' | 'equipment' | 'transport' | 'rent' | 'utilities' | 'fuel' | 'maintenance' | 'marketing' | 'office-supplies' | 'professional-services' | 'insurance' | 'taxes' | 'other';
  date: Date;
  addedBy: string;
  addedByName?: string;
  receipt?: string;
  notes?: string;
  createdAt: Date;
}

// Inventory subdocument interface
interface IInventoryItem {
  inventoryId?: string;
  productId?: string;
  variantId?: string;
  virtualProductId?: string;
  isVirtualProduct: boolean;
  productName: string;
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  totalCost: number;
  purchaseId?: string; // For regular products
  componentBreakdown?: Array<{
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
    purchaseId: string;
    unitCost: number;
    totalCost: number;
  }>;
  customExpenses?: Array<{
    name: string;
    amount: number;
    category: 'materials' | 'labor' | 'equipment' | 'transport' | 'rent' | 'utilities' | 'fuel' | 'maintenance' | 'marketing' | 'office-supplies' | 'professional-services' | 'insurance' | 'taxes' | 'other';
    description?: string;
  }>;
  totalComponentCost?: number;
  totalCustomExpenses?: number;
  addedBy: string;
  addedByName?: string;
  addedAt: Date;
  notes?: string;
}

// Main Project document interface
interface IProject extends Document {
  projectId?: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  budget: number;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  assignedStaff: string[];
  inventory: IInventoryItem[];
  expenses: IExpense[];
  totalInventoryCost: number;
  totalExpenses: number;
  totalProjectCost: number;
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
      enum: ['materials', 'labor', 'equipment', 'transport', 'rent', 'utilities', 'fuel', 'maintenance', 'marketing', 'office-supplies', 'professional-services', 'insurance', 'taxes', 'other'],
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

// Inventory subdocument schema
const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    inventoryId: {
      type: String,
      required: false
    },
    productId: {
      type: String
    },
    variantId: {
      type: String
    },
    virtualProductId: {
      type: String
    },
    isVirtualProduct: {
      type: Boolean,
      required: true,
      default: false
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate must be non-negative']
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    purchaseId: {
      type: String
    },
    componentBreakdown: {
      type: [
        {
          productId: String,
          variantId: String,
          productName: String,
          sku: String,
          quantity: Number,
          purchaseId: String,
          unitCost: Number,
          totalCost: Number
        }
      ],
      default: undefined
    },
    customExpenses: {
      type: [
        {
          name: String,
          amount: Number,
          category: {
            type: String,
            enum: ['materials', 'labor', 'equipment', 'transport', 'rent', 'utilities', 'fuel', 'maintenance', 'marketing', 'office-supplies', 'professional-services', 'insurance', 'taxes', 'other']
          },
          description: String
        }
      ],
      default: undefined
    },
    totalComponentCost: {
      type: Number,
      min: 0
    },
    totalCustomExpenses: {
      type: Number,
      min: 0
    },
    addedBy: {
      type: String,
      required: [true, 'Added by is required']
    },
    addedByName: {
      type: String
    },
    addedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
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
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
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
    },
    inventory: {
      type: [inventoryItemSchema],
      default: []
    },
    expenses: {
      type: [expenseSchema],
      default: []
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
projectSchema.index({ status: 1, startDate: -1 });
projectSchema.index({ assignedStaff: 1 });
projectSchema.index({ customerId: 1 });
projectSchema.index({ createdAt: -1 });

// Add pagination plugin
projectSchema.plugin(mongoosePaginate);

// Virtual properties for calculated fields
projectSchema.virtual('totalInventoryCost').get(function () {
  return this.inventory.reduce((sum, item) => sum + (item.totalCost || 0), 0);
});

projectSchema.virtual('totalExpenses').get(function () {
  return this.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
});

projectSchema.virtual('totalProjectCost').get(function () {
  return this.totalInventoryCost + this.totalExpenses;
});

projectSchema.virtual('remainingBudget').get(function () {
  return this.budget - this.totalProjectCost;
});

// Pre-save hook to generate projectId
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

  next();
});

// Delete the model if it exists
if (mongoose.models.Project) {
  delete mongoose.models.Project;
}

// Create and export the model
const Project = mongoose.model<IProject, PaginateModel<IProject>>('Project', projectSchema);

export default Project;