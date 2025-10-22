'use client';

import { type LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

export function NavProjects({
  projects
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { isMobile } = useSidebar();
  console.log(isMobile);
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map(item => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a
                href={item.url}
                className={pathname.includes(item.url) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
              >
                <item.icon className="size-6" />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
