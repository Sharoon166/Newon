import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Define the interface for the Customer document
interface ICustomer extends Document {
  customerId?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Financial tracking fields (to be used by future features)
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    company: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zip: {
      type: String,
      trim: true,
    },
    // Financial tracking fields (to be used by future features)
    totalInvoiced: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    lastInvoiceDate: {
      type: Date,
    },
    lastPaymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Index for faster querying
customerSchema.index({ name: 1 });
customerSchema.index({ outstandingBalance: 1 });

// Add pagination plugin
customerSchema.plugin(mongoosePaginate);

// Pre-save hook to generate customerId
customerSchema.pre('save', async function (next) {
  if (this.isNew && !this.customerId) {
    try {
      this.customerId = await generateId('CU');
      console.log(`Generated customerId: ${this.customerId}`);
    } catch (error) {
      console.error('Error generating customerId:', error);
      // Continue without customerId - it will be generated later if needed
    }
  }
  next();
});

// Delete the model if it exists to ensure plugin is applied
if (mongoose.models.Customer) {
  delete mongoose.models.Customer;
}

// Create the model with pagination support
const Customer = mongoose.model<ICustomer, PaginateModel<ICustomer>>('Customer', customerSchema);

export default Customer;