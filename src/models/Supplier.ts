import mongoose, { Document, Schema } from 'mongoose';
import { generateId } from './Counter';

// Define the interface for the Supplier document
interface ISupplier extends Document {
  supplierId?: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // ISO 3166-1 alpha-2 code (e.g. "PK" for Pakistan)
  country?: string;
  notes?: string;
  disabled: boolean;
  // Financial tracking fields - updated by purchases and purchase payments
  totalPurchased: number;
  totalPaid: number;
  outstandingBalance: number;
  lastPurchaseDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition is intentionally left untyped (same pattern as Customer.ts /
// Purchase.ts): mongoose' Schema<T> generics mis-resolve `_id` and the `this`
// type of hooks for interfaces extending Document. The document type is still
// enforced by `mongoose.model<ISupplier>()` below.
const supplierSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId()
    },
    supplierId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    company: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zip: {
      type: String,
      trim: true
    },
    // ISO 3166-1 alpha-2 country code. Defaults to Pakistan ("PK").
    country: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'PK'
    },
    notes: {
      type: String,
      trim: true
    },
    disabled: {
      type: Boolean,
      default: false
    },
    // Financial tracking fields - updated by purchases and purchase payments
    totalPurchased: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    outstandingBalance: {
      type: Number,
      default: 0
    },
    lastPurchaseDate: {
      type: Date
    },
    lastPaymentDate: {
      type: Date
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

// Index for faster querying
supplierSchema.index({ name: 1 });
supplierSchema.index({ outstandingBalance: 1 });

// Pre-save hook to generate supplierId
supplierSchema.pre('save', async function (next) {
  if (this.isNew && !this.supplierId) {
    try {
      this.supplierId = await generateId('SP');
      // console.log(`Generated supplierId: ${this.supplierId}`);
    } catch (error) {
      console.error('Error generating supplierId:', error);
      // Continue without supplierId - it will be generated later if needed
    }
  }
  next();
});

// Delete the model if it exists
if (mongoose.models.Supplier) {
  delete mongoose.models.Supplier;
}

const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);

export default Supplier;
