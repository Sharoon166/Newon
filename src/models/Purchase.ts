import mongoose from 'mongoose';

// Define the purchase schema
const purchaseSchema = new mongoose.Schema(
  {
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
      required: false, // Optional as per requirements
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

// Pre-save hook to calculate totalCost and initialize remaining
purchaseSchema.pre('save', function (next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.totalCost = this.quantity * this.unitPrice;
  }
  // Initialize remaining to quantity if not set (for new purchases)
  if (this.isNew && this.remaining === undefined) {
    this.remaining = this.quantity;
  }
  next();
});

// Create and export the model
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

export default Purchase;

