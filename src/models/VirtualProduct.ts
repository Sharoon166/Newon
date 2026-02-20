import mongoose from 'mongoose';

const virtualProductComponentSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'Product ID is required']
    },
    variantId: {
      type: String,
      required: [true, 'Variant ID is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    }
  },
  { _id: false }
);

const customExpenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Expense name is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    category: {
      type: String,
      enum: ['labor', 'materials', 'overhead', 'packaging', 'shipping', 'other'],
      default: 'other'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const virtualProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Virtual product name is required'],
      minlength: [2, 'Name must be at least 2 characters'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      minlength: [3, 'SKU must be at least 3 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    components: {
      type: [virtualProductComponentSchema],
      validate: {
        validator: function (components: typeof virtualProductComponentSchema[]) {
          return components && components.length > 0;
        },
        message: 'Virtual product must have at least one component'
      }
    },
    customExpenses: {
      type: [customExpenseSchema],
      default: []
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    categories: {
      type: [String],
      default: []
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create text index for search
virtualProductSchema.index({
  name: 'text',
  sku: 'text',
  description: 'text'
});

const VirtualProduct = mongoose.models.VirtualProduct || mongoose.model('VirtualProduct', virtualProductSchema);

export default VirtualProduct;
