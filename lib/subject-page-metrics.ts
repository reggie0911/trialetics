import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type { AttentionItem } from '@/lib/site-page-metrics';
import type { SubjectCrf, SubjectStatus, SubjectVisitWithCrfs } from '@/lib/types/ctms';

export const TYPICAL_SCREENING_DAYS = 21;

export type SubjectLifecycleSub =
  | 'pending'
  | { kind: 'date'; value: string }
  | { kind: 'text'; value: string };

export type SubjectLifecycleStep = {
  id: 'screening' | 'randomized' | 'active' | 'completed';
  /**
   * 1-based index (reference UI / aria).
   */
  number: 1 | 2 | 3 | 4;
  label: string;
  state: 'complete' | 'current' | 'pending' | 'terminal';
  sub: SubjectLifecycleSub;
};

function dayCountFromScreeningIso(screeningDate: string, end: Date = new Date()): number {
  const head = String(screeningDate).slice(0, 10);
  const [y, m, d] = head.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const start = new Date(y, m - 1, d);
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function daysInScreeningPhase(
  status: SubjectStatus,
  screeningDate: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!screeningDate) return null;
  if (status !== 'pre_screening' && status !== 'screening') return null;
  return dayCountFromScreeningIso(screeningDate, referenceDate);
}

export function isScreeningDurationHigh(
  status: SubjectStatus,
  screeningDate: string | null | undefined,
  threshold: number = TYPICAL_SCREENING_DAYS,
  referenceDate: Date = new Date(),
): boolean {
  const d = daysInScreeningPhase(status, screeningDate, referenceDate);
  return d != null && d > threshold;
}

/**
 * Formats a subject lifecycle for the 4-node horizontal stepper (Screening → Randomized →
 * Active treatment → Completed) using status + key dates.
 */
