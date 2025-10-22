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
    variants: product.variants.map(v => ({
      ...v
    }))
  };

  return (
    <DashboardLayout>
      <ProductForm mode="edit" initialData={serializedProduct} />
    </DashboardLayout>
  );
}
