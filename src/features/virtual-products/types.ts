export interface VirtualProductComponent {
  productId: string;
  variantId: string;
  quantity: number;
  // Populated fields (not in DB)
  productName?: string;
  sku?: string;
  image?: string;
  availableStock?: number;
}

export interface VirtualProduct {
  _id?: string;
  id?: string;
  name: string;
  sku: string;
  description: string;
  components: VirtualProductComponent[];
  retailPrice: number;
  wholesalePrice: number;
  categories: string[];
  disabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnhancedVirtualProduct extends VirtualProduct {
  availableQuantity: number; // Calculated based on minimum stock of components
  components: (VirtualProductComponent & {
    productName: string;
    sku: string;
    image?: string;
    availableStock: number;
  })[];
}
