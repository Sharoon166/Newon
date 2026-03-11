import { PageHeader } from '@/components/general/page-header';
import { SettingsTabs } from '@/features/settings/components/settings-tabs';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';
import { requireAdmin } from '@/lib/auth-utils';
import dbConnect from '@/lib/db';
import Staff, { IStaff } from '@/models/Staff';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await requireAdmin();

  await dbConnect();
  const admin = await Staff.findOne({ staffId: session.user.staffId }).lean() as IStaff | null;

  if (!admin) {
    redirect("/inventory")
  }

  const [paymentDetails, invoiceTerms] = await Promise.all([
    getPaymentDetails(),
    getInvoiceTerms()
  ]);

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Settings"
        description="Manage your account and app preferences"
      />

      <SettingsTabs
        paymentDetails={paymentDetails}
        invoiceTerms={invoiceTerms}
        currentUser={{
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email
        }}
      />
    </div>
  );
}
