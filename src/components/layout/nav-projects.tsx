'use client';

import { type LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavLink {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavCategory {
  title: string;
  items: NavLink[];
}

export function NavCategories({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();

  return (
    <>
      {categories.map(category => (
        <SidebarGroup key={category.title} >
          <SidebarGroupLabel className='uppercase'>{category.title}</SidebarGroupLabel>
          <SidebarMenu>
            {category.items.map(item => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={pathname.includes(item.url)} className="">
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
