import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { generateId } from './Counter';

// Allocation subdocument - links a portion of the general payment to an invoice
interface IAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

// Main GeneralPayment document interface
interface IGeneralPayment extends Document {
  paymentNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  date: Date;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque' | 'upi';
  reference?: string;
  notes?: string;
  allocations: IAllocation[];
  allocatedAmount: number;
  unallocatedAmount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Allocation subdocument schema
const allocationSchema = new Schema<IAllocation>(
  {
    invoiceId: {
      type: String,
      required: true
    },
    invoiceNumber: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

// Main GeneralPayment schema
const generalPaymentSchema = new Schema<IGeneralPayment>(
  {
    paymentNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow multiple null values
      index: true
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi'],
      required: true
    },
    reference: {
      type: String
    },
    notes: {
      type: String
    },
    allocations: {
      type: [allocationSchema],
      default: []
    },
    allocatedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    unallocatedAmount: {
      type: Number,
      default: 0,
      min: 0
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

// Indexes for query performance
generalPaymentSchema.index({ customerId: 1, date: -1 });
generalPaymentSchema.index({ date: -1 });

generalPaymentSchema.plugin(mongoosePaginate);

// Pre-save hook to generate payment number for new documents
generalPaymentSchema.pre('save', async function (next) {
  if (this.isNew && !this.paymentNumber) {
    try {
      const currentYear = new Date().getFullYear();
      this.paymentNumber = await generateId('GP', currentYear);
    } catch (error) {
      console.error('Error generating payment number:', error);
      return next(error as Error);
    }
  }

  next();
});

// Delete the model if it exists
if (mongoose.models.GeneralPayment) {
  delete mongoose.models.GeneralPayment;
}

// Create and export the model
const GeneralPayment = mongoose.model<IGeneralPayment, mongoose.PaginateModel<IGeneralPayment>>(
  'GeneralPayment',
  generalPaymentSchema
);

export default GeneralPayment;