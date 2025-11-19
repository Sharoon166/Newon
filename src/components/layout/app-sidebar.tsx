'use client';

import * as React from 'react';
import { Coins, LayoutDashboard, Package, ScrollTextIcon, Settings2, ShoppingCart, Users, UserSquare } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { NavProjects } from './nav-projects';
import { NavSecondary } from './nav-secondary';
import useBrandStore, { brands } from '@/stores/useBrandStore';
import { ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const data = {
  navSecondary: [
    {
      title: 'Setting',
      url: '/settings',
      icon: Settings2
    }
  ],
  projects: [
    {
      name: 'Dashboard',
      url: '/',
      icon: LayoutDashboard
    },
    {
      name: 'Inventory',
      url: '/inventory',
      icon: ShoppingCart
    },
    {
      name: 'Purchases',
      url: '/purchases',
      icon: Package
    },
    {
      name: 'Staff Management',
      url: '/staff',
      icon: Users
    },
    {name: 'Customers',
      url: '/customers',
      icon: UserSquare
    },
    {
      name: 'Invoices & Quotations',
      url: '/invoices',
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
  const { getCurrentBrand, setBrand } = useBrandStore();
  const currentBrand = getCurrentBrand();
  const { isMobile } = useSidebar();
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div>
                        <div className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className={cn(
                              'flex aspect-square size-10 items-center justify-center rounded-md',
                              currentBrand.id === 'newon'
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'bg-blue-600 text-white'
                            )}
                          >
                            {currentBrand.icon && <currentBrand.icon className="size-5" />}
                          </div>
                          <div className="flex items-center w-full justify-between gap-2">
                            <div className="">
                              <div className="truncate font-medium group-hover:underline">
                                {currentBrand.displayName}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{currentBrand.address}</div>
                            </div>
                            <ChevronsUpDown className="ml-1 size-4 opacity-50" />
                          </div>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-64 rounded-lg p-2"
                      side={isMobile ? 'bottom' : 'right'}
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenuItem
                        onClick={() => setBrand('newon')}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-md cursor-pointer',
                          currentBrand.id === 'newon' ? 'bg-accent' : 'hover:bg-accent'
                        )}
                      >
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex flex-shrink-0 aspect-square size-8 items-center justify-center rounded-md">
                          <span className="text-sm font-medium">N</span>
                        </div>
                        <div className="grid flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn('font-medium truncate', { 'text-primary': currentBrand.id === 'newon' })}
                            >
                              {brands[0].displayName}
                            </span>
                            {currentBrand.id === 'newon' && (
                              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">Inventory Management System</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setBrand('waymor')}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-md cursor-pointer mt-1',
                          currentBrand.id === 'waymor' ? 'bg-accent' : 'hover:bg-accent'
                        )}
                      >
                        <div className="bg-blue-600 text-white flex flex-shrink-0 aspect-square size-8 items-center justify-center rounded-md">
                          <span className="text-sm font-medium">W</span>
                        </div>
                        <div className="grid flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn('font-medium truncate', { 'text-primary': currentBrand.id === 'waymor' })}
                            >
                              {brands[1].displayName}
                            </span>
                            {currentBrand.id === 'waymor' && (
                              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">Waymor Inventory System</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
