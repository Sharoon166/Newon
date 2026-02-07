import { PageHeader } from '@/components/general/page-header';
import { VirtualProductForm } from '@/features/virtual-products/components/virtual-product-form';
import { getProducts } from '@/features/inventory/actions';

export const metadata = {
  title: 'Add Virtual Product',
  description: 'Create a new virtual product'
};

export default async function AddVirtualProductPage() {
  const variants = await getProducts();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Add Virtual Product"
        description="Create a new virtual product by combining multiple inventory items"
      />

      <VirtualProductForm variants={variants} mode="create" />
    </div>
  );
}
