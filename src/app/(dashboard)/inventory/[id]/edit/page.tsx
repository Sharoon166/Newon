import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductById } from '@/features/inventory/actions';
import { ProductForm } from '@/features/inventory/components/product-form';
import { requirePermission } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await requirePermission('edit:inventory');
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  // Imported products are admin-only: operations staff can edit local
  // products only, so send them somewhere useful instead of the form.
  if (product.origin === 'imported' && !userHasPermission(session, 'create:imported-purchases')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Imported product</h1>
            <p className="text-muted-foreground text-lg">
              Imported products can only be created and edited by an admin.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/inventory">Back to inventory</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to serialize locations (remove MongoDB _id if present)
  const serializeLocations = (
    locations:
      | Array<{
          id: string;
          name: string;
          address?: string | undefined;
          isActive: boolean;
          order: number;
        }>
      | undefined
  ) => {
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
  const deepSerialize = (obj: unknown): unknown => {
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
      const serialized: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        // Skip MongoDB-specific internal properties
        if (key === '__v') continue;
        // Skip _id in nested objects (like locations) - they're buffers
        if (key === '_id') {
          // Only keep _id if it's the main document _id, skip nested _id properties
          if (
            obj &&
            typeof obj === 'object' &&
            'toString' in obj &&
            typeof obj.toString === 'function' &&
            'constructor' in obj &&
            obj.constructor &&
            obj.constructor.name === 'ObjectId'
          ) {
            return obj.toString();
          }
          continue; // Skip _id buffers in nested objects
        }
        serialized[key] = deepSerialize((obj as Record<string, unknown>)[key]);
      }
      return serialized;
    }

    return obj;
  };

  // First do a deep serialize to remove MongoDB-specific properties
  const deepSerialized = deepSerialize(product) as Record<string, unknown>;

  const serializedProduct = {
    ...deepSerialized,
    _id: product._id ? product._id.toString() : '',
    hasVariants: product.hasVariants || false,
    // Ensure locations are properly serialized
    locations: serializeLocations(
      (product.locations || deepSerialized.locations || []) as Array<{
        id: string;
        name: string;
        address?: string;
        isActive: boolean;
        order: number;
      }>
    ),
    // Ensure variants are properly mapped with all required fields (no pricing fields)
    variants: (product.variants || []).map(variant => ({
      id: String(variant.id || ''),
      sku: String(variant.sku || ''),
      disabled: Boolean(variant.disabled || false),
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
    attributes: Array.isArray(product.attributes)
      ? product.attributes.map(attr => ({
          id: String(attr.id || ''),
          name: String(attr.name || ''),
          values: Array.isArray(attr.values) ? attr.values.map(v => String(v)) : [],
          isRequired: Boolean(attr.isRequired),
          order: Number(attr.order || 0)
        }))
      : [],
    // Set default values for required fields
    name: String(product.name || ''),
    supplier: String(product.supplier || ''),
    supplierId: String(product.supplierId || ''),
    origin: (product.origin === 'imported' ? 'imported' : 'local') as 'imported' | 'local',
    description: String(product.description || '')
  };

  return (
    <ProductForm
      mode="edit"
      initialData={serializedProduct}
      canCreateImported={userHasPermission(session, 'create:imported-purchases')}
      canManagePurchases={userHasPermission(session, 'edit:purchases')}
      canDelete={userHasPermission(session, 'delete:inventory')}
    />
  );
}
