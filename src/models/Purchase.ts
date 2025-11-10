import mongoose from 'mongoose';

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
purchaseSchema.index({ supplier: 1 });

// Counter schema for auto-incrementing purchase IDs
const counterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  sequence: { type: Number, default: 0 }
});

const PurchaseCounter = mongoose.models.PurchaseCounter || mongoose.model('PurchaseCounter', counterSchema);

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
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
      
      // Increment and get the next sequence number
      const counter = await PurchaseCounter.findOneAndUpdate(
        { year: currentYear },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      
      if (!counter) {
        console.error('Failed to create or update purchase counter');
        // Continue without purchaseId - it will be generated later if needed
        return next();
      }
      
      // Format: PR-YY-XXX (e.g., PR-25-001)
      const sequenceStr = counter.sequence.toString().padStart(3, '0');
      this.purchaseId = `PR-${yearSuffix}-${sequenceStr}`;
      console.log(`Generated purchaseId: ${this.purchaseId}`);
    } catch (error) {
      console.error('Error generating purchaseId:', error);
      // Continue without purchaseId - it will be generated later if needed
      // Don't block the purchase creation
    }
  }
  
  next();
});

// Create and export the model
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

export default Purchase;
