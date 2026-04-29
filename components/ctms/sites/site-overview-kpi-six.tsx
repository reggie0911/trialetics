'use client';

import {
  Activity,
  AlertTriangle,
  Calendar,
  Info,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SiteOverviewServerMetrics } from '@/lib/site-page-metrics';

const R = 40;
const C = 2 * Math.PI * R;

/** Matches study overview StatCard CTA: 11px sky link (not the 10px compact-metric default). */
const kpiStatCtaClass =
  'text-[11px] font-medium text-sky-600 underline-offset-2 transition-colors hover:underline dark:text-sky-400 dark:hover:text-sky-300 hover:text-sky-700';

function KpiCtaButton({
  children,
  onClick,
  className,
  disableTopMarginAuto,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  /** When the parent column uses a `flex-1` spacer, omit `mt-auto` on the button. */
  disableTopMarginAuto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('self-start pt-1.5 text-left', !disableTopMarginAuto && 'mt-auto', kpiStatCtaClass, className)}
    >
      {children}
    </button>
  );
}

type KpiShellProps = {
  children: React.ReactNode;
  className?: string;
  listItem?: boolean;
};

function KpiShell({ children, className, listItem = true }: KpiShellProps) {
  return (
    <div
      role={listItem ? 'listitem' : undefined}
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[5px] border border-border/70 bg-card py-0 text-left shadow-sm',
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">{children}</div>
    </div>
  );
}

function KpiLabelRow({
  icon,
  title,
  iconWrapClassName,
  tooltip,
}: {
  icon?: React.ReactNode;
  title: string;
  /** Backing for the 7×7 top-right box (match StatCard accent). */
  iconWrapClassName?: string;
  /** Explanatory copy; an info control opens a tooltip. */
  tooltip?: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p
          data-slot="stat-card-title"
          className="!text-[12px] font-medium leading-tight text-muted-foreground"
        >
          {title}
        </p>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="shrink-0 rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${title}`}
            >
              <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-balance text-left text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {icon ? (
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/30 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-90',
            iconWrapClassName,
          )}
        >
          {icon}
        </span>
      ) : null}
    </div>
  );
}

/** Main KPI number — aligned with study overview StatCard primary value (30px). */
const kpiPrimaryValueClass =
  'text-[30px] font-medium leading-[1.05] tracking-tight text-foreground tabular-nums';
const kpiPrimaryValueClassNonTabular = kpiPrimaryValueClass.replace(' tabular-nums', '');

