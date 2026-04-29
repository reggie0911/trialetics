'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileWarning,
  Flag,
  Globe,
  Hourglass,
  Info,
  LocateFixed,
  Play,
  MapPin,
  AlertCircle,
  ShieldX,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkline, StatCard } from '@/components/ctms/shared/stat-card';
import { EnrollmentChart } from '@/components/ctms/reports/enrollment-chart';
import type {
  EnrollmentDataPoint,
  EnrollmentFunnelData,
  KriValueWithDefinition,
  MonitoringVisitWithRelations,
  Study,
  StudyCountryWithSubmissions,
  StudyEcrfRollupBundle,
  StudySite,
  StudyVisitScheduleBundle,
  SubjectWithSite,
} from '@/lib/types/ctms';
import { TRIP_REPORT_DAYS_BASIS_LABELS } from '@/lib/types/visit-reports';
import { formatStudyOverviewRegionsForDisplay } from '@/lib/validation/study-overview';
import { cn } from '@/lib/utils';

export type OverviewTabDestination =
  | 'countries'
  | 'sites'
  | 'subjects'
  | 'team'
  | 'ecrf-tracking'
  | 'visit-window-compliance'
  | 'visits'
  | 'financials';

interface StudyOverviewDashboardProps {
  study: Study;
  counts: { countries: number; sites: number };
  countries: StudyCountryWithSubmissions[];
  sites: StudySite[];
  subjects: SubjectWithSite[];
  funnel: EnrollmentFunnelData;
  monitoringVisits: MonitoringVisitWithRelations[];
  kriValues: KriValueWithDefinition[];
  enrollmentCurve: EnrollmentDataPoint[];
  ecrfRollup: StudyEcrfRollupBundle;
  visitSchedule: StudyVisitScheduleBundle;
  onNavigateTab: (tab: OverviewTabDestination) => void;
  onOpenCreateSubject: () => void;
}

interface TimelineSummary {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentComplete: number;
  monthsElapsed: number;
}

interface SitePerformanceRow {
  id: string;
  label: string;
  status: string;
  enrolled: number;
  progressPct: number | null;
}

