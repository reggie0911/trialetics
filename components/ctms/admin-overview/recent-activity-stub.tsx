'use client';

import type { LucideIcon } from 'lucide-react';
import { BarChart3, FileText, Settings, UserPlus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminActivityKind, AdminRecentActivityItem } from '@/lib/dashboard/get-admin-overview-props';
import { cn } from '@/lib/utils';

const ICON_BY_KIND: Record<AdminActivityKind, LucideIcon> = {
  template: FileText,
  invite: UserPlus,
  module: Settings,
  report: BarChart3,
};

const TONE_BY_KIND: Record<AdminActivityKind, { bg: string; text: string }> = {
  template: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  invite: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  module: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  report: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
};

interface RenderedActivityItem extends AdminRecentActivityItem {
  icon: LucideIcon;
  tone: { bg: string; text: string };
}

function relativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const diffMinutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function RecentSystemActivityCard({ activity }: { activity: AdminRecentActivityItem[] }) {
  const rows: RenderedActivityItem[] = activity.map((item) => ({
    ...item,
    icon: ICON_BY_KIND[item.kind],
    tone: TONE_BY_KIND[item.kind],
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b">
        <CardTitle className="text-sm font-semibold">Recent System Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent system activity yet.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
          {rows.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    item.tone.bg,
                    item.tone.text,
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground" title={item.title}>
                    {item.title}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{item.subtitle}</div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                  {relativeTime(item.timestamp)}
                </span>
              </li>
            );
          })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
