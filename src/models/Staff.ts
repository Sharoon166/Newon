import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for the Staff document
interface IStaff extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false // Don't return password by default
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
// staffSchema.index({ email: 1 }, { unique: true });
staffSchema.index({ isActive: 1 });

// Pre-save hook for password hashing
staffSchema.pre<IStaff>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const bcrypt = await import('bcryptjs');
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
staffSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.log(error)
    return false;
  }
};

// Create the model if it doesn't exist
const Staff = mongoose.models.Staff || mongoose.model<IStaff>('Staff', staffSchema);

export default Staff;
