export type StockMovementKind = 'receive' | 'deliver' | 'adjustment' | 'opening' | 'reversal';

export interface StockMovementLine {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  itemIndex?: number;
  /** "In shop" of this line's own variant just before/after the slip. */
  inShopBefore?: number;
  inShopAfter?: number;
  components?: Array<{
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
    /** "In shop" of this component variant just before/after it left. */
    inShopBefore?: number;
    inShopAfter?: number;
  }>;
}

export interface StockMovement {
  id: string;
  movementId: string;
  kind: StockMovementKind;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
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
  reversalOf?: string;
  reversedByMovementId?: string;
  reversed?: boolean;
  epoch?: number;
  createdAt: string;
}

export interface InShopRow {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  attributes: Record<string, string>;
  disabled?: boolean;
  available: number;
  inShop: number;
  toArrive: number;
}

export interface AwaitingArrivalItem {
  id: string;
  purchaseId: string;
  productName: string;
  sku: string;
  supplier: string;
  purchaseDate: string;
  ordered: number;
  received: number;
  pending: number;
}

export interface AwaitingDeliveryItemLine {
  index: number;
  productName: string;
  sku?: string;
  unit: string;
  quantity: number;
  delivered: number;
  pending: number;
}

export interface AwaitingDeliveryItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerCompany?: string;
  date: string;
  status: string;
  lines: AwaitingDeliveryItemLine[];
  totalInvoiced: number;
  totalDelivered: number;
  totalPending: number;
}

export interface PaginatedStock<T> {
  docs: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StockTrackingStatus {
  initialized: boolean;
  startedAt?: string;
  currentEpoch?: number;
}

// Badge counts for the stock tab bar ("work waiting" at a glance).
export interface StockWorkCounts {
  arrival: number;
  delivery: number;
}

export interface ReceivePurchaseInput {
  purchaseId: string;
  quantity: number;
  clientRef?: string;
}

export interface DeliverInvoiceLine {
  itemIndex: number;
  quantity: number;
}

export interface DeliverInvoiceInput {
  invoiceId: string;
  lines: DeliverInvoiceLine[];
  note?: string;
  clientRef?: string;
}

export interface QuickCountInput {
  productId: string;
  variantId: string;
  count: number;
  clientRef?: string;
}

export interface ActionResult {
  ok: boolean;
  idempotent?: boolean;
  receivedQuantity?: number;
  deliveredQuantity?: number;
}