import { endOfWeek, isWithinInterval, min, startOfWeek, subWeeks } from 'date-fns';

import type {
  SiteEcrfRollupBundle,
  SiteVisitWindowComplianceBundle,
  SubjectWithSite,
} from '@/lib/types/ctms';
import type { TaskWithRelations } from '@/lib/types/tasks';
import type { EnrollmentPoint } from './site-enrollment-forecast';

const ENROLLED_STATUSES = new Set<SubjectWithSite['status']>(['randomized', 'active', 'completed']);

function subjectEnrollmentEventDate(s: SubjectWithSite): Date | null {
  if (!ENROLLED_STATUSES.has(s.status)) return null;
  if (s.randomization_date) return new Date(s.randomization_date);
  return new Date(s.created_at);
}

function weekInterval(weeksAgo: number) {
  const now = new Date();
  const base = subWeeks(now, weeksAgo);
  return {
    start: startOfWeek(base, { weekStartsOn: 1 }),
    end: endOfWeek(base, { weekStartsOn: 1 }),
  };
}

export interface SiteEnrollmentActivity {
  enrolledThisWeek: number;
  enrolledLastWeek: number;
  firstSubjectEnrolledAt: string | null;
}

export function computeSiteEnrollmentActivity(subjects: SubjectWithSite[]): SiteEnrollmentActivity {
  const thisWeek = weekInterval(0);
  const lastWeek = weekInterval(1);
  const dates: Date[] = [];

  let enrolledThisWeek = 0;
  let enrolledLastWeek = 0;

  for (const s of subjects) {
    const d = subjectEnrollmentEventDate(s);
    if (!d) continue;
    dates.push(d);
    if (isWithinInterval(d, thisWeek)) enrolledThisWeek += 1;
    if (isWithinInterval(d, lastWeek)) enrolledLastWeek += 1;
  }

  const first = dates.length > 0 ? min(dates) : null;
  return {
    enrolledThisWeek,
    enrolledLastWeek,
    firstSubjectEnrolledAt: first ? first.toISOString() : null,
  };
}

export function isTaskOpen(t: TaskWithRelations): boolean {
  return t.status !== 'completed';
}

