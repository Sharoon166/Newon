import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Payment subdocument schema for partial payments against a purchase.
const paymentSchema = new mongoose.Schema(
  {
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
  },
  { _id: true }
);

// Define the purchase schema
const purchaseSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow multiple null values
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    variantId: {
      type: String,
      required: [true, 'Variant ID is required'],
      index: true
    },
    supplier: {
      type: String,
      required: [true, 'Supplier is required'],
      trim: true
    },
    // Business id (e.g. "SP-25-001") of the linked Supplier document. Optional so
    // legacy purchases keep working; `supplier` above remains the denormalized
    // name snapshot for display and backward compatibility.
    supplierId: {
      type: String,
      required: false,
      trim: true,
      index: true
    },
    locationId: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    retailPrice: {
      type: Number,
      required: [true, 'Retail price is required'],
      min: [0, 'Retail price cannot be negative']
    },
    wholesalePrice: {
      type: Number,
      required: [true, 'Wholesale price is required'],
      min: [0, 'Wholesale price cannot be negative']
    },
    shippingCost: {
      type: Number,
      required: [true, 'Shipping cost is required'],
      min: [0, 'Shipping cost cannot be negative']
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost cannot be negative']
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now
    },
    remaining: {
      type: Number,
      required: [true, 'Remaining is required'],
      min: [0, 'Remaining cannot be negative']
    },
    // How many units have physically arrived ("received"). Run only by the
    // stock tracking feature; never touches 'remaining' or the product counters.
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative']
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    // Partial payment tracking. The amount owed for a purchase is totalCost +
    // shippingCost (see `amountDue`), tracked independently of the legacy
    // `totalCost` field.
    payments: {
      type: [paymentSchema],
      default: []
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    amountDue: {
      type: Number,
      default: 0,
      min: [0, 'Amount due cannot be negative']
    },
    balanceAmount: {
      type: Number,
      default: 0,
      min: [0, 'Balance amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
      index: true
    },
    // Guard for the payment recompute hook. Purchases created before payment
    // tracking existed have no recorded payments and must be treated as settled
    // (untracked) rather than being reset to "unpaid" by unrelated saves (e.g.
    // stock deductions that only touch `remaining`).
    paymentsTracked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
purchaseSchema.index({ productId: 1, variantId: 1, purchaseDate: -1 });

// Add pagination plugin
purchaseSchema.plugin(mongoosePaginate);

// Pre-save hook to calculate totalCost and initialize remaining
purchaseSchema.pre('save', async function (next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.totalCost = this.quantity * this.unitPrice;
  }
  // Initialize remaining to quantity if not set (for new purchases)
  if (this.isNew && this.remaining === undefined) {
    this.remaining = this.quantity;
  }

  // Generate purchaseId for new purchases
  if (this.isNew && !this.purchaseId) {
    try {
      this.purchaseId = await generateId('PR');
      // console.log(`Generated purchaseId: ${this.purchaseId}`);
    } catch (error) {
      console.error('Error generating purchaseId:', error);
      // Continue without purchaseId - it will be generated later if needed
    }
  }

  // Recompute payment totals / status from the payments array. `amountDue` is
  // totalCost + shippingCost; `totalCost` keeps its original meaning.
  //
  // Only run when the purchase actually participates in payment tracking: new
  // documents, or existing ones whose payments array was just modified. Legacy
  // purchases (created before this feature) stay untracked so an unrelated save
  // - such as a stock deduction touching only `remaining` - never rewrites them
  // to "unpaid" with a full balance.
  if (this.isNew || this.isModified('payments')) {
    this.paymentsTracked = true;
  }
  if (this.paymentsTracked) {
    const payments = Array.isArray(this.payments) ? this.payments : [];
    const paidTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    this.paidAmount = paidTotal;
    this.amountDue = (this.totalCost || 0) + (this.shippingCost || 0);
    this.balanceAmount = Math.max(0, this.amountDue - this.paidAmount);

    if (this.balanceAmount <= 0 && this.paidAmount > 0) {
      this.paymentStatus = 'paid';
    } else if (this.paidAmount > 0) {
      this.paymentStatus = 'partial';
    } else {
      this.paymentStatus = 'unpaid';
    }
  }

  next();
});

// Payment subdocument interface
export interface IPurchasePayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  date: Date;
  reference?: string;
  notes?: string;
}

// Define interface for Purchase document
export interface IPurchase extends mongoose.Document {
  purchaseId: string;
  productId: mongoose.Types.ObjectId;
  variantId: string;
  supplier: string;
  supplierId?: string;
  locationId: string;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  totalCost: number;
  purchaseDate: Date;
  remaining: number;
  receivedQuantity?: number;
  notes?: string;
  payments?: IPurchasePayment[];
  paidAmount?: number;
  amountDue?: number;
  balanceAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paymentsTracked?: boolean;
}

// Create and export the model with PaginateModel type
// Delete existing model to ensure plugin is applied
if (mongoose.models.Purchase) {
  delete mongoose.models.Purchase;
}

const Purchase = mongoose.model<IPurchase, mongoose.PaginateModel<IPurchase>>('Purchase', purchaseSchema);

export default Purchase;
