import DashboardLayout from '@/components/layout/dashboard-layout';
import { SessionProvider } from '@/features/auth/components/session-provider';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newon - Dashboard',
  description: 'Newon Dashboard',
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </SessionProvider>
  );
}