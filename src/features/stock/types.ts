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

/** Which printable challan a History slip produces. */
export type StockChallanKind = 'in' | 'out' | 'adjustment' | 'opening' | 'reversal';

export interface StockChallanLine {
  description: string;
  /** SKU / component breakdown under the description. */
  note?: string;
  quantity: number;
  /** Unit price when it can be resolved (purchase price / invoice item). */
  rate?: number;
}

/**
 * Everything the printable challan needs, fetched in one round trip:
 * one lookup for the slip itself plus (only when the kind needs it) one
 * projected lookup for the linked purchase/invoice or the whole opening batch.
 */
export interface StockChallanData {
  kind: StockChallanKind;
  /** "STOCK IN CHALLAN" / "STOCK OUT CHALLAN" / ... */
  title: string;
  /** Slip number of the clicked row (the batch number for opening slips). */
  challanNumber: string;
  date: string;
  /** Secondary document field ("PO No." / "Inv. No." / "Entries"). */
  reference?: { label: string; value: string };
  market: 'newon' | 'waymor';
  client: {
    name: string;
    company?: string;
    address?: string;
    phone?: string;
  };
  lines: StockChallanLine[];
  /** Sum of the quantities, when it is meaningful (stock in / opening batch). */
  totalQuantity?: number;
  /** Stock in has no party address / phone block on the form. */
  showContact?: boolean;
  note?: string;
  /** Opening batches: how many slips this one challan covers. */
  batchCount?: number;
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

/**
 * One component of a virtual product line, as it must physically leave the
 * shop: the real stock the line is made of, each tagged with the purchase batch
 * the FIFO deduction reserved it from.
 */
export interface AwaitingDeliveryComponent {
  productId: string;
  variantId: string;
  productName: string;
  sku?: string;
  /** Component units reserved for the whole line by the FIFO deduction. */
  reserved: number;
  /** Of those, how many still have to leave the shop. */
  pending: number;
  /** Purchase batch this component was allocated from at deduction time. */
  purchaseId?: string;
}

export interface AwaitingDeliveryItemLine {
  index: number;
  productName: string;
  sku?: string;
  unit: string;
  quantity: number;
  delivered: number;
  pending: number;
  /** Virtual products only: the real stock this line is made of. */
  components?: AwaitingDeliveryComponent[];
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