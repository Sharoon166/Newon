import { PageHeader } from '@/components/general/page-header';
import { PaymentsPageClient } from '@/features/payments/components/payments-page-client';
import { getGeneralPayments } from '@/features/payments/actions';
import { getCustomers } from '@/features/customers/actions';
import { requireAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const session = await requireAdmin();

  const [customers, paymentsResult] = await Promise.all([
    getCustomers({ includeDisabled: false }),
    getGeneralPayments({ limit: 50 })
  ]);

  return (
    <>
      <PageHeader title="Payments" description="Record and manage payments received from customers" />

      <div className="mt-6">
        <PaymentsPageClient
          customers={customers}
          initialPayments={paymentsResult.docs}
          userRole={session.user.role}
        />
      </div>
    </>
  );
}