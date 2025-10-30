import { notFound } from 'next/navigation';
import { getProductById } from '@/features/inventory/actions';
import { ProductForm } from '@/features/inventory/components/product-form';
import DashboardLayout from '@/components/layout/dashboard-layout';

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

  const serializedProduct = {
    ...product,
    _id: product._id ? product._id.toString() : "",
    hasVariants: product.hasVariants || false,
    // Initialize locations as an empty array
    locations: product.locations || [],
    // Ensure variants are properly mapped with all required fields
    variants: (product.variants || []).map(variant => ({
      ...variant,
      id: variant.id || '',
      sku: variant.sku || '',
      purchasePrice: variant.purchasePrice || 0,
      retailPrice: variant.retailPrice || 0,
      wholesalePrice: variant.wholesalePrice || 0,
      shippingCost: variant.shippingCost || 0,
      attributes: variant.attributes || {}
    })),
    // Ensure other required fields have default values if not present
    categories: product.categories || [],
    attributes: product.attributes || [],
    // Set default values for required fields
    name: product.name || '',
    supplier: product.supplier || ''
  };

  return (
    <DashboardLayout>
      <ProductForm mode="edit" initialData={serializedProduct} />
    </DashboardLayout>
  );
}
