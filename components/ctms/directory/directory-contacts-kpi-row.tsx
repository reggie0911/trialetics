'use client';

import type { LucideIcon } from 'lucide-react';
import { AtSign, BriefcaseBusiness, CheckCircle2, Info, UserX, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DirectoryContactsSnapshot } from '@/lib/types/directory';
import { cn } from '@/lib/utils';

export type KpiPreset =
  | { kind: 'total' }
  | { kind: 'complete' }
  | { kind: 'missingRole' }
  | { kind: 'missingTitle' }
  | { kind: 'missingInfo' };

interface KpiCardProps {
  icon: LucideIcon;
  iconBg: string;
  value: string | number;
  label: string;
  footer: ReactNode;
  /** Explains the footer pill; shown on hover/focus. */
  footerTooltip: string;
  onClick?: () => void;
  className?: string;
}

/** Layout aligned with [components/ctms/shared/stat-card.tsx](components/ctms/shared/stat-card.tsx): label, large value, icon top-right, meta row in a pill. */
function KpiCard({ icon: Icon, iconBg, value, label, footer, footerTooltip, onClick, className }: KpiCardProps) {
  const inner = (
    <div className="relative z-10 flex h-full w-full flex-col">
      {onClick ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-center scale-0 rounded-[5px] bg-primary/[0.07] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
        />
      ) : null}
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border',
                      'border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1',
                      'dark:border-neutral-200 dark:bg-[#ffffff]',
                      'text-[11px] font-medium text-foreground',
                    )}
                  />
                }
              >
                <Info
                  className="h-3 w-3 shrink-0 text-muted-foreground dark:text-foreground/70"
                  aria-hidden
                />
                <div className="min-w-0 text-left font-medium leading-snug *:leading-snug">
                  {footer}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left text-xs leading-snug">
                {footerTooltip}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );

  const bodyClass = cn(
    'flex h-full w-full min-h-0 flex-col text-left',
    onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
  );

  return (
    <Card
      className={cn(
        'h-full min-h-0 overflow-hidden border-border/70 py-0',
        onClick && 'group cursor-pointer',
        className,
      )}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={bodyClass}>
          {inner}
        </button>
      ) : (
        <div className={bodyClass}>{inner}</div>
      )}
    </Card>
  );
}

export function DirectoryContactsKpiRow({
  snapshot,
  error,
  loading,
  onPreset,
}: {
  snapshot: DirectoryContactsSnapshot | null;
  error: string | null;
  loading?: boolean;
  onPreset: (p: KpiPreset) => void;
}) {
  if (error) {
    return (
      <p className="text-xs text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (loading || !snapshot) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-full min-h-0 overflow-hidden rounded-[5px] border border-border/70 bg-card">
            <div className="flex h-full min-h-[148px] flex-col px-4 py-3.5">
              <div className="flex w-full min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
              </div>
              <div className="mt-3 max-w-full">
                <Skeleton className="h-6 w-full max-w-[11rem] rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const s = snapshot;
  const deltaWeek = s.totalContactsDeltaWeek;
  const completeness = s.formCompleteness;

  return (
    <TooltipProvider delay={200}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Directory summary">
        <KpiCard
          icon={Users}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          value={s.totalContacts}
          label="Total Contacts"
          footer={
            deltaWeek != null && deltaWeek !== 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {deltaWeek > 0 ? '+' : ''}
                {deltaWeek} this week
              </span>
            ) : (
              <span className="text-muted-foreground">No change this week</span>
            )
          }
          footerTooltip='Total directory contacts linked to this study. The pill shows week-over-week change when that metric is available; otherwise you may see "No change this week".'
          onClick={() => onPreset({ kind: 'total' })}
        />
        <KpiCard
          icon={CheckCircle2}
          iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          value={`${completeness.percent}%`}
          label="Complete Profiles"
          footer={
            <span className="text-muted-foreground">
              {completeness.complete} of {completeness.total} complete
            </span>
          }
          footerTooltip="A complete contact profile has first name, last name, title, role, email, phone, and organization."
          onClick={() => onPreset({ kind: 'complete' })}
        />
        <KpiCard
          icon={UserX}
          iconBg="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
          value={completeness.missingRole}
          label="Missing Roles"
          footer={<span className="text-sky-600 dark:text-sky-400 font-medium">View contacts</span>}
          footerTooltip="Contacts without a primary role selected from the directory role library. Click the card to filter to those people."
          onClick={() => onPreset({ kind: 'missingRole' })}
        />
        <KpiCard
          icon={BriefcaseBusiness}
          iconBg="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
          value={completeness.missingTitle}
          label="Missing Title"
          footer={<span className="text-sky-600 dark:text-sky-400 font-medium">View contacts</span>}
          footerTooltip="Contacts without a job/title value. Title is free text, while Role is selected from the directory role library."
          onClick={() => onPreset({ kind: 'missingTitle' })}
        />
        <KpiCard
          icon={AtSign}
          iconBg="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
          value={completeness.missingContactInfo}
          label="Missing Contact Info"
          footer={<span className="text-muted-foreground">Email or phone gaps</span>}
          footerTooltip="Contacts missing email, phone, or both. Click the card to filter to incomplete contact information."
          onClick={() => onPreset({ kind: 'missingInfo' })}
          className="col-span-2 md:col-span-1"
        />
      </div>
    </TooltipProvider>
  );
}
