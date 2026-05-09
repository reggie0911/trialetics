'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, CheckCircle2, Info, MapPin } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OrgKpiSnapshot } from '@/lib/directory/live-directory-types';

export type OrgKpiPreset =
  | { kind: 'total' }
  | { kind: 'complete' }
  | { kind: 'missingAddress' }
  | { kind: 'missingLocation' };

interface OrgKpiCardProps {
  icon: LucideIcon;
  iconBg: string;
  value: string | number;
  label: string;
  footer: ReactNode;
  /** Explains the footer pill; shown on hover/focus. */
  footerTooltip: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

/** Layout aligned with directory-contacts-kpi-row KpiCard (StatCard-style). */
function OrgKpiCard({
  icon: Icon,
  iconBg,
  value,
  label,
  footer,
  footerTooltip,
  onClick,
  className,
  variant = 'compact',
}: OrgKpiCardProps) {
  const compact = variant === 'compact';
  const inner = (
    <div className="relative z-10 flex h-full w-full flex-col">
      {onClick ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-center scale-0 rounded-[5px] bg-primary/[0.07] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
        />
      ) : null}
      <div
        className={cn(
          'relative z-10 flex h-full min-h-0 flex-1 flex-col gap-0',
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
        )}
      >
        <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className={cn('min-w-0 flex-1 text-left', compact ? 'space-y-1' : 'space-y-1.5')}>
            <p
              data-slot="kpi-card-title"
              className={cn(
                'font-medium leading-tight text-muted-foreground',
                compact ? '!text-[11px]' : '!text-[12px]'
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                'min-w-0 break-words text-left font-medium leading-[1.05] tracking-tight text-foreground tabular-nums',
                compact ? '!text-[22px]' : '!text-[30px]'
              )}
            >
              {value}
            </p>
          </div>
          <span
            className={cn(
              'mt-0.5 flex shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              compact ? 'h-6 w-6' : 'h-7 w-7',
              iconBg
            )}
            aria-hidden
          >
            <Icon className={cn('shrink-0 opacity-90', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          </span>
        </div>

        <div className={cn('flex w-full min-w-0 flex-col', compact ? 'mt-2' : 'mt-3')}>
          <div className="flex w-full justify-start">
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border',
                      'border-[#e5e5e5] bg-[#ffffff]',
                      'dark:border-neutral-200 dark:bg-[#ffffff]',
                      'font-medium text-foreground',
                      compact ? 'px-2 py-0.5 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-[11px]'
                    )}
                  />
                }
              >
                <Info
                  className={cn(
                    'shrink-0 text-muted-foreground dark:text-foreground/70',
                    compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
                  )}
                  aria-hidden
                />
                <div className="min-w-0 text-left font-medium leading-snug *:leading-snug text-muted-foreground">
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

interface OrganizationsKpiRowProps {
  snapshot: OrgKpiSnapshot;
  onPreset?: (preset: OrgKpiPreset) => void;
}

export function OrganizationsKpiRow({
  snapshot,
  onPreset,
}: OrganizationsKpiRowProps) {
  const handle = (kind: OrgKpiPreset['kind']) => {
    if (!onPreset) return;
    onPreset({ kind } as OrgKpiPreset);
  };

  const completeness = snapshot.formCompleteness;

  return (
    <TooltipProvider delay={200}>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Organizations summary"
      >
        <OrgKpiCard
          icon={Building2}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          value={snapshot.totalOrganizations}
          label="Total Organizations"
          footer={snapshot.totalOrganizationsLabel}
          footerTooltip="Organization records in the current table after your filters. The pill describes the type scope (for example, all organization types). Click the card to reset organization filters to show the full set."
          onClick={() => handle('total')}
        />
        <OrgKpiCard
          icon={CheckCircle2}
          iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          value={`${completeness.percent}%`}
          label="Complete Records"
          footer={`${completeness.complete} of ${completeness.total} complete`}
          footerTooltip="A complete organization record has name, type, status, address, country, and region."
          onClick={() => handle('complete')}
        />
        <OrgKpiCard
          icon={Building2}
          iconBg="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
          value={completeness.missingAddress}
          label="Missing Address"
          footer="Address gaps"
          footerTooltip="Organization records without core address details. Click the card to filter to records that need address updates."
          onClick={() => handle('missingAddress')}
        />
        <OrgKpiCard
          icon={MapPin}
          iconBg="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
          value={completeness.missingLocation}
          label="Missing Country/Region"
          footer="Location gaps"
          footerTooltip="Organization records missing country or region. Click the card to filter to records that need location updates."
          onClick={() => handle('missingLocation')}
        />
      </div>
    </TooltipProvider>
  );
}
