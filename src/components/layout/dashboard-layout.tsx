import { AppSidebar } from '@/components/layout/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  title?: string;
  children: React.ReactNode;
}
export default function DashboardLayout({ title = 'Newon', children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 cursor-pointer" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-8 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