export function isTaskOverdue(t: TaskWithRelations): boolean {
  if (t.status === 'completed' || !t.due_date) return false;
  const due = new Date(t.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export interface TaskRollup {
  openCount: number;
  overdueCount: number;
}

export function computeTaskRollup(tasks: TaskWithRelations[]): TaskRollup {
  const open = tasks.filter(isTaskOpen);
  return {
    openCount: open.length,
    overdueCount: open.filter(isTaskOverdue).length,
  };
}

export interface SiteHealthBreakdown {
  overall: number;
  label: 'Good' | 'Fair' | 'Needs work';
  /** Reference-style label for main KPI. */
  displayLabel: 'Good' | 'Fair' | 'At risk';
  enrollment: number;
  dataQuality: number;
  visitCompliance: number;
  training: number;
}

export function toHealthDisplayLabel(
  label: SiteHealthBreakdown['label'],
): 'Good' | 'Fair' | 'At risk' {
  if (label === 'Needs work') return 'At risk';
  return label;
}

export function computeDataQualityPercent(totals: SiteEcrfRollupBundle['totals']): number {
  const exp = totals.dataExpectedTotal;
  if (exp <= 0) return 100;
  return Math.min(100, Math.round((totals.dataEntryTotal / exp) * 100));
}

export function computeVisitCompliancePercent(overall: SiteVisitWindowComplianceBundle['rollup']['overall']): number {
  const t = overall.total;
  if (t <= 0) return 100;
  // Treat non-overdue share as compliance proxy (matches operational "on track").
  return Math.min(100, Math.round(100 * (1 - overall.overdue / t)));
}

export function computeTrainingPercent(hasPi: boolean, siteContactCount: number): number {
  if (hasPi) return 100;
  if (siteContactCount > 0) return 60;
  return 30;
}

export function computeSiteHealth(
  enrollmentPct: number,
  ecrfRollup: SiteEcrfRollupBundle,
  visitWindowCompliance: SiteVisitWindowComplianceBundle,
  hasPi: boolean,
  siteContactCount: number,
): SiteHealthBreakdown {
  const dataQuality = computeDataQualityPercent(ecrfRollup.totals);
  const visitCompliance = computeVisitCompliancePercent(visitWindowCompliance.rollup.overall);
  const training = computeTrainingPercent(hasPi, siteContactCount);
  const overall = Math.round(
    enrollmentPct * 0.3 + dataQuality * 0.3 + visitCompliance * 0.3 + training * 0.1,
  );
  const label: SiteHealthBreakdown['label'] =
    overall >= 70 ? 'Good' : overall >= 45 ? 'Fair' : 'Needs work';
  return {
    overall: Math.max(0, Math.min(100, overall)),
    label,
    displayLabel: toHealthDisplayLabel(label),
    enrollment: Math.min(100, enrollmentPct),
    dataQuality,
    visitCompliance,
    training,
  };
}

export function sumOpenQueries(bundle: SiteEcrfRollupBundle): number {
  return bundle.bySubject.reduce((acc, row) => acc + (row.openQueryCount ?? 0), 0);
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export type AttentionCtaAction = 'assign_pi' | 'view_plan' | 'schedule_visit' | 'view_tab';

export interface AttentionItem {
  id: string;
  title: string;
  /** Secondary line under the title (e.g. enrollment counts). */
  subtitle?: string;
  severity: AttentionSeverity;
  tab: string;
  /** If set, append hash for scroll (optional) */
  hash?: string;
  ctaLabel: string;
  ctaAction: AttentionCtaAction;
}

const DAYS_LOW_ENROLL = 30;
const LOW_ENROLL_PCT = 50;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function buildNeedsAttentionList(params: {
  hasPi: boolean;
  activationDate: string | null;
  enrollmentPct: number;
  enrolledCount: number;
  targetEnrollment: number;
  taskRollup: TaskRollup;
  openQueryCount: number;
  /** True when site has no scheduled visit rows in the upcoming bucket. */
  noVisitsScheduled: boolean;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (!params.hasPi) {
    items.push({
      id: 'no-pi',
      title: 'No Principal Investigator assigned',
      subtitle: 'PI is required for site activation.',
      severity: 'critical',
      tab: 'contacts',
      ctaLabel: 'Assign PI',
      ctaAction: 'assign_pi',
    });
  }
  const d = daysSince(params.activationDate);
  if (
    d != null
    && d > DAYS_LOW_ENROLL
    && params.enrollmentPct < LOW_ENROLL_PCT
  ) {
    const t = params.targetEnrollment;
    const e = params.enrolledCount;
    const pct = t > 0 ? Math.min(100, Math.round((e / t) * 100)) : params.enrollmentPct;
    const sub =
      t > 0
        ? `${e} of ${t} subject${t === 1 ? '' : 's'} enrolled (${pct}%).`
        : 'Enrollment is below plan for the activation window.';
    items.push({
      id: 'enrollment-low',
      title: 'Enrollment behind plan',
      subtitle: sub,
      severity: 'warning',
      tab: 'subjects',
      ctaLabel: 'View plan',
      ctaAction: 'view_plan',
    });
  }
  if (params.taskRollup.overdueCount > 0) {
    items.push({
      id: 'tasks-overdue',
      title: `${params.taskRollup.overdueCount} task${params.taskRollup.overdueCount === 1 ? '' : 's'} overdue`,
      subtitle: 'Complete or reassign to stay on track.',
      severity: 'info',
      tab: 'tasks',
      ctaLabel: 'View tasks',
      ctaAction: 'view_tab',
    });
  }
  if (params.openQueryCount > 0) {
    items.push({
      id: 'ecrf-queries',
      title: `${params.openQueryCount} open eCRF quer${params.openQueryCount === 1 ? 'y' : 'ies'}`,
      subtitle: 'Review and respond in eCRF tracking.',
      severity: 'info',
      tab: 'ecrf-tracking',
      ctaLabel: 'Open eCRF',
      ctaAction: 'view_tab',
    });
  }
  if (params.noVisitsScheduled) {
    items.push({
      id: 'no-visits',
      title: 'No visits scheduled',
      subtitle: 'No upcoming visits in the next 30 days.',
      severity: 'warning',
      tab: 'visit-window-compliance',
      ctaLabel: 'Schedule visit',
      ctaAction: 'schedule_visit',
    });
  }
  return items.slice(0, 5);
}

export function computeSiteRankByEnrollment(
  currentSiteId: string,
  sites: { id: string; target_enrollment: number; enrolled: number }[],
): { rank: number; total: number } {
  if (sites.length === 0) return { rank: 1, total: 1 };
  const withScore = sites.map((s) => ({
    id: s.id,
    score: s.target_enrollment > 0 ? (s.enrolled / s.target_enrollment) * 100 : 0,
  }));
  withScore.sort((a, b) => b.score - a.score);
  const index = withScore.findIndex((s) => s.id === currentSiteId);
  const rank = index >= 0 ? index + 1 : 1;
  return { rank, total: sites.length };
}

export interface SiteOverviewServerMetrics {
  taskRollup: TaskRollup;
  enrollmentActivity: SiteEnrollmentActivity;
  health: SiteHealthBreakdown;
  needsAttention: AttentionItem[];
  openQueryCount: number;
  /** v1: optional delta when query-by-week not available. */
  openQueryDeltaHint: string | null;
  enrollmentPct: number;
  generatedAtIso: string;
  healthRank: number;
  healthRankTotal: number;
  visitCompliancePercent: number;
  /** No first-class PD module — null shows "not configured" in UI. */
  protocolDeviationCount: null;
  /** Serializable for client components (ISO dates). */
  enrollmentChart: {
    points: EnrollmentPoint[];
    targetEnrollment: number;
    expectedByNow: number;
    planCompletionDateIso: string | null;
    projectedCompletionDateIso: string | null;
    monthsBehind: number;
    behindPlan: boolean;
  };
}
