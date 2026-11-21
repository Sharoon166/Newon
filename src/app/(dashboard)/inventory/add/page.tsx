import { ProductForm } from '@/features/inventory/components/product-form';
import { requirePermission } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/rbac';

export default async function AddProductPage() {
  const session = await requirePermission('edit:inventory');

  return (
    <ProductForm
      canCreateImported={userHasPermission(session, 'create:imported-purchases')}
      canManagePurchases={userHasPermission(session, 'edit:purchases')}
    />
  );
}
