import mongoose, { Document, Schema } from 'mongoose';
import { generateId } from './Counter';
import bcrypt from 'bcryptjs';

// Define the interface for the Staff document
export interface IStaff extends Document {
  staffId?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
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
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false // Don't return password by default
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['admin', 'staff'],
      default: 'staff'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster querying
staffSchema.index({ isActive: 1 });

// Hash password before saving
staffSchema.pre('save', async function (next) {
  // Generate staffId for new staff
  if (this.isNew && !this.staffId) {
    try {
      this.staffId = await generateId('ST');
      console.log(`Generated staffId: ${this.staffId}`);
    } catch (error) {
      console.error('Error generating staffId:', error);
    }
  }

  // Hash password if modified
  if (this.isModified('password')) {
    // Validate password length
    if (this.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// Method to compare passwords
staffSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create the model if it doesn't exist
const Staff = mongoose.models.Staff || mongoose.model<IStaff>('Staff', staffSchema);

export default Staff;
