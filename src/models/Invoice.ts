import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Payment subdocument interface
interface IPayment {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  date: Date;
  reference?: string;
  notes?: string;
}

// Component breakdown for virtual products
interface IComponentBreakdown {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  purchaseId: string;
  unitCost: number;
  totalCost: number;
}

// Custom expense for virtual products
interface ICustomExpense {
  name: string;
  amount: number;
  actualCost: number;
  clientCost: number;
  category: 'materials' | 'labor' | 'equipment' | 'transport' | 'rent' | 'utilities' | 'fuel' | 'maintenance' | 'marketing' | 'office-supplies' | 'professional-services' | 'insurance' | 'taxes' | 'other';
  description?: string;
  expenseId?: string;
}

// Invoice item subdocument interface
interface IInvoiceItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantSKU?: string;
  virtualProductId?: string; // For virtual products
  isVirtualProduct?: boolean; // Flag to identify virtual products
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
  stockLocation?: string;
  purchaseId?: string;
  originalRate?: number;
  // Virtual product breakdown
  componentBreakdown?: IComponentBreakdown[];
  customExpenses?: ICustomExpense[];
  totalComponentCost?: number;
  totalCustomExpenses?: number;
}

// Main Invoice document interface
interface IInvoice extends Document {
  invoiceNumber: string;
  type: 'invoice' | 'quotation';
  date: Date;
  dueDate?: Date;
  billingType: 'wholesale' | 'retail';
  market: 'newon' | 'waymor';
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  items: IInvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
  gstAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'delivered' | 'cancelled' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  paymentMethod?: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  paidAmount: number;
  balanceAmount: number;
  payments: IPayment[];
  stockDeducted: boolean;
  notes?: string;
  termsAndConditions?: string;
  amountInWords?: string;
  validUntil?: Date;
  convertedToInvoice?: boolean;
  convertedInvoiceId?: string;
  description?: string;
  profit?: number;
  custom: boolean;
  createdBy: string;
  projectId?: string; // Link to project if invoice was generated from project
  createdAt: Date;
  updatedAt: Date;
}

// Payment subdocument schema
const paymentSchema = new Schema<IPayment>({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  reference: {
    type: String
  },
  notes: {
    type: String
  }
});

// Component breakdown subdocument schema
const componentBreakdownSchema = new Schema({
  productId: {
    type: String,
    required: true
  },
  variantId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  purchaseId: {
    type: String,
    required: true
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Custom expense subdocument schema
const customExpenseSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  actualCost: {
    type: Number,
    required: true,
    min: 0
  },
  clientCost: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['materials', 'labor', 'equipment', 'transport', 'rent', 'utilities', 'fuel', 'maintenance', 'marketing', 'office-supplies', 'professional-services', 'insurance', 'taxes', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  expenseId: {
    type: String
  }
}, { _id: false });

// Invoice item subdocument schema
const invoiceItemSchema = new Schema<IInvoiceItem>({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  variantId: {
    type: String
  },
  variantSKU: {
    type: String
  },
  virtualProductId: {
    type: String
  },
  isVirtualProduct: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit: {
    type: String,
    required: true,
    default: 'pcs'
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  stockLocation: {
    type: String
  },
  purchaseId: {
    type: String
  },
  originalRate: {
    type: Number,
    min: 0
  },
  componentBreakdown: {
    type: [componentBreakdownSchema],
    default: []
  },
  customExpenses: {
    type: [customExpenseSchema],
    default: []
  },
  totalComponentCost: {
    type: Number,
    min: 0,
    default: 0
  },
  totalCustomExpenses: {
    type: Number,
    min: 0,
    default: 0
  }
});

// Main Invoice schema
const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    type: {
      type: String,
      enum: ['invoice', 'quotation'],
      required: true,
      default: 'invoice'
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date
    },
    billingType: {
      type: String,
      enum: ['wholesale', 'retail'],
      required: true,
      default: 'retail'
    },
    market: {
      type: String,
      enum: ['newon', 'waymor'],
      required: true,
      default: 'newon'
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true
    },
    customerCompany: {
      type: String
    },
    customerEmail: {
      type: String,
      required: false
    },
    customerPhone: {
      type: String,
      required: false
    },
    customerAddress: {
      type: String,
      required: false
    },
    customerCity: {
      type: String
    },
    customerState: {
      type: String
    },
    customerZip: {
      type: String
    },
    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: function (items: IInvoiceItem[]) {
          return items.length > 0;
        },
        message: 'At least one item is required'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    discountValue: {
      type: Number,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    gstType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    gstValue: {
      type: Number,
      min: 0
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'delivered', 'cancelled', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
      required: true,
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceAmount: {
      type: Number,
      required: true,
      min: 0
    },
    payments: {
      type: [paymentSchema],
      default: []
    },
    stockDeducted: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String
    },
    termsAndConditions: {
      type: String
    },
    amountInWords: {
      type: String
    },
    validUntil: {
      type: Date
    },
    convertedToInvoice: {
      type: Boolean,
      default: false
    },
    convertedInvoiceId: {
      type: String
    },
    description: {
      type: String
    },
    profit: {
      type: Number,
      min: 0
    },
    custom: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      required: true
    },
    projectId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
invoiceSchema.index({ type: 1, status: 1 });
invoiceSchema.index({ customerId: 1, date: -1 });
invoiceSchema.index({ date: -1 });
invoiceSchema.index({ market: 1, billingType: 1 });

// Add pagination plugin
invoiceSchema.plugin(mongoosePaginate);

// Pre-save hook to generate invoice number and auto-calculate payment status
invoiceSchema.pre('save', async function (next) {
  // Generate invoice number for new documents
  if (this.isNew && !this.invoiceNumber) {
    try {
      const prefix = this.type === 'quotation' ? 'QT' : 'INV';
      const currentYear = new Date().getFullYear();
      this.invoiceNumber = await generateId(prefix, currentYear);
      // console.log(`Generated invoice number: ${this.invoiceNumber}`);
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return next(error as Error);
    }
  }

  // Auto-calculate payment status for invoices (not quotations)
  // Only if status is one of the payment-related statuses
  if (this.type === 'invoice' && ['pending', 'paid', 'partial'].includes(this.status)) {
    if (this.balanceAmount <= 0 && this.paidAmount > 0) {
      this.status = 'paid';
    } else if (this.paidAmount > 0) {
      this.status = 'partial';
    } else {
      this.status = 'pending';
    }
  }

  next();
});

// Delete the model if it exists
if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

// Create and export the model
const Invoice = mongoose.model<IInvoice, mongoose.PaginateModel<IInvoice>>('Invoice', invoiceSchema);

export default Invoice;
