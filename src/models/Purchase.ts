import mongoose from 'mongoose';
import { generateId } from './Counter';

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
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
purchaseSchema.index({ productId: 1, variantId: 1, purchaseDate: -1 });

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
      console.log(`Generated purchaseId: ${this.purchaseId}`);
    } catch (error) {
      console.error('Error generating purchaseId:', error);
      // Continue without purchaseId - it will be generated later if needed
    }
  }
  
  next();
});

// Create and export the model
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

export default Purchase;
