'use client';

import type { ComponentType } from 'react';
import {
  ClipboardCheck,
  Globe2,
  Info,
  Mail,
  ShieldCheck,
  Users,
  UserSearch,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface TeamKpiMetrics {
  activeMembers: number;
  pendingInvites: number;
  assignedToStudy: number;
  studyCount: number;
  openRoles: number;
  admins: number;
  externalUsers: number;
  externalUsersAvailable: boolean;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

interface DonutChartProps {
  percentage: number;
  centerValue: string | number;
  fillStrokeClassName: string;
}

function DonutChart({
  percentage,
  centerValue,
  fillStrokeClassName,
}: DonutChartProps) {
  const size = 96;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative mx-auto h-24 w-24">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/70 dark:stroke-muted"
          strokeWidth={strokeWidth}
        />
        {safePct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={fillStrokeClassName}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="max-w-full min-w-0 !text-[30px] font-medium leading-tight tabular-nums tracking-tight text-foreground text-balance">
          {centerValue}
        </span>
      </div>
    </div>
  );
}

interface LegendSegment {
  label: string;
  value: number;
  percentage: number;
  dotClassName: string;
}

function LegendRow({ label, value, percentage, dotClassName }: LegendSegment) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-[11px] leading-snug">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />
        <span className="min-w-0 font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="shrink-0 tabular-nums text-foreground">
        {value}
        <span className="ml-1 text-muted-foreground">({percentage}%)</span>
      </span>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconBgClassName: string;
  iconFgClassName: string;
  topAccentClassName: string;
  donutCenterValue: string | number;
  donutPercentage: number;
  donutStrokeClassName: string;
  primarySegment: LegendSegment;
  secondarySegment: LegendSegment;
  meta?: string;
  tooltip?: string;
}

function KpiCard({
  title,
  icon: Icon,
  iconBgClassName,
  iconFgClassName,
  topAccentClassName,
  donutCenterValue,
  donutPercentage,
  donutStrokeClassName,
  primarySegment,
  secondarySegment,
  meta,
  tooltip,
}: KpiCardProps) {
  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden border-border/70 p-0 py-0 shadow-none">
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <p
            data-slot="stat-card-title"
            className="min-w-0 flex-1 !text-[12px] font-medium leading-tight text-muted-foreground"
          >
            {title}
          </p>
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              iconBgClassName,
            )}
          >
            <Icon
              className={cn('h-3.5 w-3.5 shrink-0 opacity-90', iconFgClassName)}
            />
          </span>
        </div>

        <div className="mt-3 flex w-full justify-center">
          <DonutChart
            percentage={donutPercentage}
            centerValue={donutCenterValue}
            fillStrokeClassName={donutStrokeClassName}
          />
        </div>

        {meta ? (
          <div className="mt-3 w-full">
            <div className="flex w-full justify-start">
              {tooltip ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-left text-[11px] font-medium text-[#000000] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]"
                        aria-label={`${title} — more detail`}
                      >
                        <Info
                          className="h-3 w-3 shrink-0 text-[#000000] opacity-80"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {meta}
                        </span>
                      </button>
                    }
                  />
                  <TooltipContent
                    side="top"
                    className="max-w-xs text-left text-xs text-balance"
                  >
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]">
                  <Info className="h-3 w-3 shrink-0 text-[#000000] opacity-80" aria-hidden />
                  <span className="truncate">{meta}</span>
                </span>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-3 w-full min-w-0 space-y-2 border-t border-border/50 pt-2.5">
          <LegendRow {...primarySegment} />
          <LegendRow {...secondarySegment} />
        </div>
      </div>
    </Card>
  );
}

const remainingDot = 'bg-muted-foreground/30 dark:bg-muted-foreground/40';

function donutPctFor(primary: number, secondary: number): number {
  const denom = primary + secondary;
  if (denom <= 0) return 0;
  return pct(primary, denom);
}

