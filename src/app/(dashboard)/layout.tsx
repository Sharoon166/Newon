import DashboardLayout from '@/components/layout/dashboard-layout';
import { Metadata } from 'next';
import { BrandProvider } from '@/features/settings/components/brand-provider';
import { getBrandSettings } from '@/features/settings/actions';

export const metadata: Metadata = {
  title: 'Newon - Dashboard',
  description: 'Newon Dashboard'
};

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Seed brand settings from DB on server-side. Falls back to defaults if DB read fails.
  const brandSettings = await getBrandSettings();
  
  return (
    <BrandProvider initialBrands={brandSettings}>
      <DashboardLayout>{children}</DashboardLayout>
    </BrandProvider>
  );
}
