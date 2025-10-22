import DashboardLayout from '@/components/layout/dashboard-layout';
import { ProductForm } from '@/features/inventory/components/product-form';

export default function AddProductPage() {
  return (
    <DashboardLayout>
      <ProductForm />
    </DashboardLayout>
  );
}