export function StudyTeamKpiCards({ metrics }: { metrics: TeamKpiMetrics }) {
  const inactiveMembers = 0;
  const respondedInvites = 0;
  const unassignedMembers = Math.max(
    metrics.activeMembers - metrics.assignedToStudy,
    0,
  );
  const filledRoles = 0;
  const limitedAccess = 0;
  const internalUsers = 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Active Members"
        icon={Users}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={metrics.activeMembers}
        donutPercentage={donutPctFor(metrics.activeMembers, inactiveMembers)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Active',
          value: metrics.activeMembers,
          percentage: donutPctFor(metrics.activeMembers, inactiveMembers),
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Inactive',
          value: inactiveMembers,
          percentage: donutPctFor(inactiveMembers, metrics.activeMembers),
          dotClassName: remainingDot,
        }}
        meta="With live study roles on this study"
        tooltip="Active members have at least one live study role on this study. The inactive segment covers members in this list without active study access."
      />

      <KpiCard
        title="Pending Invites"
        icon={Mail}
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        topAccentClassName="bg-orange-500"
        donutCenterValue={metrics.pendingInvites}
        donutPercentage={donutPctFor(metrics.pendingInvites, respondedInvites)}
        donutStrokeClassName="stroke-orange-500"
        primarySegment={{
          label: 'Pending',
          value: metrics.pendingInvites,
          percentage: donutPctFor(metrics.pendingInvites, respondedInvites),
          dotClassName: 'bg-orange-500',
        }}
        secondarySegment={{
          label: 'Responded',
          value: respondedInvites,
          percentage: donutPctFor(respondedInvites, metrics.pendingInvites),
          dotClassName: remainingDot,
        }}
        meta="Awaiting invite response"
        tooltip="Invites sent that are still awaiting a response."
      />

      <KpiCard
        title="Assigned to Study"
        icon={ClipboardCheck}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-blue-500"
        donutCenterValue={metrics.assignedToStudy}
        donutPercentage={donutPctFor(metrics.assignedToStudy, unassignedMembers)}
        donutStrokeClassName="stroke-blue-500"
        primarySegment={{
          label: 'Assigned',
          value: metrics.assignedToStudy,
          percentage: donutPctFor(metrics.assignedToStudy, unassignedMembers),
          dotClassName: 'bg-blue-500',
        }}
        secondarySegment={{
          label: 'Unassigned',
          value: unassignedMembers,
          percentage: donutPctFor(unassignedMembers, metrics.assignedToStudy),
          dotClassName: remainingDot,
        }}
        meta="Roster with study role vs not yet"
        tooltip="Team members with a study role on this study, versus people in the study team list not yet given a study assignment."
      />

      <KpiCard
        title="Open Roles"
        icon={UserSearch}
        iconBgClassName="bg-rose-50 dark:bg-rose-500/15"
        iconFgClassName="text-rose-600 dark:text-rose-300"
        topAccentClassName="bg-rose-500"
        donutCenterValue={metrics.openRoles}
        donutPercentage={donutPctFor(metrics.openRoles, filledRoles)}
        donutStrokeClassName="stroke-rose-500"
        primarySegment={{
          label: 'Needs Coverage',
          value: metrics.openRoles,
          percentage: donutPctFor(metrics.openRoles, filledRoles),
          dotClassName: 'bg-rose-500',
        }}
        secondarySegment={{
          label: 'Filled',
          value: filledRoles,
          percentage: donutPctFor(filledRoles, metrics.openRoles),
          dotClassName: remainingDot,
        }}
        meta="Roles still open vs filled"
        tooltip="Role assignments still requiring coverage."
      />

      <KpiCard
        title="Admins"
        icon={ShieldCheck}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={metrics.admins}
        donutPercentage={donutPctFor(metrics.admins, limitedAccess)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Full Access',
          value: metrics.admins,
          percentage: donutPctFor(metrics.admins, limitedAccess),
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Limited Access',
          value: limitedAccess,
          percentage: donutPctFor(limitedAccess, metrics.admins),
          dotClassName: remainingDot,
        }}
        meta="Full vs limited study admin"
        tooltip="Members with full administrative access."
      />

      <KpiCard
        title="External Users"
        icon={Globe2}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutCenterValue={metrics.externalUsers}
        donutPercentage={donutPctFor(metrics.externalUsers, internalUsers)}
        donutStrokeClassName="stroke-violet-500"
        primarySegment={{
          label: 'External',
          value: metrics.externalUsers,
          percentage: donutPctFor(metrics.externalUsers, internalUsers),
          dotClassName: 'bg-violet-500',
        }}
        secondarySegment={{
          label: 'Internal',
          value: internalUsers,
          percentage: donutPctFor(internalUsers, metrics.externalUsers),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.externalUsersAvailable
            ? 'Outside org vs company domain'
            : 'Set company domain to detect'
        }
        tooltip={
          metrics.externalUsersAvailable
            ? 'Members from outside your organization.'
            : 'Configure your company domain to detect external users.'
        }
      />
    </div>
  );
}
