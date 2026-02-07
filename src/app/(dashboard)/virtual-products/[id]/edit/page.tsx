import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/general/page-header';
import { VirtualProductForm } from '@/features/virtual-products/components/virtual-product-form';
import { getVirtualProductById } from '@/features/virtual-products/actions';
import { getProducts } from '@/features/inventory/actions';

export const metadata = {
  title: 'Edit Virtual Product',
  description: 'Edit virtual product details'
};

interface EditVirtualProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditVirtualProductPage({ params }: EditVirtualProductPageProps) {
  const [virtualProduct, variants] = await Promise.all([
    getVirtualProductById(params.id),
    getProducts()
  ]);

  if (!virtualProduct) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Edit Virtual Product"
        description={`Editing: ${virtualProduct.name}`}
      />

      <VirtualProductForm
        initialData={virtualProduct}
        variants={variants}
        mode="edit"
      />
    </div>
  );
}
