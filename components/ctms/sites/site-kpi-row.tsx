'use client';

import { AlertTriangle, ChevronRight, Stethoscope, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import type { SiteStatus } from '@/lib/types/ctms';
import type { SiteEnrollmentActivity } from '@/lib/site-page-metrics';
import type { TaskRollup } from '@/lib/site-page-metrics';

type SiteKpiRowProps = {
  siteStatus: SiteStatus;
  activationDateFormatted: string | null;
  enrolledCount: number;
  targetEnrollment: number;
  enrollmentPct: number;
  enrollmentActivity: SiteEnrollmentActivity;
  hasPi: boolean;
  /** Primary label for assigned PI (name, or email fallback). */
  piDisplayName: string | null | undefined;
  taskRollup: TaskRollup;
  onKpiStatusClick: () => void;
  onKpiEnrollmentClick: () => void;
  onKpiPiClick: () => void;
  onKpiTasksClick: () => void;
  readOnly: boolean;
};

function formatStatusTitle(status: SiteStatus): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SiteKpiRow({
  siteStatus,
  activationDateFormatted,
  enrolledCount,
  targetEnrollment,
  enrollmentPct,
  enrollmentActivity,
  hasPi,
  piDisplayName,
  taskRollup,
  onKpiStatusClick,
  onKpiEnrollmentClick,
  onKpiPiClick,
  onKpiTasksClick,
  readOnly,
}: SiteKpiRowProps) {
  const thisWeek = enrollmentActivity.enrolledThisWeek;
  const lastWeek = enrollmentActivity.enrolledLastWeek;
  const delta = thisWeek - lastWeek;

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      role="list"
    >
      <KpiCard
        readOnly={readOnly}
        ariaLabel={`Site status: ${formatStatusTitle(siteStatus)}`}
        onClick={onKpiStatusClick}
        title="Site status"
        body={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  siteStatus === 'closed' && 'bg-slate-500',
                  (siteStatus === 'enrolling' || siteStatus === 'activated') && 'bg-emerald-500',
                  !['closed', 'enrolling', 'activated'].includes(siteStatus) && 'bg-amber-500',
                )}
                aria-hidden
              />
              <p className="text-xl font-bold tracking-tight">{formatStatusTitle(siteStatus)}</p>
            </div>
            {activationDateFormatted ? (
              <p className="text-xs text-muted-foreground">Active since {activationDateFormatted}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Activation date not set</p>
            )}
          </div>
        }
      />

      <KpiCard
        readOnly={readOnly}
        ariaLabel={`Enrollment: ${enrolledCount} of ${targetEnrollment} subjects, ${enrollmentPct} percent of target.`}
        onClick={onKpiEnrollmentClick}
        title="Enrollment"
        body={
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tabular-nums">
                {enrolledCount} <span className="text-base font-medium text-muted-foreground">/ {targetEnrollment}</span>
              </p>
              <span className="text-sm font-medium text-muted-foreground">{enrollmentPct}% of target</span>
            </div>
            <div className="flex h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, enrollmentPct)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {thisWeek > 0 ? (
                <span>
                  {delta >= 0 ? '+' : ''}
                  {thisWeek} this week
                  {lastWeek > 0 && (
                    <span className="text-muted-foreground/80"> (vs {lastWeek} last week)</span>
                  )}
                </span>
              ) : (
                <span>No enrollments this week</span>
              )}
            </div>
          </div>
        }
      />

      <KpiCard
        readOnly={readOnly}
        ariaLabel={hasPi ? `Principal investigator ${piDisplayName}` : 'Principal investigator not assigned'}
        onClick={onKpiPiClick}
        title="Principal investigator"
        body={
          hasPi ? (
            <div className="flex items-center gap-2 min-h-[3rem]">
              <Stethoscope className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium leading-snug line-clamp-2">{piDisplayName ?? '—'}</p>
            </div>
          ) : (
            <div className="space-y-1.5 min-h-[3rem]">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Not Assigned</span>
              </div>
              <p className="text-xs text-muted-foreground">Assign a PI to support regulatory readiness.</p>
            </div>
          )
        }
      />

      <KpiCard
        readOnly={readOnly}
        ariaLabel={`Open tasks: ${taskRollup.openCount}, ${taskRollup.overdueCount} overdue`}
        onClick={onKpiTasksClick}
        title="Open tasks"
        body={
          <div className="space-y-2 min-h-[3rem]">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold tabular-nums">{taskRollup.openCount}</p>
            </div>
            {taskRollup.overdueCount > 0 ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Requires attention</p>
            ) : (
              <p className="text-xs text-muted-foreground">No overdue work</p>
            )}
            <div className="text-xs text-primary font-medium inline-flex items-center">
              View tasks
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden />
            </div>
          </div>
        }
      />
    </div>
  );
}

function KpiCard({
  title,
  body,
  onClick,
  readOnly,
  ariaLabel,
}: {
  title: string;
  body: React.ReactNode;
  onClick: () => void;
  readOnly: boolean;
  ariaLabel: string;
}) {
  return (
    <div role="listitem" className="h-full min-h-[9rem]">
      <div
        role="button"
        tabIndex={readOnly ? -1 : 0}
        onClick={readOnly ? undefined : onClick}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
        }
        className="text-left w-full h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={ariaLabel}
        aria-disabled={readOnly}
      >
        <Card
          className={`h-full border border-border/80 transition-shadow ${!readOnly ? 'hover:shadow-sm cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
        >
          <CardContent className="p-4 space-y-2 h-full">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {title === 'Site status' && <Activity className="h-3.5 w-3.5" aria-hidden />}
              {title}
            </div>
            {body}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
