export interface ProductAttribute {
  id: string;
  name: string;
  values: string[];
  isRequired: boolean;
  order: number;
}

export interface ProductVariantImage {
  dataUrl: string;
  fileName: string;
  fileType: string;
  size: number;
  cloudinaryUrl?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface LocationInventory {
  locationId: string;
  availableStock: number;
  backorderStock: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>; // attributeId: value
  image?: string; // Keep for backward compatibility
  imageFile?: ProductVariantImage;
  availableStock: number; // Legacy field, will be removed in future
  stockOnBackorder: number; // Legacy field, will be removed in future
  inventory: LocationInventory[]; // New inventory tracking per location
}

export interface AttributeValue {
  id: string;
  value: string;
}

export interface ProductLocation {
  id: string;
  name: string;
  address?: string;
  isActive: boolean;
  order: number;
}

export interface ProductType {
  id: string;
  name: string;
  supplier: string;
  categories: string[];
  description: string;
  locations: ProductLocation[]; // Available locations for this product
  variants: ProductVariant[];
  attributes: ProductAttribute[];
}

export interface InventoryItem {
  locationId: string;
  availableStock: number;
  backorderStock: number;
  location?: {
    id: string;
    name: string;
    address?: string;
    isActive: boolean;
    order: number;
  };
}

export interface EnhancedVariants extends ProductVariant {
  productName: string;
  supplier: string;
  categories: string[];
  description: string;
  productId: string;
  locations?: ProductLocation[];
  inventory: InventoryItem[];
  // Pricing fields populated from latest purchases
  purchasePrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  shippingCost?: number;
}
