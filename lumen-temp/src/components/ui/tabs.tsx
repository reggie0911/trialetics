'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const [activeRect, setActiveRect] = React.useState<{
    width: number;
    left: number;
  } | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateActiveRect = () => {
      if (!listRef.current) return;

      const activeTab = listRef.current.querySelector('[data-state="active"]');
      if (activeTab) {
        const listRect = listRef.current.getBoundingClientRect();
        const activeTabRect = activeTab.getBoundingClientRect();

        setActiveRect({
          width: activeTabRect.width,
          left: activeTabRect.left - listRect.left,
        });
      }
    };

    // Update on mount and when tabs change
    updateActiveRect();

    // Create a MutationObserver to watch for state changes
    const observer = new MutationObserver(updateActiveRect);
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-state'],
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        'bg-muted/50 text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className,
      )}
      {...props}
    >
      {/* Sliding gradient background */}
      {activeRect && (
        <div
          className="from-chart-1 via-chart-2 to-chart-3 absolute z-0 h-[calc(100%-6px)] rounded-sm bg-gradient-to-tr p-[1px] transition-all duration-200 ease-out"
          style={{
            width: activeRect.width,
            left: activeRect.left,
          }}
        >
          <div className="bg-background h-full w-full rounded-sm" />
        </div>
      )}
      {props.children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground relative z-10 inline-flex h-[calc(100%-6px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border-0 px-4 py-1 text-sm font-medium whitespace-nowrap transition-[color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
