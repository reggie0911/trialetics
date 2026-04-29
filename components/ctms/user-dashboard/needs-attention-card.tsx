'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  Clock,
  TrendingDown,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardCardEmptyState } from '@/components/ctms/dashboard/dashboard-card-primitives';
import type { DashboardAttentionItem } from '@/lib/dashboard/ctms-dashboard-overview';
import { cn } from '@/lib/utils';

const ICON_BY_KIND: Record<DashboardAttentionItem['kind'], LucideIcon> = {
  visit: CalendarCheck,
  enrollment: TrendingDown,
  task: Clock,
  site: AlertTriangle,
};

const TONE_BY_KEY: Record<DashboardAttentionItem['tone'], { bg: string; text: string }> = {
  red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
};

export function NeedsAttentionCard({ items }: { items: DashboardAttentionItem[] }) {
  const count = items.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
          <Badge
            variant="destructive"
            className="h-5 min-w-5 justify-center px-1.5 text-[11px] font-semibold tabular-nums"
            aria-hidden
          >
            {count}
          </Badge>
          <span className="sr-only">{count} items needing attention</span>
        </div>
        <Link
          href="/protected/my-tasks"
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {items.length === 0 ? (
          <DashboardCardEmptyState>
            No operational alerts need attention right now.
          </DashboardCardEmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
          {items.map((item) => {
            const Icon = ICON_BY_KIND[item.kind];
            const tone = TONE_BY_KEY[item.tone];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-label={item.title}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      tone.bg,
                      tone.text,
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug text-foreground">
                      {item.title}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </div>
                  </div>
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
