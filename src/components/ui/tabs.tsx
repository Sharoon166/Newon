'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex items-center gap-6 border-b border-border bg-transparent',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors',
        'text-muted-foreground hover:text-foreground',
        'data-[state=active]:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        'cursor-pointer',
        // Underline indicator — sits at bottom, scales in on active
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:-mb-px after:origin-center after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200',
        'data-[state=active]:after:scale-x-100',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
