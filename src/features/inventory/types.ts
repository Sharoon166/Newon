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

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>; // attributeId: value
  image?: string; // Keep for backward compatibility
  imageFile?: ProductVariantImage;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  availableStock: number;
  stockOnBackorder: number;
}

export interface AttributeValue {
  id: string;
  value: string;
}

export interface ProductType {
  id: string;
  name: string;
  supplier: string;
  categories: string[];
  description: string;
  location?: string; // Location of the product (all variants share the same location)
  variants: ProductVariant[];
  attributes: ProductAttribute[];
}

export interface EnhancedVariants extends ProductVariant {
  productName: string;
  supplier: string;
  categories: string[];
  description: string;
  productId: string;
  location?: string; // Location of the product
}
