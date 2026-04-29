'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, CalendarDays, Clock, Info, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ActivitySummary } from '@/lib/directory/live-directory-types';

interface KpiCardProps {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  value: string;
  footer: ReactNode;
  footerTone?: 'muted' | 'risk' | 'positive';
  className?: string;
}

/** Layout aligned with [components/ctms/directory/directory-contacts-kpi-row.tsx](components/ctms/directory/directory-contacts-kpi-row.tsx) / StatCard. */
function KpiCard({ icon: Icon, iconBg, label, value, footer, footerTone = 'muted', className }: KpiCardProps) {
  const footerTextClass =
    footerTone === 'risk'
      ? 'text-orange-600 dark:text-orange-400'
      : footerTone === 'positive'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-muted-foreground';

  return (
    <Card
      className={cn('h-full min-h-0 overflow-hidden border-border/70 py-0', className)}
    >
      <div className="flex h-full w-full min-h-0 flex-col text-left">
        <div className="relative z-10 flex h-full w-full flex-col">
          <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
            <div className="flex w-full min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5 text-left">
                <p
                  data-slot="kpi-card-title"
                  className="!text-[12px] font-medium leading-tight text-muted-foreground"
                >
                  {label}
                </p>
                <p className="min-w-0 break-words text-left !text-[30px] font-medium leading-[1.05] tracking-tight text-foreground tabular-nums">
                  {value}
                </p>
              </div>
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
                  iconBg
                )}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
              </span>
            </div>

            <div className="mt-3 flex w-full min-w-0 flex-col">
              <div className="flex w-full justify-start">
                <span
                  className={cn(
                    'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border',
                    'border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1',
                    'dark:border-neutral-200 dark:bg-[#ffffff]',
                    'text-[11px] font-medium',
                  )}
                >
                  <Info
                    className="h-3 w-3 shrink-0 text-muted-foreground dark:text-foreground/70"
                    aria-hidden
                  />
                  <div
                    className={cn(
                      'min-w-0 text-left font-medium leading-snug *:leading-snug',
                      footerTextClass
                    )}
                  >
                    {footer}
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DirectoryActivityKpiRow({ summary }: { summary: ActivitySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Activity summary">
      <KpiCard
        icon={Clock}
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
        label="Last Activity"
        value={summary.lastActivityRelative}
        footer={summary.lastActivityActor}
      />
      <KpiCard
        icon={CalendarDays}
        iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
        label="Total Activities"
        value={String(summary.totalActivities)}
        footer="All time"
      />
      <KpiCard
        icon={TrendingUp}
        iconBg="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
        label="Active in Last 7 Days"
        value={String(summary.activeLast7Days)}
        footer={`${summary.activePctOfTotal}% of total`}
      />
      <KpiCard
        icon={AlertTriangle}
        iconBg="bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300"
        label="Inactivity"
        value={`${summary.inactivityDays} days`}
        footer={summary.inactivityRisk === 'at_risk' ? 'At risk' : 'Healthy'}
        footerTone={summary.inactivityRisk === 'at_risk' ? 'risk' : 'positive'}
      />
      <KpiCard
        icon={Activity}
        iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
        label="Activity Status"
        value={summary.status}
        footer="Engaged"
        footerTone="positive"
        className="col-span-2 md:col-span-1"
      />
    </div>
  );
}
