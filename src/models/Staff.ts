import mongoose, { Document, Schema } from 'mongoose';
import { generateId } from './Counter';

// Define the interface for the Staff document
interface IStaff extends Document {
  staffId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    staffId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['admin', 'manager', 'staff'],
      default: 'staff'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

// Index for faster querying
staffSchema.index({ isActive: 1 });

// Pre-save hook to generate staffId
staffSchema.pre('save', async function (next) {
  if (this.isNew && !this.staffId) {
    try {
      this.staffId = await generateId('ST');
      console.log(`Generated staffId: ${this.staffId}`);
    } catch (error) {
      console.error('Error generating staffId:', error);
      // Continue without staffId - it will be generated later if needed
    }
  }
  next();
});

// Create the model if it doesn't exist
const Staff = mongoose.models.Staff || mongoose.model<IStaff>('Staff', staffSchema);

export default Staff;
