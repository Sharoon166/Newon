import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for the Customer document
interface ICustomer extends Document {
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
customerSchema.index({ lastInvoiceDate: -1 });
customerSchema.index({ lastPaymentDate: -1 });

// Create the model if it doesn't exist
const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;