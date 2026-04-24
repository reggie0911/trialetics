'use client';

import { createElement } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Info,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type {
  VisitWindowAlert,
  VisitWindowAlertSeverity,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface VisitWindowAlertsBannerProps {
  alerts: VisitWindowAlert[];
  /** Map an alert to a destination URL when its scope can be deep-linked. */
  hrefForAlert?: (alert: VisitWindowAlert) => string | null;
}

const SEVERITY_ORDER: Record<VisitWindowAlertSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
};

const SEVERITY_TONE: Record<VisitWindowAlertSeverity, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

/** Pick an icon based on the alert scope so each chip in the banner reads as
 *  "what kind of thing needs attention" before the eye even gets to the text. */
const SCOPE_ICON: Record<VisitWindowAlert['scope'], LucideIcon> = {
  study: AlertOctagon,
  site: MapPin,
  subject: Users,
  visit: CalendarClock,
};

const SEVERITY_FALLBACK_ICON: Record<VisitWindowAlertSeverity, LucideIcon> = {
  critical: AlertOctagon,
  warn: AlertTriangle,
  info: Info,
};

function iconForAlert(alert: VisitWindowAlert): LucideIcon {
  return SCOPE_ICON[alert.scope] ?? SEVERITY_FALLBACK_ICON[alert.severity];
}

interface AlertChipProps {
  alert: VisitWindowAlert;
  href: string | null;
}

/** Single horizontal chip — icon on the left, two-line stack (title + detail)
 *  on the right. Wraps in a Link when the alert has a deep-link target. */
function AlertChip({ alert, href }: AlertChipProps) {
  const tone = SEVERITY_TONE[alert.severity];
  // Resolve the icon component via lookup at the bottom of the function;
  // render it through `createElement` so the linter doesn't think we're
  // creating a new component type during render.
  const iconNode = createElement(iconForAlert(alert), {
    className: cn('h-4 w-4 shrink-0', tone),
    'aria-hidden': true,
  });

  const content = (
    <span className="flex min-w-0 items-center gap-2.5">
      {iconNode}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn('truncate text-sm font-semibold', tone)}>
          {alert.title}
        </span>
        <span className="truncate text-xs text-red-700/80 dark:text-red-300/80">
          {alert.detail}
        </span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 focus-visible:ring-offset-red-50 dark:focus-visible:ring-offset-red-950"
    >
      {content}
    </Link>
  );
}

/**
 * Red-tinted "Needs attention" banner shown above the tabs whenever the
 * compliance bundle has at least one alert. The first three alerts render
 * as horizontal chips with vertical separators between them; everything
 * else lives behind a `View all alerts (N)` Sheet so the page rhythm
 * doesn't grow unbounded with site count.
 *
 * The component renders nothing when `alerts.length === 0` so callers can
 * mount it unconditionally without managing visibility themselves.
 */
export function VisitWindowAlertsBanner({
  alerts,
  hrefForAlert,
}: VisitWindowAlertsBannerProps) {
  if (alerts.length === 0) return null;
  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  const inline = sorted.slice(0, 3);

  return (
    <div
      role="region"
      aria-label="Visit window alerts"
      className="flex w-full flex-wrap items-stretch gap-y-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 dark:border-red-900/60 dark:bg-red-950/30"
    >
      {/* Leading "Needs attention" cell — divider lives on the right edge so
          it lines up with the chips that follow. */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 sm:border-r sm:border-red-200/70 dark:sm:border-red-900/50">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
          Needs attention
        </span>
      </div>

      {/* Inline alert chips — each chip gets its own divider so the row reads
          as evenly-segmented cells matching the reference design. */}
      <ul className="flex min-w-0 flex-1 flex-wrap items-stretch">
        {inline.map((alert) => (
          <li
            key={alert.id}
            className="flex min-w-0 items-center px-3 py-1.5 sm:border-r sm:border-red-200/70 dark:sm:border-red-900/50"
          >
            <AlertChip alert={alert} href={hrefForAlert?.(alert) ?? null} />
          </li>
        ))}
      </ul>

      {/* Trailing "View all" link — text-only to mirror the reference (no
          button chrome in the banner itself; the sheet does the heavy lifting). */}
      <div className="flex shrink-0 items-center px-3 py-1.5">
        <Sheet>
          <SheetTrigger
            render={
              <button
                type="button"
                className="rounded-sm text-sm font-medium text-red-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-red-400"
              >
                View all alerts ({alerts.length})
              </button>
            }
          />
          <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
            <SheetHeader>
              <SheetTitle>Visit window alerts</SheetTitle>
              <SheetDescription>
                {alerts.length} active alert
                {alerts.length === 1 ? '' : 's'}, ordered by severity.
              </SheetDescription>
            </SheetHeader>
            <ul className="mt-4 space-y-3">
              {sorted.map((alert) => {
                const Icon = iconForAlert(alert);
                const href = hrefForAlert?.(alert) ?? null;
                return (
                  <li
                    key={alert.id}
                    className="rounded-md border bg-card p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          SEVERITY_TONE[alert.severity],
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-medium leading-tight">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.detail}
                        </p>
                      </div>
                      {href ? (
                        <Link
                          href={href}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Open ${alert.title}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <SheetFooter>
              <SheetClose
                render={
                  <Button variant="outline" size="sm" className="w-full">
                    Close
                  </Button>
                }
              />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
