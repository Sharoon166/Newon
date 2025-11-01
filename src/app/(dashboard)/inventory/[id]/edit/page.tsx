import { notFound } from 'next/navigation';
import { getProductById } from '@/features/inventory/actions';
import { ProductForm } from '@/features/inventory/components/product-form';

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  // Helper function to serialize locations (remove MongoDB _id if present)
  const serializeLocations = (locations) => {
    if (!locations || !Array.isArray(locations)) return [];
    return locations.map(location => {
      // Create a plain object, explicitly excluding _id and any MongoDB-specific properties
      const serialized = {
        id: location?.id ? String(location.id) : '',
        name: location?.name ? String(location.name) : '',
        address: location?.address ? String(location.address) : '',
        isActive: location?.isActive !== undefined ? Boolean(location.isActive) : true,
        order: location?.order !== undefined ? Number(location.order) : 0
      };
      return serialized;
    });
  };

  // Deep serialize to remove MongoDB-specific properties
  const deepSerialize = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    // Handle MongoDB ObjectId
    if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name === 'ObjectId') {
      return obj.toString();
    }
    
    // Handle Date objects
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => deepSerialize(item));
    }
    
    // Handle objects
    if (typeof obj === 'object') {
      const serialized = {};
      for (const key in obj) {
        // Skip MongoDB-specific internal properties
        if (key === '__v') continue;
        // Skip _id in nested objects (like locations) - they're buffers
        if (key === '_id') {
          // Only keep _id if it's the main document _id, skip nested _id properties
          if (obj.toString && typeof obj.toString === 'function' && obj.constructor && obj.constructor.name === 'ObjectId') {
            return obj.toString();
          }
          continue; // Skip _id buffers in nested objects
        }
        serialized[key] = deepSerialize(obj[key]);
      }
      return serialized;
    }
    
    return obj;
  };

  // First do a deep serialize to remove MongoDB-specific properties
  const deepSerialized = deepSerialize(product);
  
  const serializedProduct = {
    ...deepSerialized,
    _id: product._id ? product._id.toString() : "",
    hasVariants: product.hasVariants || false,
    // Ensure locations are properly serialized
    locations: serializeLocations(product.locations || deepSerialized.locations || []),
    // Ensure variants are properly mapped with all required fields
    variants: (product.variants || []).map(variant => ({
      id: String(variant.id || ''),
      sku: String(variant.sku || ''),
      purchasePrice: Number(variant.purchasePrice || 0),
      retailPrice: Number(variant.retailPrice || 0),
      wholesalePrice: Number(variant.wholesalePrice || 0),
      shippingCost: Number(variant.shippingCost || 0),
      availableStock: Number(variant.availableStock || 0),
      stockOnBackorder: Number(variant.stockOnBackorder || 0),
      attributes: variant.attributes || {},
      image: variant.image || '',
      // Ensure inventory is properly serialized
      inventory: (variant.inventory || []).map(inv => ({
        locationId: String(inv.locationId || ''),
        availableStock: Number(inv.availableStock || 0),
        backorderStock: Number(inv.backorderStock || 0)
      }))
    })),
    // Ensure other required fields have default values if not present
    categories: Array.isArray(product.categories) ? product.categories.map(c => String(c)) : [],
    attributes: product.attributes || [],
    // Set default values for required fields
    name: String(product.name || ''),
    supplier: String(product.supplier || ''),
    description: String(product.description || '')
  };

  return (
      <ProductForm mode="edit" initialData={serializedProduct} />
  );
}
