'use client';

import * as React from 'react';
import { Coins, LayoutDashboard, LifeBuoy, Lightbulb, ScrollTextIcon, Settings2, ShoppingCart } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { NavProjects } from './nav-projects';
import { NavSecondary } from './nav-secondary';

const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg'
  },
  //   navMain: [
  //     {
  //       title: "Playground",
  //       url: "#",
  //       icon: SquareTerminal,
  //       isActive: true,
  //       items: [
  //         {
  //           title: "History",
  //           url: "#",
  //         },
  //         {
  //           title: "Starred",
  //           url: "#",
  //         },
  //         {
  //           title: "Settings",
  //           url: "#",
  //         },
  //       ],
  //     },
  //     {
  //       title: "Models",
  //       url: "#",
  //       icon: Bot,
  //       items: [
  //         {
  //           title: "Genesis",
  //           url: "#",
  //         },
  //         {
  //           title: "Explorer",
  //           url: "#",
  //         },
  //         {
  //           title: "Quantum",
  //           url: "#",
  //         },
  //       ],
  //     },
  //     {
  //       title: "Documentation",
  //       url: "#",
  //       icon: BookOpen,
  //       items: [
  //         {
  //           title: "Introduction",
  //           url: "#",
  //         },
  //         {
  //           title: "Get Started",
  //           url: "#",
  //         },
  //         {
  //           title: "Tutorials",
  //           url: "#",
  //         },
  //         {
  //           title: "Changelog",
  //           url: "#",
  //         },
  //       ],
  //     },
  //     {
  //       title: "Settings",
  //       url: "#",
  //       icon: Settings2,
  //       items: [
  //         {
  //           title: "General",
  //           url: "#",
  //         },
  //         {
  //           title: "Team",
  //           url: "#",
  //         },
  //         {
  //           title: "Billing",
  //           url: "#",
  //         },
  //         {
  //           title: "Limits",
  //           url: "#",
  //         },
  //       ],
  //     },
  //   ],
  // for dropdown menus
  navSecondary: [
    {
      title: 'Support',
      url: '#',
      icon: LifeBuoy
    },
    {
      title: 'Setting',
      url: '/setting',
      icon: Settings2
    }
  ],
  projects: [
    {
      name: 'Dashboard',
      url: '#',
      icon: LayoutDashboard
    },
    {
      name: 'Inventory',
      url: '/inventory',
      icon: ShoppingCart
    },
    {
      name: 'Billing & quotation',
      url: '#',
      icon: ScrollTextIcon
    },
    {
      name: 'Ledger',
      url: '/ledger',
      icon: Coins
    }
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {/* <Command className="size-4" /> */}
                  <Lightbulb className="size-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Newon</span>
                  <span className="truncate text-xs text-muted-foreground">Inventory Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
