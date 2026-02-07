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
