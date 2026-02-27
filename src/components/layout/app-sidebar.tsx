'use client';

import * as React from 'react';
import {
  Coins,
  LayoutDashboard,
  Package,
  ScrollTextIcon,
  Settings2,
  ShoppingCart,
  Users,
  UserSquare,
  PackageOpen,
  FolderKanban,
  Receipt
} from 'lucide-react';

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
import { NavCategories } from './nav-projects';
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
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const data = {
  navSecondary: [
    {
      title: 'Setting',
      url: '/settings',
      icon: Settings2
    }
  ],
  categories: [
    {
      title: 'Overview',
      items: [
        {
          name: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard
        }
      ]
    },
    {
      title: 'Inventory',
      items: [
        {
          name: 'Inventory',
          url: '/inventory',
          icon: ShoppingCart
        },
        {
          name: 'Virtual Products',
          url: '/virtual-products',
          icon: PackageOpen
        },
        {
          name: 'Purchases',
          url: '/purchases',
          icon: Package
        }
      ]
    },
    {
      title: 'Sales',
      items: [
        {
          name: 'Customers',
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
    },
    {
      title: 'Operations',
      items: [
        {
          name: 'Projects',
          url: '/projects',
          icon: FolderKanban
        },
        {
          name: 'Expenses',
          url: '/expenses',
          icon: Receipt
        }
      ]
    },
    {
      title: 'Management',
      items: [
        {
          name: 'Staff Management',
          url: '/staff',
          icon: Users
        }
      ]
    }
  ],
  projects: [
    {
      name: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Inventory',
      url: '/inventory',
      icon: ShoppingCart
    },
    {
      name: 'Virtual Products',
      url: '/virtual-products',
      icon: PackageOpen
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
    { name: 'Customers', url: '/customers', icon: UserSquare },
    {
      name: 'Invoices & Quotations',
      url: '/invoices',
      icon: ScrollTextIcon
    },
    {
      name: 'Ledger',
      url: '/ledger',
      icon: Coins
    },
    {
      name: 'Projects',
      url: '/projects',
      icon: FolderKanban
    },
    {
      name: 'Expenses',
      url: '/expenses',
      icon: Receipt
    }
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { getCurrentBrand, setBrand } = useBrandStore();
  const currentBrand = getCurrentBrand();
  const { isMobile } = useSidebar();
  const { data: session, status } = useSession();
  const isStaff = session?.user?.role === 'staff' || status == 'loading';

  // Filter links based on user role
  const staffCategories = [
    {
      title: 'Operations',
      items: [
        {
          name: 'Inventory',
          url: '/inventory/staff',
          icon: ShoppingCart
        },
        {
          name: 'Projects',
          url: '/projects',
          icon: FolderKanban
        }
      ]
    }
  ];

  const visibleCategories = isStaff ? staffCategories : data.categories;
  const visibleSecondary = isStaff ? [] : data.navSecondary;

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="bg-white p-2 -m-2 truncate">
                        <div className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn('flex aspect-square size-10 p-1 items-center justify-center')}>
                            <img
                              height={100}
                              width={100}
                              src={currentBrand.logo ?? '/logo.png'}
                              alt={`${currentBrand.displayName}`}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs">
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
                      className="w-fit rounded-lg p-2"
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
                        <img
                          height={50}
                          width={50}
                          src={brands[0].logo ?? '/logo.png'}
                          alt={`${brands[0].displayName}`}
                        />
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
                        <img
                          height={50}
                          width={50}
                          src={brands[1].logo ?? '/logo.png'}
                          alt={`${brands[1].displayName}`}
                          className='rounded-md'
                        />
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
        <NavCategories categories={visibleCategories} />
        {visibleSecondary.length > 0 && <NavSecondary items={visibleSecondary} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
