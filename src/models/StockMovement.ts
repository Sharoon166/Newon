import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// A single stock movement line (used for deliveries, which can span several
// products on one invoice, and for the component breakdown of virtual products).
export interface StockMovementLine {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  // Index of the invoice item this line belongs to (used by reversals).
  itemIndex?: number;
  // For virtual product items: the physical components that actually left.
  components?: Array<{
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
  }>;
}

export interface IStockMovement extends mongoose.Document {
  movementId: string;
  kind: 'receive' | 'deliver' | 'adjustment' | 'opening' | 'reversal';
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  // Always positive for receive/deliver/reversal. For adjustment this is the
  // signed delta applied to "In shop" (new count - old count).
  quantity: number;
  inShopBefore: number;
  inShopAfter: number;
  purchaseId?: string;
  purchaseNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName?: string;
  lines?: StockMovementLine[];
  note?: string;
  userId?: string;
  userName?: string;
  // Idempotency token - a double-click (or retried request) with the same
  // clientRef is treated as a no-op.
  clientRef?: string;
  // Reversal links
  reversalOf?: string;
  reversedByMovementId?: string;
  reversed?: boolean;
  // Which start-date epoch this movement belongs to (0 = before any re-set).
  epoch?: number;
  searchText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementLineSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    itemIndex: { type: Number },
    components: [
      {
        _id: false,
        productId: { type: String, required: true },
        variantId: { type: String, required: true },
        productName: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 }
      }
    ]
  },
  { _id: false }
);

const stockMovementSchema = new mongoose.Schema(
  {
    movementId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true
    },
    kind: {
      type: String,
      enum: ['receive', 'deliver', 'adjustment', 'opening', 'reversal'],
      required: true,
      index: true
    },
    productId: { type: String, required: true, index: true },
    variantId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    inShopBefore: { type: Number, required: true, default: 0 },
    inShopAfter: { type: Number, required: true, default: 0 },
    purchaseId: { type: String, index: true },
    purchaseNumber: { type: String },
    invoiceId: { type: String, index: true },
    invoiceNumber: { type: String },
    customerName: { type: String },
    lines: { type: [stockMovementLineSchema], default: [] },
    note: { type: String, default: '', trim: true },
    userId: { type: String },
    userName: { type: String },
    clientRef: { type: String, unique: true, sparse: true },
    reversalOf: { type: String },
    reversedByMovementId: { type: String },
    reversed: { type: Boolean, default: false },
    // Legacy documents have no epoch - treat missing as 0.
    epoch: { type: Number, default: 0, index: true },
    searchText: { type: String, index: true }
  },
  { timestamps: true }
);

stockMovementSchema.index({ kind: 1, createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.plugin(mongoosePaginate);

if (mongoose.models.StockMovement) {
  delete mongoose.models.StockMovement;
}

const StockMovement = mongoose.model<IStockMovement, mongoose.PaginateModel<IStockMovement>>(
  'StockMovement',
  stockMovementSchema
);

export default StockMovement;