function KpiValueBlock({
  children,
  className,
  noTabular = false,
}: { children: React.ReactNode; className?: string; noTabular?: boolean }) {
  return (
    <div
      className={cn(
        'mt-1.5 min-w-0',
        noTabular ? kpiPrimaryValueClassNonTabular : kpiPrimaryValueClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

function KpiSupportingBlock({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const v =
    variant === 'success'
      ? 'text-[11px] font-medium leading-snug text-emerald-600 dark:text-emerald-500'
      : variant === 'warning'
        ? 'text-[11px] font-medium leading-snug text-amber-600 dark:text-amber-500'
        : variant === 'danger'
          ? 'text-[11px] font-medium leading-snug text-destructive'
          : 'text-[11px] font-normal leading-snug text-muted-foreground';
  return <div className={cn('mt-2 min-h-[1.25rem] flex-1', v, className)}>{children}</div>;
}

function HealthRingKpi({
  value,
  displayLabel,
  rank,
  total,
  onViewDetails,
}: {
  value: number;
  displayLabel: 'Good' | 'Fair' | 'At risk';
  rank: number;
  total: number;
  onViewDetails: () => void;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const offset = C - (pct / 100) * C;
  const labelTone =
    displayLabel === 'Good'
      ? 'text-emerald-600 dark:text-emerald-500'
      : 'text-amber-600 dark:text-amber-500';
  const ringClass = displayLabel === 'Good' ? 'stroke-emerald-500' : 'stroke-amber-500';

  return (
    <KpiShell>
      <KpiLabelRow
        title="Site health"
        icon={<Activity className="text-slate-600 dark:text-slate-300" strokeWidth={2.25} />}
        iconWrapClassName="!bg-slate-100 dark:!bg-slate-500/20"
        tooltip="Composite score (0–100) from enrollment progress, eCRF data quality, visit-window compliance, and key contacts (for example, primary investigator). Ranked against other sites in this study."
      />
      <div className="mt-1.5 flex min-h-0 flex-1 gap-3 sm:gap-4">
        <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 sm:h-[5.5rem] sm:w-[5.5rem]" aria-hidden>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" className="stroke-muted/50" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              className={cn(ringClass)}
              strokeWidth="8"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
            <span className="!text-[30px] font-medium leading-none tabular-nums text-foreground">
              {value}
            </span>
            <span className="text-[11px] font-medium leading-tight text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:min-h-[5.5rem]">
          <p className={cn('text-[11px] font-medium leading-snug', labelTone)}>{displayLabel}</p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Ranked #{rank} of {total} sites
          </p>
          <div className="min-h-0 flex-1" aria-hidden />
          <KpiCtaButton onClick={onViewDetails} disableTopMarginAuto>
            View score details
          </KpiCtaButton>
        </div>
      </div>
    </KpiShell>
  );
}

type SiteOverviewKpiSixProps = {
  siteOverviewMetrics: SiteOverviewServerMetrics;
  enrolledCount: number;
  targetEnrollment: number;
  enrollmentBehindPlan: boolean;
  hasPi: boolean;
  piDisplay: string | null;
  onTab: (tab: string) => void;
  /** Optional; e.g. scroll to full health block. No-op if omitted. */
  onScrollHealth?: () => void;
};

export function SiteOverviewKpiSix({
  siteOverviewMetrics,
  enrolledCount,
  targetEnrollment,
  enrollmentBehindPlan,
  hasPi,
  piDisplay,
  onTab,
  onScrollHealth,
}: SiteOverviewKpiSixProps) {
  const { health, healthRank, healthRankTotal, openQueryCount, openQueryDeltaHint, visitCompliancePercent, protocolDeviationCount } =
    siteOverviewMetrics;
  const enrollPct =
    targetEnrollment > 0 ? Math.min(100, Math.round((enrolledCount / targetEnrollment) * 100)) : null;

  const hasQueryDelta = Boolean(openQueryDeltaHint && String(openQueryDeltaHint).trim().length > 0);
  const pdIsConfigured = protocolDeviationCount !== null;
  const pdCount = protocolDeviationCount;

  return (
    <TooltipProvider delay={200}>
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      role="list"
    >
      <HealthRingKpi
        value={health.overall}
        displayLabel={health.displayLabel}
        rank={healthRank}
        total={Math.max(1, healthRankTotal)}
        onViewDetails={onScrollHealth ?? (() => undefined)}
      />

      <KpiShell>
        <KpiLabelRow
          icon={<User className="text-violet-600 dark:text-violet-300" strokeWidth={2.25} />}
          iconWrapClassName="!bg-violet-100/90 dark:!bg-violet-500/20"
          title="Enrollment"
          tooltip="Subjects enrolled at this site versus the enrollment plan target. On track or behind compares progress to a linear plan toward the target and dates."
        />
        <KpiValueBlock>
          {targetEnrollment > 0 ? (
            <div className="inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5">
              <span>
                {enrolledCount} / {targetEnrollment}
              </span>
              {enrollPct != null && (
                <span className="pl-0.5 text-[11px] font-medium text-muted-foreground">({enrollPct}%)</span>
              )}
            </div>
          ) : (
            '—'
          )}
        </KpiValueBlock>
        <KpiSupportingBlock variant={enrollmentBehindPlan ? 'warning' : 'default'}>
          {enrollmentBehindPlan ? (
            <p className="inline-flex max-w-full items-center gap-1 text-inherit">
              <TrendingDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span>Behind plan</span>
            </p>
          ) : targetEnrollment > 0 ? (
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500">On Track</p>
          ) : (
            '—'
          )}
        </KpiSupportingBlock>
        <KpiCtaButton onClick={() => onTab('subjects')}>View enrollment</KpiCtaButton>
      </KpiShell>

      <KpiShell>
        <KpiLabelRow
          icon={<Calendar className="text-emerald-600 dark:text-emerald-300" strokeWidth={2.25} />}
          iconWrapClassName="!bg-emerald-100/90 dark:!bg-emerald-500/20"
          title="Visit compliance"
          tooltip="Share of expected visits on schedule: visits that are not overdue, as a percent of the expected visit total (from visit-window compliance)."
        />
        <KpiValueBlock>{visitCompliancePercent}%</KpiValueBlock>
        <KpiSupportingBlock>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500">On time</span>
        </KpiSupportingBlock>
        <KpiCtaButton onClick={() => onTab('visit-window-compliance')}>View visits</KpiCtaButton>
      </KpiShell>

      <KpiShell>
        <KpiLabelRow
          icon={<MessageCircle className="stroke-[1.5] text-amber-600 dark:text-amber-500" />}
          title="Open queries"
          tooltip="Count of open eCRF/CRF data entry queries. The line below may show a change hint versus the previous week when available."
        />
        <KpiValueBlock>{openQueryCount}</KpiValueBlock>
        <KpiSupportingBlock>
          {hasQueryDelta ? (
            <p className="inline-flex max-w-full items-center gap-1 text-destructive">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              {openQueryDeltaHint}
            </p>
          ) : openQueryCount > 0 ? (
            'Open'
          ) : (
            '—'
          )}
        </KpiSupportingBlock>
        <KpiCtaButton onClick={() => onTab('ecrf-tracking')}>View queries</KpiCtaButton>
      </KpiShell>

      <KpiShell>
        <KpiLabelRow
          icon={<AlertTriangle className="text-red-600 dark:text-red-300" strokeWidth={2.25} />}
          iconWrapClassName="!bg-rose-100/90 dark:!bg-red-500/20"
          title="Protocol deviations"
          tooltip="Count of open protocol deviations when the study is configured to track them; otherwise the metric is not configured."
        />
        <KpiValueBlock>{pdIsConfigured && pdCount != null ? pdCount : '—'}</KpiValueBlock>
        <KpiSupportingBlock>
          {pdIsConfigured && pdCount != null ? 'Open' : 'Not configured'}
        </KpiSupportingBlock>
        <KpiCtaButton onClick={() => onTab('ecrf-tracking')}>View deviations</KpiCtaButton>
      </KpiShell>

      <KpiShell>
        <KpiLabelRow
          icon={<User className="text-violet-600 dark:text-violet-300" strokeWidth={2.25} />}
          iconWrapClassName="!bg-violet-100/90 dark:!bg-violet-500/20"
          title="PI status"
          tooltip="Whether a primary investigator (PI) is assigned on the site. Assign one on the Contacts tab so training-related factors can score correctly."
        />
        {hasPi && piDisplay ? (
          <KpiValueBlock
            noTabular
            className="text-xl font-semibold leading-[1.2] sm:text-2xl sm:font-semibold"
          >
            <span className="line-clamp-2 break-words">{piDisplay}</span>
          </KpiValueBlock>
        ) : (
          <KpiValueBlock>
            <span className="text-base font-medium text-destructive">Not Assigned</span>
          </KpiValueBlock>
        )}
        <KpiSupportingBlock>
          {hasPi ? (
            <span>Primary investigator</span>
          ) : (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-500">Required</span>
          )}
        </KpiSupportingBlock>
        <KpiCtaButton onClick={() => onTab('contacts')}>{hasPi ? 'View contacts' : 'Assign PI'}</KpiCtaButton>
      </KpiShell>
    </div>
    </TooltipProvider>
  );
}
