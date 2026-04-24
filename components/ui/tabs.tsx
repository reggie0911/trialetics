'use client';

/**
 * Vendored from @radix-ui/react-tabs@1.1.13 with one behavioral change:
 * optional `tabsId` is passed to @radix-ui/react-id's useId(), giving stable
 * trigger/content ids across SSR and client (avoids React 19 / Turbopack hydration
 * mismatches on `aria-controls` / `id` for tab triggers).
 */
import * as React from 'react';
import { composeEventHandlers } from '@radix-ui/primitive';
import { createContextScope } from '@radix-ui/react-context';
import type { Scope } from '@radix-ui/react-context';
import { createRovingFocusGroupScope } from '@radix-ui/react-roving-focus';
import { Presence } from '@radix-ui/react-presence';
import { Primitive } from '@radix-ui/react-primitive';
import * as RovingFocusGroup from '@radix-ui/react-roving-focus';
import { useDirection } from '@radix-ui/react-direction';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useId } from '@radix-ui/react-id';

import { cn } from '@/lib/utils';

const TABS_NAME = 'Tabs';
const TAB_LIST_NAME = 'TabsList';
const TRIGGER_NAME = 'TabsTrigger';
const CONTENT_NAME = 'TabsContent';

type ScopedProps<P> = P & { __scopeTabs?: Scope };

const [createTabsContext, createTabsScope] = createContextScope(TABS_NAME, [createRovingFocusGroupScope]);
const useRovingFocusGroupScope = createRovingFocusGroupScope();

type RovingFocusGroupProps = React.ComponentPropsWithoutRef<typeof RovingFocusGroup.Root>;
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Primitive.div>;

interface TabsContextValue {
  baseId: string;
  value: string;
  onValueChange: (value: string) => void;
  orientation: RovingFocusGroupProps['orientation'];
  dir: ReturnType<typeof useDirection>;
  activationMode: 'automatic' | 'manual';
}

const [TabsProviderPrimitive, useTabsContextPrimitive] = createTabsContext(TABS_NAME);

const TabsProvider = TabsProviderPrimitive as React.FC<
  TabsContextValue & { scope?: Scope; children: React.ReactNode }
>;

function useTabsContext(consumerName: string, __scopeTabs?: Scope): TabsContextValue {
  return useTabsContextPrimitive(consumerName, __scopeTabs) as TabsContextValue;
}

export interface TabsProps extends PrimitiveDivProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: RovingFocusGroupProps['orientation'];
  dir?: RovingFocusGroupProps['dir'];
  activationMode?: 'automatic' | 'manual';
  __scopeTabs?: Scope;
  /**
   * Page-unique string for Radix tab id generation. When set, avoids SSR/client
   * hydration mismatches on tab trigger ids and aria-controls (React 19 + Next).
   */
  tabsId?: string;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      __scopeTabs,
      tabsId: tabsIdProp,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = 'horizontal',
      dir,
      activationMode = 'automatic',
      className,
      ...tabsProps
    },
    forwardedRef
  ) => {
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? '',
      caller: TABS_NAME,
    });

    return (
      <TabsProvider
        scope={__scopeTabs}
        baseId={useId(tabsIdProp)}
        value={value}
        onValueChange={setValue}
        orientation={orientation}
        dir={direction}
        activationMode={activationMode}
      >
        <Primitive.div
          data-slot="tabs"
          dir={direction}
          data-orientation={orientation}
          className={cn('flex flex-col gap-2', className)}
          {...tabsProps}
          ref={forwardedRef}
        />
      </TabsProvider>
    );
  }
);
Tabs.displayName = TABS_NAME;

export interface TabsListProps extends PrimitiveDivProps {
  loop?: RovingFocusGroupProps['loop'];
}

const TabsList = React.forwardRef<HTMLDivElement, ScopedProps<TabsListProps>>(
  ({ __scopeTabs, loop = true, className, ...listProps }, forwardedRef) => {
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    return (
      <RovingFocusGroup.Root asChild {...rovingFocusGroupScope} orientation={context.orientation} dir={context.dir} loop={loop}>
        <Primitive.div
          data-slot="tabs-list"
          role="tablist"
          aria-orientation={context.orientation}
          className={cn(
            'text-muted-foreground relative inline-flex w-fit items-center gap-0 border-b border-border',
            className
          )}
          {...listProps}
          ref={forwardedRef}
        />
      </RovingFocusGroup.Root>
    );
  }
);
TabsList.displayName = TAB_LIST_NAME;

