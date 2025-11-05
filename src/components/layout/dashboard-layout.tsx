"use client"

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import useBrandStore from '@/stores/useBrandStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { getCurrentBrand } = useBrandStore();
  const currentBrand = getCurrentBrand();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 cursor-pointer sticky top-0" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-lg font-semibold">{currentBrand.displayName}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-8 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
