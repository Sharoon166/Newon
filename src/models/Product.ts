import { ProductVariant } from '@/features/inventory/types';
import mongoose from 'mongoose';

// Define the variant schema
const variantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      minlength: [3, 'SKU must be at least 3 characters']
    },
    attributes: {
      type: Map,
      of: String,
      default: {}
    },

    // Legacy fields - kept for backward compatibility
    availableStock: {
      type: Number,
      default: 0,
      min: [0, 'Available stock cannot be negative']
    },
    stockOnBackorder: {
      type: Number,
      default: 0,
      min: [0, 'Backorder stock cannot be negative']
    },
    // New inventory structure
    inventory: [{
      locationId: {
        type: String,
        required: true
      },
      availableStock: {
        type: Number,
        required: true,
        min: [0, 'Available stock cannot be negative'],
        default: 0
      },
      backorderStock: {
        type: Number,
        required: true,
        min: [0, 'Backorder stock cannot be negative'],
        default: 0
      }
    }],
    // Image fields
    image: {
      type: String,
      validate: {
        validator: function (v: string) {
          return v === '' || v.startsWith('http');
        },
        message: 'Please provide a valid image URL'
      }
    },
    imageFile: {
      dataUrl: String,
      fileName: String,
      fileType: String,
      size: Number,
      cloudinaryUrl: String,
      publicId: String,
      width: Number,
      height: Number,
      format: String
    }
  },
  { _id: false }
);

// Define the attribute schema for product attributes
const productAttributeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      minlength: [1, 'Attribute name cannot be empty']
    },
    values: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length > 0 && v.length === new Set(v).size;
        },
        message: 'Attribute must have at least one unique value'
      }
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

// Define the main product schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      minlength: [2, 'Product name must be at least 2 characters']
    },
    description: {
      type: String,
      default: ''
    },
    supplier: {
      type: String,
      required: [true, 'Supplier information is required']
    },
    locations: {
      type: [{
        id: String,
        name: String,
        address: String,
        isActive: Boolean,
        order: Number
      }],
      default: []
    },
    categories: {
      type: [String],
      default: []
    },
    attributes: {
      type: [productAttributeSchema],
      default: []
    },
    variants: {
      type: [variantSchema],
      default: [],
      validate: [
        {
          validator: function(variants: ProductVariant[]) {
            // If there are no attributes, we should have exactly one variant
            if (this.attributes && this.attributes.length === 0) {
              return variants.length === 1;
            }
            return true;
          },
          message: 'Products without attributes must have exactly one variant'
        },
        {
          validator: function(variants: ProductVariant[]) {
            // Ensure all variants have required fields
            return variants.every(variant => 
              variant && 
              variant.sku
            );
          },
          message: 'All variants must have required fields (sku)'
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

// Create a text index for search functionality
productSchema.index({
  name: 'text',
  'variants.sku': 'text'
});

// Add a pre-save hook to ensure data consistency
productSchema.pre('save', function (next) {
  // If no variants exist, create a default one
  if (Array.isArray(this.variants) && this.variants.length === 0) {
    throw new Error('Products without attributes must have exactly one variant');
  }
  next();
});

// Create and export the model
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
