'use client';

import type { ComponentType } from 'react';
import {
  ClipboardCheck,
  Globe2,
  Mail,
  MoreVertical,
  ShieldCheck,
  Users,
  UserSearch,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
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
  centerLabel: string;
  fillStrokeClassName: string;
}

function DonutChart({
  percentage,
  centerValue,
  centerLabel,
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-medium leading-none tracking-tight text-foreground">
          {centerValue}
        </span>
        <span className="mt-1 text-[10px] font-medium text-muted-foreground">
          {centerLabel}
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
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />
        <span className="truncate text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium text-foreground/90">
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
  donutLabel: string;
  donutPercentage: number;
  donutStrokeClassName: string;
  primarySegment: LegendSegment;
  secondarySegment: LegendSegment;
  tooltip?: string;
}

function KpiCard({
  title,
  icon: Icon,
  iconBgClassName,
  iconFgClassName,
  topAccentClassName,
  donutCenterValue,
  donutLabel,
  donutPercentage,
  donutStrokeClassName,
  primarySegment,
  secondarySegment,
  tooltip,
}: KpiCardProps) {
  return (
    <Card
      className="flex h-full flex-col gap-4 overflow-hidden border-border/70 p-0 shadow-none"
      title={tooltip}
    >
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex h-full flex-col gap-4 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                iconBgClassName,
              )}
            >
              <Icon className={cn('h-4 w-4', iconFgClassName)} />
            </span>
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
          </div>
          <span className="text-muted-foreground/70" aria-hidden="true">
            <MoreVertical className="h-4 w-4" />
          </span>
        </div>

        <DonutChart
          percentage={donutPercentage}
          centerValue={donutCenterValue}
          centerLabel={donutLabel}
          fillStrokeClassName={donutStrokeClassName}
        />

        <div className="mt-auto space-y-2 border-t border-border/60 pt-3">
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
        donutLabel="Active"
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
        tooltip="Members currently active on this study."
      />

      <KpiCard
        title="Pending Invites"
        icon={Mail}
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        topAccentClassName="bg-orange-500"
        donutCenterValue={metrics.pendingInvites}
        donutLabel="Pending"
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
        tooltip="Invites sent that are still awaiting a response."
      />

      <KpiCard
        title="Assigned to Study"
        icon={ClipboardCheck}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-blue-500"
        donutCenterValue={metrics.assignedToStudy}
        donutLabel="Assigned"
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
        tooltip={
          metrics.studyCount === 1
            ? 'Across 1 study'
            : `Across ${metrics.studyCount} studies`
        }
      />

      <KpiCard
        title="Open Roles"
        icon={UserSearch}
        iconBgClassName="bg-rose-50 dark:bg-rose-500/15"
        iconFgClassName="text-rose-600 dark:text-rose-300"
        topAccentClassName="bg-rose-500"
        donutCenterValue={metrics.openRoles}
        donutLabel="Open"
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
        tooltip="Role assignments still requiring coverage."
      />

      <KpiCard
        title="Admins"
        icon={ShieldCheck}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={metrics.admins}
        donutLabel="Admins"
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
        tooltip="Members with full administrative access."
      />

      <KpiCard
        title="External Users"
        icon={Globe2}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutCenterValue={metrics.externalUsers}
        donutLabel="External"
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
        tooltip={
          metrics.externalUsersAvailable
            ? 'Members from outside your organization.'
            : 'Configure your company domain to detect external users.'
        }
      />
    </div>
  );
}
