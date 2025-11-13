import { PageHeader } from '@/components/general/page-header';
import { SettingsTabs } from '@/features/settings/components/settings-tabs';
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';

export default async function SettingsPage() {
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
      />
    </div>
  );
}