export function mapSubjectToLifecycleSteps(params: {
  status: SubjectStatus;
  screeningDate: string | null;
  randomizationDate: string | null;
}): SubjectLifecycleStep[] {
  const { status, screeningDate, randomizationDate } = params;
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const s1: SubjectLifecycleStep = {
    id: 'screening',
    number: 1,
    label: 'Screening',
    state: 'pending',
    sub: screeningDate ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` } : 'pending',
  };
  const s2: SubjectLifecycleStep = {
    id: 'randomized',
    number: 2,
    label: 'Randomized',
    state: 'pending',
    sub: { kind: 'text', value: 'Pending' },
  };
  const s3: SubjectLifecycleStep = {
    id: 'active',
    number: 3,
    label: 'Active Treatment',
    state: 'pending',
    sub: { kind: 'text', value: 'Pending' },
  };
  const s4: SubjectLifecycleStep = {
    id: 'completed',
    number: 4,
    label: 'Completed',
    state: 'pending',
    sub: { kind: 'text', value: 'Pending' },
  };

  if (status === 'screen_failed') {
    s1.state = 'terminal';
    s1.sub = { kind: 'text', value: 'Failed' };
    s2.sub = { kind: 'text', value: '—' };
    s3.sub = { kind: 'text', value: '—' };
    s4.sub = { kind: 'text', value: '—' };
    return [s1, s2, s3, s4];
  }

  if (status === 'withdrawn' || status === 'discontinued') {
    s1.state = 'complete';
    s1.sub = screeningDate
      ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` }
      : { kind: 'text', value: '—' };
    s2.state = randomizationDate ? 'complete' : 'pending';
    s2.sub = randomizationDate
      ? { kind: 'date', value: `Date: ${fmt(randomizationDate)!}` }
      : { kind: 'text', value: '—' };
    s3.state = 'complete';
    s3.sub = { kind: 'text', value: '—' };
    s4.state = 'terminal';
    s4.sub = { kind: 'text', value: status === 'withdrawn' ? 'Withdrawn' : 'Discontinued' };
    return [s1, s2, s3, s4];
  }

  if (status === 'completed') {
    s1.state = 'complete';
    s1.sub = screeningDate
      ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` }
      : { kind: 'text', value: '—' };
    s2.state = 'complete';
    s2.sub = randomizationDate
      ? { kind: 'date', value: `Date: ${fmt(randomizationDate)!}` }
      : { kind: 'text', value: '—' };
    s3.state = 'complete';
    s3.sub = { kind: 'text', value: '—' };
    s4.state = 'complete';
    s4.sub = { kind: 'text', value: 'Done' };
    return [s1, s2, s3, s4];
  }

  if (status === 'active') {
    s1.state = 'complete';
    s1.sub = screeningDate
      ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` }
      : { kind: 'text', value: '—' };
    s2.state = 'complete';
    s2.sub = randomizationDate
      ? { kind: 'date', value: `Date: ${fmt(randomizationDate)!}` }
      : { kind: 'text', value: '—' };
    s3.state = 'current';
    s3.sub = { kind: 'text', value: 'In progress' };
    s4.state = 'pending';
    s4.sub = { kind: 'text', value: 'Pending' };
    return [s1, s2, s3, s4];
  }

  if (status === 'randomized') {
    s1.state = 'complete';
    s1.sub = screeningDate
      ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` }
      : { kind: 'text', value: '—' };
    s2.state = 'current';
    s2.sub = randomizationDate
      ? { kind: 'date', value: `Date: ${fmt(randomizationDate)!}` }
      : { kind: 'text', value: 'Pending' };
    s3.state = 'pending';
    s3.sub = { kind: 'text', value: 'Pending' };
    s4.state = 'pending';
    s4.sub = { kind: 'text', value: 'Pending' };
    return [s1, s2, s3, s4];
  }

  if (status === 'pre_screening' || status === 'screening') {
    s1.state = 'current';
    s1.sub = screeningDate
      ? { kind: 'date', value: `Date: ${fmt(screeningDate)!}` }
      : { kind: 'text', value: 'In progress' };
    s2.sub = { kind: 'text', value: 'Pending' };
    s3.sub = { kind: 'text', value: 'Pending' };
    s4.sub = { kind: 'text', value: 'Pending' };
    return [s1, s2, s3, s4];
  }

  // Fallback
  return [s1, s2, s3, s4];
}

export function deriveSubjectEcrfDashboard(visits: SubjectVisitWithCrfs[] | null | undefined) {
  const rows: Pick<
    SubjectCrf,
    'data_expected' | 'data_entry' | 'source_data_verified' | 'data_management_lock' | 'query_status' | 'pi_signed'
  >[] = (visits ?? []).flatMap((v) => v.crfs ?? []);

  if (rows.length === 0) {
    return {
      dataEntryPct: null as number | null,
      openQueries: 0,
      missingForms: 0,
      protocolDeviations: 0,
      pendingSignOutOf: null as { pending: number; total: number } | null,
    };
  }

  const pct = computeSubjectCrfPercentages(rows);
  const missingForms = rows.filter((r) => (r.data_expected ?? 0) > 0 && !r.data_entry).length;
  const withDe = rows.filter((r) => r.data_entry);
  const withoutPi = withDe.filter((r) => !r.pi_signed);

  return {
    dataEntryPct: pct.dataEntryPct,
    openQueries: pct.openQueryCount,
    missingForms,
    protocolDeviations: 0,
    pendingSignOutOf: withDe.length > 0 ? { pending: withoutPi.length, total: withDe.length } : null,
  };
}

export function buildSubjectAttentionList(params: {
  status: SubjectStatus;
  screeningDate: string | null;
  randomizationDate: string | null;
  hasNextVisitInPipeline: boolean;
  openQueryCount: number;
  /** When true, "queries" row is not duplicated into needs-attention (reference UI keeps KPI only). */
  includeOpenQueriesInNeedsAttention?: boolean;
  referenceDate?: Date;
}): AttentionItem[] {
  const {
    status,
    screeningDate,
    randomizationDate,
    hasNextVisitInPipeline,
    openQueryCount,
    includeOpenQueriesInNeedsAttention = false,
  } = params;
  const ref = params.referenceDate ?? new Date();
  const items: AttentionItem[] = [];

  if (!hasNextVisitInPipeline) {
    items.push({
      id: 'no-visit',
      title: 'No visit scheduled',
      severity: 'critical',
      tab: 'visits',
      ctaLabel: 'Schedule Visit',
      ctaAction: 'view_tab',
    });
  }

  if (isScreeningDurationHigh(status, screeningDate, TYPICAL_SCREENING_DAYS, ref)) {
    const d = daysInScreeningPhase(status, screeningDate, ref) ?? 0;
    items.push({
      id: 'long-screen',
      title: 'Screening duration high',
      subtitle: `${d} Day${d === 1 ? '' : 's'} in screening (typical plan ≈ ${TYPICAL_SCREENING_DAYS} days).`,
      severity: 'warning',
      tab: 'overview',
      ctaLabel: 'View Details',
      ctaAction: 'view_tab',
    });
  }

  if (
    !randomizationDate
    && (status === 'pre_screening'
      || status === 'screening'
      || status === 'randomized'
      || status === 'active')
  ) {
    items.push({
      id: 'no-rand',
      title: 'Randomization not available',
      subtitle: 'Randomization is not recorded. Confirm screening and inclusion criteria.',
      severity: 'warning',
      tab: 'ecrf-tracking',
      ctaLabel: 'Review Data',
      ctaAction: 'view_tab',
    });
  }

  if (includeOpenQueriesInNeedsAttention && openQueryCount > 0) {
    items.push({
      id: 'queries',
      title: `${openQueryCount} open quer${openQueryCount === 1 ? 'y' : 'ies'}`,
      subtitle: 'Resolve in eCRF tracking.',
      severity: 'info',
      tab: 'ecrf-tracking',
      ctaLabel: 'View Queries',
      ctaAction: 'view_tab',
    });
  }

  return items;
}