interface OverviewAlert {
  title: string;
  description: string;
  tone: 'critical' | 'warning' | 'info';
  onClick: () => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${formatNumber(value, digits)}%`;
}

/**
 * Section title with a hover hint — matches study tab tooltips: bottom, max-w-xs, text-xs.
 */
function OverviewTitleWithHint({
  hint,
  className,
  children,
}: {
  hint: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<div className={cn('inline w-fit min-w-0', className)} />}
      >
        <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
          {children}
        </CardTitle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function formatDateLong(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function buildTimelineSummary(study: Study): TimelineSummary | null {
  if (!study.start_date || !study.end_date) return null;

  const start = new Date(study.start_date);
  const end = new Date(study.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;

  const now = Date.now();
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const boundedNow = Math.min(Math.max(now, start.getTime()), end.getTime());
  const elapsedDays = Math.max(
    0,
    Math.min(totalDays, Math.round((boundedNow - start.getTime()) / 86_400_000)),
  );
  const remainingDays = Math.max(totalDays - elapsedDays, 0);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percentComplete: clampPercent((elapsedDays / totalDays) * 100),
    monthsElapsed: elapsedDays / 30.4375,
  };
}

function parseMonthKey(month: string): Date | null {
  const parsed = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function diffInMonths(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function buildEnrollmentChartData({
  enrollmentCurve,
  plannedEnrollment,
  study,
}: {
  enrollmentCurve: EnrollmentDataPoint[];
  plannedEnrollment: number | null;
  study: Study;
}): EnrollmentDataPoint[] {
  if (enrollmentCurve.length === 0) return enrollmentCurve;

  const actualMap = new Map<string, number>();
  for (const point of enrollmentCurve) {
    if (typeof point.actual === 'number') {
      actualMap.set(point.month, point.actual);
    }
  }

  const firstActualDate = parseMonthKey(enrollmentCurve[0]?.month ?? '');
  const lastActualDate = parseMonthKey(enrollmentCurve[enrollmentCurve.length - 1]?.month ?? '');
  if (!firstActualDate || !lastActualDate) return enrollmentCurve;

  const startDate = study.start_date ? startOfMonth(new Date(study.start_date)) : firstActualDate;
  const chartStart = startDate < firstActualDate ? startDate : firstActualDate;
  const forecastHorizonEnd = addMonths(lastActualDate, 9);
  const chartEnd = forecastHorizonEnd;

  const lastActualValue = enrollmentCurve[enrollmentCurve.length - 1]?.actual ?? 0;
  const pacePerMonth =
    enrollmentCurve.length > 1
      ? lastActualValue / Math.max(diffInMonths(chartStart, lastActualDate) + 1, 1)
      : lastActualValue;

  const endDate = study.end_date ? startOfMonth(new Date(study.end_date)) : null;
  const totalPlanMonths =
    plannedEnrollment != null && endDate && endDate >= chartStart
      ? Math.max(diffInMonths(chartStart, endDate), 1)
      : null;

  const points: EnrollmentDataPoint[] = [];
  for (let cursor = new Date(chartStart); cursor <= chartEnd; cursor = addMonths(cursor, 1)) {
    const monthKey = toMonthKey(cursor);
    const actual =
      cursor <= lastActualDate ? (actualMap.get(monthKey) ?? (points[points.length - 1]?.actual ?? 0)) : null;

    const planned =
      plannedEnrollment != null && totalPlanMonths != null
        ? Math.round(
            Math.min(
              plannedEnrollment,
              (plannedEnrollment * Math.max(diffInMonths(chartStart, cursor), 0)) / totalPlanMonths,
            ),
          )
        : null;

    const forecast =
      plannedEnrollment != null && cursor >= lastActualDate
        ? Math.round(
            Math.min(
              plannedEnrollment,
              lastActualValue + pacePerMonth * Math.max(diffInMonths(lastActualDate, cursor), 0),
            ),
          )
        : null;

    points.push({
      month: monthKey,
      actual,
      planned,
      forecast,
      target: plannedEnrollment,
    });
  }

  return points;
}

function getStudyDisplayName(study: Study): string {
  return study.study_name?.trim() || study.title || study.protocol_number;
}

function OverviewMetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,128px)_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value || '-'}</dd>
    </div>
  );
}

function TimelineRing({ percentComplete }: { percentComplete: number }) {
  const { resolvedTheme } = useTheme();
  const clamped = clampPercent(percentComplete);
  const size = 152;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const trackColor = resolvedTheme === 'dark' ? 'rgb(39 39 42)' : 'rgb(219 234 254)';

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(clamped)} percent complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(59 130 246)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="!text-[24px] font-semibold leading-none tracking-tight text-foreground">
          {Math.round(clamped)}%
        </span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">
          Complete
        </span>
      </div>
    </div>
  );
}

function TimelineMilestone({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <span
        aria-hidden
        className="h-3 border-l border-dashed border-blue-300/70 dark:border-zinc-600"
      />
      <span
        aria-hidden
        className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50/70 text-blue-500 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25"
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SubjectDispositionChart({
  enrolled,
  screenedNotEnrolled,
}: {
  enrolled: number;
  screenedNotEnrolled: number;
}) {
  const { resolvedTheme } = useTheme();

  const segments: Array<{
    name: string;
    value: number;
    stroke: string;
    trackColor: string;
    pillClassName: string;
  }> = [
    {
      name: 'Enrolled',
      value: enrolled,
      stroke: resolvedTheme === 'dark' ? 'rgb(148 163 184)' : 'rgb(15 23 42)',
      trackColor: resolvedTheme === 'dark' ? 'rgb(39 39 42)' : 'rgb(226 232 240)',
      pillClassName:
        'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
    },
    {
      name: 'Screened',
      value: screenedNotEnrolled,
      stroke: 'rgb(59 130 246)',
      trackColor: resolvedTheme === 'dark' ? 'rgb(30 58 138 / 0.4)' : 'rgb(219 234 254)',
      pillClassName:
        'bg-blue-100/70 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    },
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const size = 144;
  const strokeWidth = 13;
  const gap = 2;
  const rings = segments.map((seg, i) => {
    const inset = i * (strokeWidth + gap);
    const r = (size - strokeWidth) / 2 - inset;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? seg.value / total : 0;
    const offset = circ - pct * circ;
    return { ...seg, r, circ, offset };
  });

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,auto)_1px_minmax(0,1fr)]">
      <div
        className="relative mx-auto"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${formatNumber(enrolled)} enrolled of ${formatNumber(total)} total subjects`}
      >
        {total === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
            0
          </div>
        ) : (
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            aria-hidden
          >
            {rings.map((ring) => (
              <g key={ring.name}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ring.r}
                  fill="none"
                  stroke={ring.trackColor}
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ring.r}
                  fill="none"
                  stroke={ring.stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={ring.circ}
                  strokeDashoffset={ring.offset}
                />
              </g>
            ))}
          </svg>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="!text-[24px] font-semibold leading-none tracking-tight text-foreground">
            {formatNumber(total)}
          </span>
          <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Total
          </span>
        </div>
      </div>

      <span aria-hidden className="hidden self-stretch w-px bg-border/70 sm:block" />

      <div className="flex flex-col gap-3">
        {segments.map((seg, i) => (
          <Fragment key={seg.name}>
            {i > 0 ? (
              <span aria-hidden className="h-px w-full bg-border/70" />
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.stroke }}
                />
                <span className="truncate text-sm font-medium text-foreground">
                  {seg.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {formatNumber(seg.value)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'rounded-full border-0 px-2 py-0.5 text-[11px] font-semibold shadow-none',
                    seg.pillClassName,
                  )}
                >
                  {total > 0 ? `${((seg.value / total) * 100).toFixed(1)}%` : '0%'}
                </Badge>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function overviewAlertStripIcon(alert: OverviewAlert) {
  if (/site/i.test(alert.title)) return MapPin;
  if (alert.tone === 'info') return Info;
  return AlertCircle;
}

function OverviewAlertStripRule() {
  return (
    <>
      <div
        className="h-px w-full bg-[#FEB2B2] dark:bg-red-800/50 sm:hidden"
        aria-hidden
      />
      <div
        className="hidden w-px flex flex-col self-stretch py-3.5 sm:flex"
        aria-hidden
      >
        <div className="min-h-0 w-px flex-1 bg-[#FEB2B2] dark:bg-red-800/50" />
      </div>
    </>
  );
}

export function StudyOverviewDashboard({
  study,
  counts,
  countries,
  sites,
  subjects,
  funnel,
  monitoringVisits,
  kriValues,
  enrollmentCurve,
  ecrfRollup,
  visitSchedule,
  onNavigateTab,
  onOpenCreateSubject,
}: StudyOverviewDashboardProps) {
  const router = useRouter();

  const studyName = getStudyDisplayName(study);
  const timeline = buildTimelineSummary(study);
  const plannedEnrollment =
    study.overview?.estimated_enrollment ??
    (() => {
      const total = sites.reduce((sum, site) => sum + Math.max(site.target_enrollment, 0), 0);
      return total > 0 ? total : null;
    })();
  const enrollmentChartData = buildEnrollmentChartData({
    enrollmentCurve,
    plannedEnrollment,
    study,
  });
  const enrolledCount = subjects.length;
  const enrollmentPct =
    plannedEnrollment && plannedEnrollment > 0 ? (enrolledCount / plannedEnrollment) * 100 : null;
  const activeSiteCount = sites.filter(
    (site) => site.status === 'activated' || site.status === 'enrolling',
  ).length;
  const activeSitePct = counts.sites > 0 ? (activeSiteCount / counts.sites) * 100 : 0;
  const countryNames = countries.map((country) => country.country_name);
  const countryPreview = countryNames.slice(0, 3).join(', ');
  const countryDetail =
    countryNames.length > 3
      ? `${countryPreview} +${countryNames.length - 3} more`
      : countryPreview || 'No countries added';
  const avgEnrollmentPerMonth =
    timeline && timeline.monthsElapsed > 0
      ? enrolledCount / Math.max(timeline.monthsElapsed, 1)
      : null;
  const enrollmentSparklineData = (() => {
    const actuals = enrollmentChartData
      .map((point) => (typeof point.actual === 'number' ? point.actual : null))
      .filter((value): value is number => value != null);
    if (actuals.length === 0) return [] as number[];
    const deltas: number[] = [];
    for (let i = 0; i < actuals.length; i++) {
      const previous = i === 0 ? 0 : actuals[i - 1];
      deltas.push(Math.max(actuals[i] - previous, 0));
    }
    return deltas;
  })();
  const inactiveCountryCount = countries.filter(
    (country) => country.status !== 'approved' && country.status !== 'enrolling',
  ).length;
  const activeCountryCount = countries.length - inactiveCountryCount;
  const overdueVisitCount = visitSchedule.overall.overdue;
  const visitCompletionPct =
    visitSchedule.overall.total > 0
      ? (visitSchedule.overall.done / visitSchedule.overall.total) * 100
      : null;
  const ecrfCompletionPct =
    ecrfRollup.totals.dataExpectedTotal > 0
      ? (ecrfRollup.totals.dataEntryTotal / ecrfRollup.totals.dataExpectedTotal) * 100
      : null;

  const enrollmentsBySite = new Map<string, number>();
  for (const subject of subjects) {
    enrollmentsBySite.set(subject.site_id, (enrollmentsBySite.get(subject.site_id) ?? 0) + 1);
  }

  const fallbackSiteTarget =
    plannedEnrollment && counts.sites > 0 ? Math.round(plannedEnrollment / counts.sites) : null;
  const siteRows: SitePerformanceRow[] = sites
    .map((site) => {
      const target =
        site.target_enrollment > 0 ? site.target_enrollment : fallbackSiteTarget;
      const enrolled = enrollmentsBySite.get(site.id) ?? 0;
      return {
        id: site.id,
        label: site.name,
        status: site.status,
        enrolled,
        progressPct:
          target && target > 0 ? clampPercent((enrolled / target) * 100) : null,
      };
    })
    .sort((a, b) => b.enrolled - a.enrolled || a.label.localeCompare(b.label))
    .slice(0, 3);

  const screenedCount =
    funnel.screening +
    funnel.screenFailed +
    funnel.randomized +
    funnel.active +
    funnel.completed +
    funnel.withdrawn +
    funnel.discontinued;
  const enrolledDispositionCount = funnel.randomized + funnel.active + funnel.completed;
  const screenedNotEnrolled = Math.max(screenedCount - enrolledDispositionCount, 0);
  const discontinuedCount = funnel.withdrawn + funnel.discontinued;
  const screenFailureRate =
    screenedNotEnrolled > 0
      ? (funnel.screenFailed / screenedNotEnrolled) * 100
      : funnel.screenFailed > 0
        ? 100
        : 0;
  const discontinuationRate =
    enrolledCount > 0 ? (discontinuedCount / enrolledCount) * 100 : 0;

  const expectedEnrollmentToday =
    plannedEnrollment != null && timeline
      ? Math.round((plannedEnrollment * timeline.percentComplete) / 100)
      : null;
  const activeSitesWithoutEnrollment = sites.filter((site) => {
    const isActive = site.status === 'activated' || site.status === 'enrolling';
    return isActive && (enrollmentsBySite.get(site.id) ?? 0) === 0;
  }).length;
  const criticalKris = kriValues.filter((item) => item.status === 'red').length;
  const atRiskKris = kriValues.filter((item) => item.status === 'yellow').length;

  const baseAlerts: OverviewAlert[] = [];
  if (
    plannedEnrollment != null &&
    expectedEnrollmentToday != null &&
    enrolledCount < expectedEnrollmentToday
  ) {
    baseAlerts.push({
      title: 'Enrollment below plan',
      description: `Actual enrollment is ${formatNumber(enrolledCount)} vs ${formatNumber(expectedEnrollmentToday)} expected by this point.`,
      tone: 'critical',
      onClick: () => onNavigateTab('subjects'),
    });
  }
  if (activeSitesWithoutEnrollment > 0) {
    baseAlerts.push({
      title: 'Inactive sites',
      description: `${formatNumber(activeSitesWithoutEnrollment)} ${pluralize(activeSitesWithoutEnrollment, 'active site')} ${activeSitesWithoutEnrollment === 1 ? 'has' : 'have'} no enrolled subjects yet.`,
      tone: 'warning',
      onClick: () => onNavigateTab('sites'),
    });
  }
  if (overdueVisitCount > 0) {
    baseAlerts.push({
      title: 'Overdue monitoring reports',
      description: `${formatNumber(overdueVisitCount)} ${pluralize(overdueVisitCount, 'visit window')} ${overdueVisitCount === 1 ? 'is' : 'are'} overdue.`,
      tone: 'critical',
      onClick: () => onNavigateTab('visits'),
    });
  }
  if (baseAlerts.length < 3 && criticalKris > 0) {
    baseAlerts.push({
      title: 'Critical KRIs detected',
      description: `${formatNumber(criticalKris)} key ${pluralize(criticalKris, 'risk indicator')} ${criticalKris === 1 ? 'is' : 'are'} in a critical state.`,
      tone: 'critical',
      onClick: () => onNavigateTab('ecrf-tracking'),
    });
  }
  if (baseAlerts.length < 3 && atRiskKris > 0) {
    baseAlerts.push({
      title: 'At-risk KRIs',
      description: `${formatNumber(atRiskKris)} key ${pluralize(atRiskKris, 'risk indicator')} ${atRiskKris === 1 ? 'is' : 'are'} trending at risk.`,
      tone: 'warning',
      onClick: () => onNavigateTab('ecrf-tracking'),
    });
  }
  const realAlertCount = Math.min(99, baseAlerts.length);

  return (
      <div
        className="space-y-6 text-[10px] [&_.text-5xl]:!text-[10px] [&_.text-4xl]:!text-[10px] [&_.text-3xl]:!text-[10px] [&_.text-2xl]:!text-[10px] [&_.text-xl]:!text-[10px] [&_.text-lg]:!text-[10px] [&_.text-base]:!text-[12px] [&_.text-sm]:!text-[10px] [&_.text-xs]:!text-[10px] [&_.text-\[9px\]]:!text-[10px] [&_.text-\[10px\]]:!text-[10px] [&_.text-\[11px\]]:!text-[10px] [&_button]:!text-[10px] [&_a]:!text-[10px] [&_label]:!text-[10px] [&_td]:!text-[10px] [&_th]:!text-[10px] [&_input]:!text-[10px] [&_textarea]:!text-[10px] [&_select]:!text-[10px] [&_li]:!text-[10px] [&_dt]:!text-[10px] [&_dd]:!text-[10px] [&_code]:!text-[10px] [&_[data-slot=card-title]]:!text-[12px] [&_[data-slot=stat-card-title]]:!text-[12px]"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="!text-[32px] font-semibold leading-tight tracking-tight">
              {studyName}
            </h1>
            <StatusBadge status={study.status} className="text-[10px]" />
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.08em]">
              {study.phase}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button asChild size="sm" variant="outline">
                <Link href={`/protected/studies/${study.id}/sites/new`}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Site
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Create a new study site and start tracking activation and enrollment.
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenCreateSubject}
                />
              }
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Subject
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Add a participant record and link it to a site for enrollment tracking.
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Reports
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push(`/protected/studies/${study.id}/reports`)}>
                Reports & Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigateTab('ecrf-tracking')}>
                eCRF Tracking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigateTab('visit-window-compliance')}>
                Visit Window Compliance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigateTab('visits')}>
                Site Visits
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline">
                  More actions
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => router.push(`/protected/studies/${study.id}/edit`)}>
                Edit Study
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigateTab('team')}>
                Manage Team
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigateTab('financials')}>
                Open Financials
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Subjects Enrolled"
          value={
            plannedEnrollment
              ? `${formatNumber(enrolledCount)} / ${formatNumber(plannedEnrollment)}`
              : formatNumber(enrolledCount)
          }
          meta={
            enrollmentPct != null
              ? `${formatPercent(enrollmentPct, 0)} of target`
              : 'Enrollment target not set'
          }
          icon={Users}
          accentClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          topAccentClassName="bg-blue-500"
          progressClassName="bg-blue-500"
          progressPct={enrollmentPct}
          progressCurrentLabel={`${formatNumber(enrolledCount)} enrolled`}
          progressTotalLabel={`${formatNumber(plannedEnrollment ?? 0)} target`}
          progressLabelClassName="text-blue-600 dark:text-blue-300"
          tooltip="Current enrollment progress against the study target. Click to open the Subjects tab."
          onClick={() => onNavigateTab('subjects')}
        />

        <StatCard
          title="Active Sites"
          value={`${formatNumber(activeSiteCount)} / ${formatNumber(counts.sites)}`}
          meta={counts.sites > 0 ? `${formatPercent(activeSitePct, 0)} activated` : 'No sites added'}
          metaIcon={CheckCircle2}
          icon={Building2}
          accentClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          topAccentClassName="bg-emerald-500"
          progressClassName="bg-emerald-500"
          progressPct={activeSitePct}
          progressCurrentLabel={`${formatNumber(activeSiteCount)} active`}
          progressTotalLabel={`${formatNumber(counts.sites)} total`}
          progressLabelClassName="text-emerald-600 dark:text-emerald-300"
          tooltip="Activated and enrolling sites compared with the total configured site count. Click to open the Sites tab."
          onClick={() => onNavigateTab('sites')}
        />

        <StatCard
          title="Countries"
          value={formatNumber(counts.countries)}
          meta={
            counts.countries > 0
              ? `${formatNumber(inactiveCountryCount)} inactive ${pluralize(inactiveCountryCount, 'country', 'countries')}`
              : 'No countries added'
          }
          icon={Globe}
          accentClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
          topAccentClassName="bg-violet-500"
          progressClassName="bg-violet-500"
          progressPct={counts.countries > 0 ? (activeCountryCount / counts.countries) * 100 : 0}
          progressCurrentLabel={`${formatNumber(activeCountryCount)} active`}
          progressTotalLabel={`${formatNumber(counts.countries)} total`}
          progressLabelClassName="text-violet-600 dark:text-violet-300"
          tooltip="Countries where this study is set up or actively running. Click to open the Countries tab."
          onClick={() => onNavigateTab('countries')}
        />

        <StatCard
          title="Study Progress"
          value={timeline ? formatPercent(timeline.percentComplete, 0) : '-'}
          meta={timeline ? 'Based on duration' : 'Start and end dates required'}
          icon={Activity}
          accentClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          topAccentClassName="bg-amber-500"
          progressClassName="bg-amber-500"
          progressPct={timeline?.percentComplete}
          progressCurrentLabel={timeline ? `${formatNumber(timeline.elapsedDays)} days` : '-'}
          progressTotalLabel={timeline ? `${formatNumber(timeline.totalDays)} days` : '-'}
          progressLabelClassName="text-amber-600 dark:text-amber-300"
          tooltip="Elapsed study time compared with the planned overall timeline."
        />

        <StatCard
          title="Avg Enrollment"
          value={avgEnrollmentPerMonth != null ? formatNumber(avgEnrollmentPerMonth, 1) : '-'}
          meta={timeline ? `Since ${formatDateLong(study.start_date)}` : 'Requires start date'}
          icon={TrendingUp}
          accentClassName="bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300"
          topAccentClassName="bg-cyan-500"
          progressClassName="bg-cyan-500"
          sparkline={
            enrollmentSparklineData.length > 1 ? (
              <Sparkline
                data={enrollmentSparklineData}
                strokeClassName="stroke-cyan-500"
                fillClassName="fill-cyan-500/15 dark:fill-cyan-400/15"
                pointClassName="fill-cyan-500"
              />
            ) : null
          }
          tooltip="Average monthly enrollment pace based on progress so far. Click to open the Subjects tab."
          onClick={() => onNavigateTab('subjects')}
        />

        <StatCard
          title="Overdue Reports"
          value={formatNumber(overdueVisitCount)}
          meta={overdueVisitCount > 0 ? 'Needs Attention' : 'No overdue items'}
          icon={FileWarning}
          accentClassName="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          topAccentClassName="bg-rose-500"
          progressClassName="bg-rose-500"
          progressPct={
            visitSchedule.overall.total > 0
              ? (overdueVisitCount / visitSchedule.overall.total) * 100
              : overdueVisitCount > 0
                ? 100
                : 0
          }
          progressCurrentLabel={`${formatNumber(overdueVisitCount)} overdue`}
          progressTotalLabel={`${formatNumber(visitSchedule.overall.total || overdueVisitCount)} total`}
          progressLabelClassName="text-rose-600 dark:text-rose-300"
          tooltip="Visit windows and monitoring activity that require attention. Click to open the Visits tab."
          onClick={() => onNavigateTab('visits')}
        />
      </div>

      {realAlertCount === 0 ? (
        <div
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-foreground shadow-sm sm:px-5 sm:py-4"
          role="region"
          aria-label="Study alerts and risks"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="!text-[12px] font-semibold leading-tight text-foreground">
                No items need attention
              </p>
              <p className="text-xs text-muted-foreground">
                Enrollment, sites, visits, and KRIs are all on track.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/protected/studies/${study.id}/reports`)}
            className="shrink-0 text-sm font-medium text-sky-600 underline decoration-sky-300 underline-offset-2 transition-colors hover:text-sky-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 dark:text-sky-300 dark:decoration-sky-700"
          >
            View reports
          </button>
        </div>
      ) : (
        <div
          className="flex w-full flex-col overflow-hidden rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="region"
          aria-label="Study alerts and risks"
        >
          <div className="flex min-h-0 w-full flex-col sm:flex-row sm:items-stretch">
            <div className="flex shrink-0 items-center gap-2.5 px-4 py-4 sm:max-w-[12rem] sm:px-5 sm:py-5">
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-red-700 dark:text-red-300"
                aria-hidden
              />
              <span className="!text-[12px] font-semibold text-red-900 dark:text-red-100">Needs Attention</span>
            </div>
            <OverviewAlertStripRule />
            {baseAlerts.slice(0, 3).map((alert, idx) => {
              const Icon = overviewAlertStripIcon(alert);
              const isSite = /site/i.test(alert.title);
              return (
                <Fragment key={`${alert.title}-${alert.description}-${String(idx)}`}>
                  <button
                    type="button"
                    onClick={alert.onClick}
                    className={cn(
                      'flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition-colors sm:px-5 sm:py-5',
                      'hover:bg-red-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 dark:hover:bg-red-950/50',
                    )}
                  >
                    {isSite ? (
                      <MapPin
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-300"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold leading-tight text-red-900 dark:text-red-100">
                        {alert.title}
                      </p>
                      <p className="text-sm font-normal leading-snug text-red-600/90 dark:text-red-300/90">
                        {alert.description}
                      </p>
                    </div>
                  </button>
                  <OverviewAlertStripRule key={`sep-${String(idx)}`} />
                </Fragment>
              );
            })}

            <div className="flex min-w-0 shrink-0 items-center justify-end px-4 py-4 sm:px-5 sm:py-5">
              <button
                type="button"
                onClick={() => router.push(`/protected/studies/${study.id}/reports`)}
                className="text-sm font-bold text-red-900 underline decoration-red-300 underline-offset-2 transition-colors hover:text-red-800 hover:decoration-red-500 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 dark:text-red-200 dark:decoration-red-700"
              >
                View all alerts ({realAlertCount})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
        <Card className="border-border/70 py-0">
          <CardHeader className="px-5 pb-0 pt-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              >
                <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="!text-[12px] font-semibold leading-tight text-foreground">
                  Timeline Progress
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Study timeline and completion overview
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5 pt-5">
            <div>
              <div className="relative h-2 rounded-full bg-blue-100/70 dark:bg-zinc-700/70">
                <div
                  aria-hidden
                  className="h-2 rounded-full bg-blue-500 transition-[width]"
                  style={{
                    width: `${clampPercent(timeline?.percentComplete ?? 0)}%`,
                  }}
                />
                {[12.5, 37.5, 62.5, 87.5].map((pos) => (
                  <span
                    key={pos}
                    aria-hidden
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blue-400 bg-card dark:border-blue-400/80"
                    style={{ left: `${pos}%` }}
                  />
                ))}
              </div>

              <div className="mt-1 grid grid-cols-4">
                <TimelineMilestone
                  icon={Play}
                  label="Start Date"
                  value={formatDateLong(study.start_date)}
                />
                <TimelineMilestone
                  icon={LocateFixed}
                  label="Today"
                  value={formatDateLong(new Date().toISOString())}
                />
                <TimelineMilestone
                  icon={Flag}
                  label="End Date"
                  value={formatDateLong(study.end_date)}
                />
                <TimelineMilestone
                  icon={Clock3}
                  label="Duration"
                  value={
                    timeline
                      ? `${formatNumber(timeline.totalDays / 30.4375, 0)} months`
                      : '-'
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50/70 px-4 py-5 dark:bg-blue-500/10">
              <div className="grid grid-cols-[minmax(0,1fr)_1px_auto_1px_minmax(0,1fr)] items-center gap-3">
                <div className="flex flex-col items-center text-center">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700/80 dark:text-blue-200/85">
                    Days Elapsed
                  </p>
                  <p className="mt-1 !text-[24px] font-semibold leading-none tracking-tight text-foreground">
                    {timeline ? formatNumber(timeline.elapsedDays) : '-'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-blue-700/80 dark:text-blue-200/85">
                    {timeline
                      ? `${formatNumber(timeline.monthsElapsed, 1)} months`
                      : 'Timeline unavailable'}
                  </p>
                </div>

                <span
                  aria-hidden
                  className="self-stretch w-px bg-blue-200/60 dark:bg-blue-500/20"
                />

                <TimelineRing percentComplete={timeline?.percentComplete ?? 0} />

                <span
                  aria-hidden
                  className="self-stretch w-px bg-blue-200/60 dark:bg-blue-500/20"
                />

                <div className="flex flex-col items-center text-center">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                  >
                    <Hourglass className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700/80 dark:text-blue-200/85">
                    Days Remaining
                  </p>
                  <p className="mt-1 !text-[24px] font-semibold leading-none tracking-tight text-foreground">
                    {timeline ? formatNumber(timeline.remainingDays) : '-'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-blue-700/80 dark:text-blue-200/85">
                    {timeline
                      ? `${formatNumber(timeline.remainingDays / 30.4375, 1)} months`
                      : 'Timeline unavailable'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-blue-200/60 pt-4 dark:border-blue-500/20">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-blue-500 ring-1 ring-blue-200/70 dark:bg-card dark:text-blue-300 dark:ring-blue-500/30"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-blue-800/85 dark:text-blue-100/85">
                  {timeline
                    ? `${Math.round(timeline.percentComplete)}% of the total timeline has been completed.`
                    : 'Timeline not configured. Add start and end dates to see progress.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <EnrollmentChart data={enrollmentChartData} title="Enrollment Curve" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.28fr)_minmax(0,0.3fr)]">
        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <OverviewTitleWithHint hint="Compare top sites by enrollment totals and performance versus plan.">
                Site Performance
              </OverviewTitleWithHint>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => onNavigateTab('sites')}
              >
                View all sites
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-[minmax(0,1.7fr)_0.9fr_0.8fr_0.8fr] gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <span>Site</span>
                <span>Status</span>
                <span className="text-right">Enrolled</span>
                <span className="text-right">Vs Plan</span>
              </div>
              <div className="space-y-3">
                {siteRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1.7fr)_0.9fr_0.8fr_0.8fr] items-center gap-3 text-sm"
                  >
                    <span className="truncate font-medium">{row.label}</span>
                    <StatusBadge status={row.status} className="w-fit text-[10px]" />
                    <span className="text-right font-medium">{formatNumber(row.enrolled)}</span>
                    <div className="space-y-1 text-right">
                      <span className="text-xs font-medium">{formatPercent(row.progressPct, 0)}</span>
                      <div className="ml-auto h-1.5 w-14 rounded-sm bg-muted">
                        <div
                          className="h-1.5 rounded-sm bg-emerald-500"
                          style={{ width: `${clampPercent(row.progressPct ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(0,1.7fr)_0.9fr_0.8fr_0.8fr] items-center gap-3 border-t pt-3 text-sm font-medium">
                  <span>Total</span>
                  <span className="text-muted-foreground">{formatNumber(counts.sites)} sites</span>
                  <span className="text-right">{formatNumber(enrolledCount)}</span>
                  <span className="text-right">
                    {plannedEnrollment ? formatPercent((enrolledCount / plannedEnrollment) * 100, 0) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0">
          <CardHeader className="px-5 pb-0 pt-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              >
                <Users className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <OverviewTitleWithHint
                  hint="Breakdown of subjects across screening and enrollment, plus screen failure and discontinuation rates."
                  className="block"
                >
                  Subject Disposition
                </OverviewTitleWithHint>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Overview of subject enrollment and screening
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5 pt-5">
            <SubjectDispositionChart
              enrolled={enrolledDispositionCount}
              screenedNotEnrolled={screenedNotEnrolled}
            />

            <div className="h-px w-full bg-border/70" aria-hidden />

            <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                >
                  <ShieldX className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Screen Failure Rate
                  </p>
                  <p className="mt-1 !text-[24px] font-semibold leading-none tracking-tight text-foreground">
                    {formatPercent(screenFailureRate)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatNumber(funnel.screenFailed)} of {formatNumber(screenedNotEnrolled)} screened
                  </p>
                </div>
              </div>

              <span aria-hidden className="self-stretch w-px bg-border/70" />

              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                >
                  <Ban className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Discontinuation Rate
                  </p>
                  <p className="mt-1 !text-[24px] font-semibold leading-none tracking-tight text-foreground">
                    {formatPercent(discontinuationRate)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatNumber(discontinuedCount)} of {formatNumber(enrolledCount)} enrolled
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <OverviewTitleWithHint hint="Snapshot of scheduled visits, overdue activity, and eCRF completion.">
              Visit & eCRF Overview
            </OverviewTitleWithHint>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-4 text-sm">
            <div className="space-y-3">
              <OverviewMetricRow label="Scheduled Visits" value={formatNumber(visitSchedule.overall.total)} />
              <OverviewMetricRow
                label="Completed Visits"
                value={`${formatNumber(visitSchedule.overall.done)} ${visitCompletionPct != null ? `(${formatPercent(visitCompletionPct)})` : ''}`.trim()}
              />
              <OverviewMetricRow
                label="Overdue Visits"
                value={formatNumber(visitSchedule.overall.overdue)}
                valueClassName={visitSchedule.overall.overdue > 0 ? 'text-red-600' : undefined}
              />
            </div>

            <div className="border-t pt-4" />

            <div className="space-y-3">
              <OverviewMetricRow
                label="eCRFs Expected"
                value={formatNumber(ecrfRollup.totals.dataExpectedTotal)}
              />
              <OverviewMetricRow
                label="Data Entered"
                value={formatNumber(ecrfRollup.totals.dataEntryTotal)}
              />
              <OverviewMetricRow
                label="eCRF Completion"
                value={formatPercent(ecrfCompletionPct)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
              Protocol Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <dl className="divide-y">
              <DetailItem label="Protocol Number" value={study.protocol_number} />
              <DetailItem label="Study Type" value={study.overview?.study_type} />
              <DetailItem label="Design" value={study.overview?.design} />
              <DetailItem
                label="Estimated Enrollment"
                value={
                  plannedEnrollment != null
                    ? `${formatNumber(plannedEnrollment)} participants`
                    : null
                }
              />
              <DetailItem
                label="Study Duration"
                value={
                  study.overview?.study_duration_months != null
                    ? `${formatNumber(study.overview.study_duration_months)} months`
                    : timeline
                      ? `${formatNumber(timeline.totalDays / 30.4375, 0)} months`
                      : null
                }
              />
              <DetailItem label="Population" value={study.overview?.population} />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
              Objectives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-4 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Primary Objective
              </p>
              <p className="mt-2 whitespace-pre-wrap">
                {study.overview?.primary_objective || 'No primary objective recorded yet.'}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Key Secondary Objectives
              </p>
              {study.overview?.secondary_objectives?.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {study.overview.secondary_objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">No secondary objectives recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
              Study Sites (Planned)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <dl className="divide-y">
              <DetailItem
                label="Countries"
                value={
                  formatStudyOverviewRegionsForDisplay(study.overview?.study_sites?.regions) ||
                  countryDetail
                }
              />
              <DetailItem
                label="Number of Sites"
                value={study.overview?.study_sites?.site_count_summary || `${formatNumber(counts.sites)} total`}
              />
              <DetailItem
                label="Site Type"
                value={study.overview?.study_sites?.site_types || 'Not specified'}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
              Monitoring Report Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <dl className="divide-y">
              <DetailItem
                label="Report Submission Due"
                value={
                  study.overview?.trip_report_timing?.report_submission_days != null
                    ? `${formatNumber(study.overview.trip_report_timing.report_submission_days)} days`
                    : null
                }
              />
              <DetailItem
                label="Report Approval Due"
                value={
                  study.overview?.trip_report_timing?.report_approval_days != null
                    ? `${formatNumber(study.overview.trip_report_timing.report_approval_days)} days`
                    : null
                }
              />
              <DetailItem
                label="Day Count Basis"
                value={
                  study.overview?.trip_report_timing?.days_basis
                    ? TRIP_REPORT_DAYS_BASIS_LABELS[study.overview.trip_report_timing.days_basis]
                    : null
                }
              />
              <DetailItem
                label="Monitoring Type"
                value={study.overview?.monitoring?.monitoring_type}
              />
            </dl>
          </CardContent>
        </Card>

        {study.description ? (
          <Card className="border-border/70 py-0 xl:col-span-2">
            <CardHeader className="border-b px-5 py-4">
              <CardTitle className="!text-[12px] font-semibold leading-tight text-foreground">
                Study Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                {study.description}
              </p>
              <dl className="divide-y">
                <DetailItem label="Phase" value={study.phase} />
                <DetailItem label="Status" value={study.status.replace(/_/g, ' ')} />
                <DetailItem label="Therapeutic Area" value={study.therapeutic_area} />
                <DetailItem label="Indication" value={study.indication} />
                <DetailItem label="Sponsor" value={study.sponsor} />
              </dl>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