type PrimitiveButtonProps = React.ComponentPropsWithoutRef<typeof Primitive.button>;

export interface TabsTriggerProps extends PrimitiveButtonProps {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, ScopedProps<TabsTriggerProps>>(
  ({ __scopeTabs, value, disabled = false, className, ...triggerProps }, forwardedRef) => {
    const context = useTabsContext(TRIGGER_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    return (
      <RovingFocusGroup.Item asChild {...rovingFocusGroupScope} focusable={!disabled} active={isSelected}>
        <Primitive.button
          type="button"
          role="tab"
          aria-selected={isSelected}
          aria-controls={contentId}
          data-state={isSelected ? 'active' : 'inactive'}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
          id={triggerId}
          data-slot="tabs-trigger"
          className={cn(
            // Layout — font-weight stays constant across states to avoid shifting siblings
            'group/tab relative -mb-px inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm font-medium',
            // Smooth, scoped transitions (no transition-all -> no width animation)
            'transition-[color,background-color,border-color] duration-200 ease-out',
            // Default + hover state for inactive tabs
            'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            // Active state
            'data-[state=active]:border-primary data-[state=active]:text-foreground',
            // Focus ring
            'focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1',
            // Disabled
            'disabled:pointer-events-none disabled:opacity-50',
            // Icon sizing
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110",
            className
          )}
          {...triggerProps}
          ref={forwardedRef}
          onMouseDown={composeEventHandlers(triggerProps.onMouseDown, (event) => {
            if (!disabled && event.button === 0 && event.ctrlKey === false) {
              context.onValueChange(value);
            } else {
              event.preventDefault();
            }
          })}
          onKeyDown={composeEventHandlers(triggerProps.onKeyDown, (event) => {
            if ([' ', 'Enter'].includes(event.key)) context.onValueChange(value);
          })}
          onFocus={composeEventHandlers(triggerProps.onFocus, () => {
            const isAutomaticActivation = context.activationMode !== 'manual';
            if (!isSelected && !disabled && isAutomaticActivation) {
              context.onValueChange(value);
            }
          })}
        />
      </RovingFocusGroup.Item>
    );
  }
);
TabsTrigger.displayName = TRIGGER_NAME;

export interface TabsContentProps extends PrimitiveDivProps {
  value: string;
  forceMount?: true;
}

const TabsContent = React.forwardRef<HTMLDivElement, ScopedProps<TabsContentProps>>(
  ({ __scopeTabs, value, forceMount, children, className, ...contentProps }, forwardedRef) => {
    const context = useTabsContext(CONTENT_NAME, __scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    const isMountAnimationPreventedRef = React.useRef(isSelected);

    React.useEffect(() => {
      const rAF = requestAnimationFrame(() => {
        isMountAnimationPreventedRef.current = false;
      });
      return () => cancelAnimationFrame(rAF);
    }, []);

    return (
      <Presence present={forceMount || isSelected}>
        {({ present }) => (
          <Primitive.div
            data-slot="tabs-content"
            data-state={isSelected ? 'active' : 'inactive'}
            data-orientation={context.orientation}
            role="tabpanel"
            aria-labelledby={triggerId}
            hidden={!isSelected}
            id={contentId}
            tabIndex={isSelected ? 0 : -1}
            suppressHydrationWarning
            className={cn('flex-1 outline-none', className)}
            {...contentProps}
            ref={forwardedRef}
            style={{
              ...contentProps.style,
              animationDuration: isMountAnimationPreventedRef.current ? '0s' : undefined,
            }}
          >
            {present && children}
          </Primitive.div>
        )}
      </Presence>
    );
  }
);
TabsContent.displayName = CONTENT_NAME;

function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`;
}

function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`;
}

export { Tabs, TabsList, TabsTrigger, TabsContent, createTabsScope };
