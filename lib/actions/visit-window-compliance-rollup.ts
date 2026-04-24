'use server';

import { createClient } from '@/lib/server';
import {
  derivePriority,
  deriveSubjectRisk,
  deriveNextAction,
} from '@/lib/utils/visit-window';
import type {
  SiteRowExtras,
  SiteVisitScheduleBundle,
  SiteVisitWindowComplianceBundle,
  StudyVisitScheduleBundle,
  SubjectRowExtras,
  SubjectStatus,
  VisitAnchorKind,
  VisitRowExtras,
  VisitScheduleBucketCounts,
  VisitScheduleSiteRow,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
  VisitWindowAlert,
  VisitWindowComplianceBundle,
  VisitWindowTrend,
  VisitWindowTrendKind,
} from '@/lib/types/ctms';

// ─── Row shapes from the SQL views ────────────────────────────────────────────

interface BucketSummaryRow {
  total_count: number | null;
  done_count: number | null;
  in_window_count: number | null;
  out_of_window_count: number | null;
  overdue_count: number | null;
  due_now_count: number | null;
  upcoming_count: number | null;
  pending_count: number | null;
}

interface SubjectSummaryRow extends BucketSummaryRow {
  subject_id: string;
  study_id: string | null;
  site_id: string | null;
  last_actual_date: string | null;
}

interface SiteSummaryRow extends BucketSummaryRow {
  study_id: string;
  site_id: string;
  subject_count: number | null;
  last_actual_date: string | null;
}

interface VisitSummaryRow extends BucketSummaryRow {
  study_id: string;
  site_id: string;
  visit_name: string;
  visit_number: number | null;
  sort_order: number | null;
  timepoint_label: string | null;
  timepoint_days: number | null;
  subject_count: number | null;
}

interface SubjectMetaRow {
  id: string;
  subject_number: string;
  status: SubjectStatus;
  site_id: string | null;
  visit_anchor_kind: VisitAnchorKind;
  screening_date: string | null;
  randomization_date: string | null;
  study_sites: { site_number: string | null } | null;
}

interface StudySiteMetaRow {
  id: string;
  site_number: string;
  name: string;
  study_countries: { country_name: string | null } | null;
}

interface DailyTrendRow {
  study_id: string;
  site_id: string | null;
  day: string;
  window_bucket:
    | 'done'
    | 'in_window'
    | 'out_of_window'
    | 'overdue'
    | 'due_now'
    | 'upcoming'
    | 'pending';
  bucket_count: number | null;
}

interface VisitDefinitionMetaRow {
  visit_name: string;
  window_before_days: number | null;
  window_after_days: number | null;
}

interface SubjectVisitOverdueRow {
  subject_id: string;
  visit_name: string;
  planned_date: string | null;
  window_end: string | null;
  actual_date: string | null;
  status: string | null;
  subjects: { site_id: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_BUCKETS: VisitScheduleBucketCounts = {
  total: 0,
  done: 0,
  in_window: 0,
  out_of_window: 0,
  overdue: 0,
  due_now: 0,
  upcoming: 0,
  pending: 0,
};

function num(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function rowToBuckets(row: BucketSummaryRow): VisitScheduleBucketCounts {
  return {
    total: num(row.total_count),
    done: num(row.done_count),
    in_window: num(row.in_window_count),
    out_of_window: num(row.out_of_window_count),
    overdue: num(row.overdue_count),
    due_now: num(row.due_now_count),
    upcoming: num(row.upcoming_count),
    pending: num(row.pending_count),
  };
}

/** Sum a set of bucket-shaped rows into a single VisitScheduleBucketCounts. */
function sumBuckets(rows: BucketSummaryRow[]): VisitScheduleBucketCounts {
  const out: VisitScheduleBucketCounts = { ...EMPTY_BUCKETS };
  for (const row of rows) {
    out.total += num(row.total_count);
    out.done += num(row.done_count);
    out.in_window += num(row.in_window_count);
    out.out_of_window += num(row.out_of_window_count);
    out.overdue += num(row.overdue_count);
    out.due_now += num(row.due_now_count);
    out.upcoming += num(row.upcoming_count);
    out.pending += num(row.pending_count);
  }
  return out;
}

/**
 * Collapse per-(site, visit) rows into per-visit rows by summing across sites.
 * Used at study scope so the "By Visit" rollup is study-wide rather than
 * site-broken-out. Mirrors `collapseVisitsAcrossSites` in
 * `lib/actions/ecrf-rollup.ts`.
 */
function collapseVisitsAcrossSites(rows: VisitSummaryRow[]): VisitScheduleVisitRow[] {
  const byVisit = new Map<string, VisitScheduleVisitRow>();
  for (const row of rows) {
    const existing = byVisit.get(row.visit_name);
    if (existing) {
      existing.subjectCount += num(row.subject_count);
      existing.total += num(row.total_count);
      existing.done += num(row.done_count);
      existing.in_window += num(row.in_window_count);
      existing.out_of_window += num(row.out_of_window_count);
      existing.overdue += num(row.overdue_count);
      existing.due_now += num(row.due_now_count);
      existing.upcoming += num(row.upcoming_count);
      existing.pending += num(row.pending_count);
    } else {
      byVisit.set(row.visit_name, {
        visit_name: row.visit_name,
        visit_number: row.visit_number,
        sort_order: row.sort_order,
        timepoint_label: row.timepoint_label,
        timepoint_days: row.timepoint_days,
        subjectCount: num(row.subject_count),
        ...rowToBuckets(row),
      });
    }
  }
  return Array.from(byVisit.values()).sort(sortVisitRows);
}

function visitRowToRollup(row: VisitSummaryRow): VisitScheduleVisitRow {
  return {
    visit_name: row.visit_name,
    visit_number: row.visit_number,
    sort_order: row.sort_order,
    timepoint_label: row.timepoint_label,
    timepoint_days: row.timepoint_days,
    subjectCount: num(row.subject_count),
    ...rowToBuckets(row),
  };
}

function sortVisitRows(a: VisitScheduleVisitRow, b: VisitScheduleVisitRow): number {
  const aSort = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (aSort !== bSort) return aSort - bSort;
  const aNum = a.visit_number ?? Number.MAX_SAFE_INTEGER;
  const bNum = b.visit_number ?? Number.MAX_SAFE_INTEGER;
  if (aNum !== bNum) return aNum - bNum;
  return a.visit_name.localeCompare(b.visit_name);
}

function buildSubjectRollupRows(
  subjects: SubjectMetaRow[],
  summaryById: Map<string, SubjectSummaryRow>,
): VisitScheduleSubjectRow[] {
  return subjects
    .map((s) => {
      const summary = summaryById.get(s.id);
      const buckets = summary ? rowToBuckets(summary) : { ...EMPTY_BUCKETS };
      const anchorDate =
        s.visit_anchor_kind === 'screening' ? s.screening_date : s.randomization_date;
      return {
        subject_id: s.id,
        subject_number: s.subject_number,
        status: s.status,
        site_id: s.site_id,
        site_number: s.study_sites?.site_number ?? null,
        visit_anchor_kind: s.visit_anchor_kind,
        anchor_date: anchorDate,
        last_actual_date: summary?.last_actual_date ?? null,
        ...buckets,
      } satisfies VisitScheduleSubjectRow;
    })
    .sort((a, b) => a.subject_number.localeCompare(b.subject_number));
}

function latestActualDate(rows: { last_actual_date: string | null }[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    if (!row.last_actual_date) continue;
    if (!latest || row.last_actual_date > latest) {
      latest = row.last_actual_date;
    }
  }
  return latest;
}

// ─── Site-scoped rollup ───────────────────────────────────────────────────────

/**
 * Read-only Visit Schedule rollup for a single site. Pulls subjects + their
 * per-subject summaries (for "By Subject" + overall totals) and the
 * pre-aggregated per-visit rows from `v_visit_schedule_summary`.
 */
export async function getSiteVisitScheduleRollup(
  siteId: string,
): Promise<SiteVisitScheduleBundle> {
  const supabase = await createClient();

  const { data: subjectMetaData } = await supabase
    .from('subjects')
    .select(
      'id, subject_number, status, site_id, visit_anchor_kind, screening_date, randomization_date, study_sites(site_number)',
    )
    .eq('site_id', siteId);
  const subjects = (subjectMetaData as unknown as SubjectMetaRow[] | null) ?? [];

  const subjectIds = subjects.map((s) => s.id);
  const summaryById = new Map<string, SubjectSummaryRow>();
  if (subjectIds.length > 0) {
    const { data: summaries } = await supabase
      .from('v_subject_visit_schedule_summary')
      .select('*')
      .in('subject_id', subjectIds);
    for (const row of (summaries as SubjectSummaryRow[] | null) ?? []) {
      summaryById.set(row.subject_id, row);
    }
  }

  const { data: visitRows } = await supabase
    .from('v_visit_schedule_summary')
    .select('*')
    .eq('site_id', siteId);
  const byVisit = ((visitRows as VisitSummaryRow[] | null) ?? [])
    .map(visitRowToRollup)
    .sort(sortVisitRows);

  const bySubject = buildSubjectRollupRows(subjects, summaryById);
  const summaryRows = Array.from(summaryById.values());
  const overall = sumBuckets(summaryRows);

  return {
    overall,
    subjectCount: subjects.length,
    byVisit,
    bySubject,
    lastActualDate: latestActualDate(summaryRows),
  };
}

// ─── Study-scoped rollup ──────────────────────────────────────────────────────

/**
 * Read-only Visit Schedule rollup for an entire study. Same shape as the site
 * bundle with an additional `bySite` section. The "By Visit" rollup is summed
 * across sites in app code so we can reuse the single (study, site, visit)
 * view instead of materialising a fourth SQL view.
 */
export async function getStudyVisitScheduleRollup(
  studyId: string,
): Promise<StudyVisitScheduleBundle> {
  const supabase = await createClient();

  const { data: subjectMetaData } = await supabase
    .from('subjects')
    .select(
      'id, subject_number, status, site_id, visit_anchor_kind, screening_date, randomization_date, study_sites(site_number)',
    )
    .eq('study_id', studyId);
  const subjects = (subjectMetaData as unknown as SubjectMetaRow[] | null) ?? [];

  const subjectIds = subjects.map((s) => s.id);
  const summaryById = new Map<string, SubjectSummaryRow>();
  if (subjectIds.length > 0) {
    const { data: summaries } = await supabase
      .from('v_subject_visit_schedule_summary')
      .select('*')
      .in('subject_id', subjectIds);
    for (const row of (summaries as SubjectSummaryRow[] | null) ?? []) {
      summaryById.set(row.subject_id, row);
    }
  }

  const { data: visitRowsRaw } = await supabase
    .from('v_visit_schedule_summary')
    .select('*')
    .eq('study_id', studyId);
  const byVisit = collapseVisitsAcrossSites(
    (visitRowsRaw as VisitSummaryRow[] | null) ?? [],
  );

  const { data: siteRowsRaw } = await supabase
    .from('v_site_visit_schedule_summary')
    .select('*')
    .eq('study_id', studyId);
  const siteRows = (siteRowsRaw as SiteSummaryRow[] | null) ?? [];

  const siteIds = siteRows.map((r) => r.site_id);
  const siteMetaById = new Map<string, StudySiteMetaRow>();
  if (siteIds.length > 0) {
    const { data: siteMeta } = await supabase
      .from('study_sites')
      .select('id, site_number, name, study_countries(country_name)')
      .in('id', siteIds);
    for (const row of (siteMeta as unknown as StudySiteMetaRow[] | null) ?? []) {
      siteMetaById.set(row.id, row);
    }
  }

  const bySite: VisitScheduleSiteRow[] = siteRows
    .map((row) => {
      const meta = siteMetaById.get(row.site_id);
      return {
        site_id: row.site_id,
        site_number: meta?.site_number ?? '—',
        site_name: meta?.name ?? '—',
        country: meta?.study_countries?.country_name ?? null,
        subjectCount: num(row.subject_count),
        last_actual_date: row.last_actual_date,
        ...rowToBuckets(row),
      } satisfies VisitScheduleSiteRow;
    })
    .sort((a, b) => a.site_number.localeCompare(b.site_number));

  const bySubject = buildSubjectRollupRows(subjects, summaryById);
  const summaryRows = Array.from(summaryById.values());
  const overall = sumBuckets(summaryRows);

  return {
    overall,
    subjectCount: subjects.length,
    byVisit,
    bySubject,
    bySite,
    lastActualDate: latestActualDate(summaryRows),
  };
}

// ─── Visit Window Compliance — extra computations (trends / alerts / extras) ──

/** Build a 14-day series from oldest -> today (inclusive) so callers always
 *  get a stable axis even when a day has zero events. */
function buildDayAxis(today: Date, daysBack: number): string[] {
  const axis: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    axis.push(`${y}-${m}-${day}`);
  }
  return axis;
}

function deltaPct(recent: number, prior: number): number | null {
  if (prior <= 0) return null;
  return ((recent - prior) / prior) * 100;
}

/**
 * Roll the daily-trend rows into per-bucket time series + 7-day delta. The
 * `done_pct` series is computed at the end from the summed totals so a
 * percentage is the natural unit (rather than a raw count).
 */
function buildTrendsFromDailyRows(
  rows: DailyTrendRow[],
  today: Date,
): VisitWindowTrend[] {
  const axis14 = buildDayAxis(today, 14);
  const recentAxis = axis14.slice(7);
  const priorAxis = axis14.slice(0, 7);

  type Bucket = DailyTrendRow['window_bucket'];
  const bucketKinds: Exclude<VisitWindowTrendKind, 'done_pct'>[] = [
    'in_window',
    'out_of_window',
    'overdue',
    'due_now',
    'upcoming',
    'pending',
  ];

  const seriesByBucket = new Map<Bucket, Map<string, number>>();
  for (const row of rows) {
    const inner = seriesByBucket.get(row.window_bucket) ?? new Map<string, number>();
    inner.set(row.day, num(row.bucket_count) + (inner.get(row.day) ?? 0));
    seriesByBucket.set(row.window_bucket, inner);
  }

  const trends: VisitWindowTrend[] = bucketKinds.map((kind) => {
    const inner = seriesByBucket.get(kind) ?? new Map<string, number>();
    const points = recentAxis.map((day) => ({ day, value: inner.get(day) ?? 0 }));
    const recentSum = points.reduce((acc, p) => acc + p.value, 0);
    const priorSum = priorAxis.reduce(
      (acc, day) => acc + (inner.get(day) ?? 0),
      0,
    );
    return { kind, points, deltaPct7d: deltaPct(recentSum, priorSum) };
  });

  // done_pct is the share of the day's volume that landed in the `done` bucket.
  const donePoints = recentAxis.map((day) => {
    const total = (['done', 'in_window', 'out_of_window', 'overdue', 'due_now', 'upcoming', 'pending'] as Bucket[])
      .reduce((acc, b) => acc + (seriesByBucket.get(b)?.get(day) ?? 0), 0);
    const done = seriesByBucket.get('done')?.get(day) ?? 0;
    return { day, value: total > 0 ? Math.round((done / total) * 100) : 0 };
  });
  const recentDoneTotal = donePoints.reduce((acc, p) => acc + p.value, 0);
  const priorDoneTotal = priorAxis.reduce((acc, day) => {
    const total = (['done', 'in_window', 'out_of_window', 'overdue', 'due_now', 'upcoming', 'pending'] as Bucket[])
      .reduce((acc2, b) => acc2 + (seriesByBucket.get(b)?.get(day) ?? 0), 0);
    const done = seriesByBucket.get('done')?.get(day) ?? 0;
    return acc + (total > 0 ? Math.round((done / total) * 100) : 0);
  }, 0);
  trends.push({
    kind: 'done_pct',
    points: donePoints,
    deltaPct7d: deltaPct(recentDoneTotal, priorDoneTotal),
  });

  return trends;
}

/** 7-day in-window % / overdue % series for the footer compliance chart. */
function buildComplianceTrend(
  rows: DailyTrendRow[],
  today: Date,
): VisitWindowComplianceBundle['complianceTrend'] {
  const axis = buildDayAxis(today, 7);
  type Bucket = DailyTrendRow['window_bucket'];
  const totals = new Map<string, Map<Bucket, number>>();
  for (const row of rows) {
    const day = row.day;
    if (!axis.includes(day)) continue;
    const inner = totals.get(day) ?? new Map<Bucket, number>();
    inner.set(row.window_bucket, num(row.bucket_count) + (inner.get(row.window_bucket) ?? 0));
    totals.set(day, inner);
  }
  return axis.map((day) => {
    const inner = totals.get(day) ?? new Map<Bucket, number>();
    const dayTotal = (['done', 'in_window', 'out_of_window', 'overdue', 'due_now', 'upcoming', 'pending'] as Bucket[])
      .reduce((acc, b) => acc + (inner.get(b) ?? 0), 0);
    const inWindow = inner.get('in_window') ?? 0;
    const overdue = inner.get('overdue') ?? 0;
    const inWindowPct = dayTotal > 0 ? Math.round((inWindow / dayTotal) * 100) : 0;
    const overduePct = dayTotal > 0 ? Math.round((overdue / dayTotal) * 100) : 0;
    return { day, in_window_pct: inWindowPct, overdue_pct: overduePct };
  });
}

function buildStudyAlerts(rollup: StudyVisitScheduleBundle): VisitWindowAlert[] {
  const out: VisitWindowAlert[] = [];

  if (rollup.overall.overdue > 0) {
    out.push({
      id: `alert-overdue-${rollup.overall.overdue}`,
      severity: 'critical',
      title: `${rollup.overall.overdue} visit${rollup.overall.overdue === 1 ? '' : 's'} overdue`,
      detail: 'Immediate action required to bring these visits back into compliance.',
      scope: 'study',
    });
  }

  if (rollup.overall.due_now > 0) {
    out.push({
      id: `alert-due-now-${rollup.overall.due_now}`,
      severity: 'warn',
      title: `${rollup.overall.due_now} visit${rollup.overall.due_now === 1 ? '' : 's'} due now`,
      detail: 'Window is open today — schedule or complete to stay on track.',
      scope: 'study',
    });
  }

  const sitesWithOverdue = rollup.bySite.filter((s) => s.overdue > 0).length;
  if (sitesWithOverdue > 0) {
    out.push({
      id: `alert-sites-${sitesWithOverdue}`,
      severity: 'warn',
      title: `${sitesWithOverdue} site${sitesWithOverdue === 1 ? '' : 's'} with overdue visits`,
      detail: 'Review the By Site tab to coordinate site outreach.',
      scope: 'study',
    });
  }

  // Per-site critical alerts (drill-link to the site row).
  const criticalSites = rollup.bySite.filter((s) => derivePriority(s) === 'critical');
  for (const site of criticalSites) {
    out.push({
      id: `alert-site-${site.site_id}`,
      severity: 'critical',
      title: `Site ${site.site_number} is critical`,
      detail: `${site.overdue} overdue / ${Math.max(1, site.total - site.done)} open visits.`,
      scope: 'site',
      scopeId: site.site_id,
    });
  }

  return out;
}

function buildSiteAlerts(rollup: SiteVisitScheduleBundle): VisitWindowAlert[] {
  const out: VisitWindowAlert[] = [];
  if (rollup.overall.overdue > 0) {
    out.push({
      id: `alert-overdue-${rollup.overall.overdue}`,
      severity: 'critical',
      title: `${rollup.overall.overdue} visit${rollup.overall.overdue === 1 ? '' : 's'} overdue`,
      detail: 'Immediate action required to bring these visits back into compliance.',
      scope: 'site',
    });
  }
  if (rollup.overall.due_now > 0) {
    out.push({
      id: `alert-due-now-${rollup.overall.due_now}`,
      severity: 'warn',
      title: `${rollup.overall.due_now} visit${rollup.overall.due_now === 1 ? '' : 's'} due now`,
      detail: 'Window is open today — schedule or complete to stay on track.',
      scope: 'site',
    });
  }
  return out;
}

function buildTopOverdueVisitTypes(
  rollup: StudyVisitScheduleBundle,
): VisitWindowComplianceBundle['topOverdueVisitTypes'] {
  const total = rollup.byVisit.reduce((acc, v) => acc + v.overdue, 0);
  if (total <= 0) return [];
  return rollup.byVisit
    .filter((v) => v.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 4)
    .map((v) => ({
      visit_name: v.visit_name,
      overdue: v.overdue,
      pct: Math.round((v.overdue / total) * 100),
    }));
}

/**
 * Days since `iso`, or `null` when missing/unparseable. Positive = past,
 * negative = future. Mirrors the ISO-date math elsewhere in this module.
 */
function daysSince(iso: string | null, today: Date): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const utcThen = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const utcNow = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((utcNow - utcThen) / (24 * 60 * 60 * 1000));
}

interface OverdueAggregate {
  oldestOverdueDate: string | null;
  oldestOverdueDays: number | null;
  lastActivityDate: string | null;
}

function aggregateOverdues(
  rows: SubjectVisitOverdueRow[],
  today: Date,
  pickKey: (row: SubjectVisitOverdueRow) => string | null,
): Map<string, OverdueAggregate> {
  const out = new Map<string, OverdueAggregate>();
  for (const row of rows) {
    const key = pickKey(row);
    if (!key) continue;
    const isOverdue =
      !row.actual_date &&
      row.window_end !== null &&
      daysSince(row.window_end, today) !== null &&
      (daysSince(row.window_end, today) ?? 0) > 0;
    const activity = row.actual_date ?? row.planned_date ?? null;

    const cur = out.get(key) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: null,
    };
    if (isOverdue && row.window_end) {
      if (!cur.oldestOverdueDate || row.window_end < cur.oldestOverdueDate) {
        cur.oldestOverdueDate = row.window_end;
        cur.oldestOverdueDays = daysSince(row.window_end, today);
      }
    }
    if (activity && (!cur.lastActivityDate || activity > cur.lastActivityDate)) {
      cur.lastActivityDate = activity;
    }
    out.set(key, cur);
  }
  return out;
}

function buildExtras(
  rollup: StudyVisitScheduleBundle,
  visitDefs: Map<string, VisitDefinitionMetaRow>,
  overduesBySite: Map<string, OverdueAggregate>,
  overduesBySubject: Map<string, OverdueAggregate>,
  overduesByVisit: Map<string, OverdueAggregate>,
): VisitWindowComplianceBundle['extras'] {
  const sites: Record<string, SiteRowExtras> = {};
  for (const row of rollup.bySite) {
    const o = overduesBySite.get(row.site_id) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: row.last_actual_date,
    };
    sites[row.site_id] = {
      priority: derivePriority(row),
      nextAction: deriveNextAction(row),
      oldestOverdueDate: o.oldestOverdueDate,
      oldestOverdueDays: o.oldestOverdueDays,
      lastActivityDate: o.lastActivityDate ?? row.last_actual_date,
    };
  }

  const visits: Record<string, VisitRowExtras> = {};
  for (const row of rollup.byVisit) {
    const def = visitDefs.get(row.visit_name);
    const before = def?.window_before_days ?? null;
    const after = def?.window_after_days ?? null;
    const symmetric =
      before !== null && after !== null && before === after ? after : null;
    const o = overduesByVisit.get(row.visit_name) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: null,
    };
    visits[row.visit_name] = {
      priority: derivePriority(row),
      nextAction: deriveNextAction(row),
      windowDays: symmetric,
      windowMinusDays: before === null ? null : -before,
      windowPlusDays: after,
      oldestOverdueDate: o.oldestOverdueDate,
      oldestOverdueDays: o.oldestOverdueDays,
      lastActivityDate: o.lastActivityDate,
    };
  }

  const subjects: Record<string, SubjectRowExtras> = {};
  for (const row of rollup.bySubject) {
    const o = overduesBySubject.get(row.subject_id) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: row.last_actual_date,
    };
    subjects[row.subject_id] = {
      riskLevel: deriveSubjectRisk(row),
      nextAction: deriveNextAction(row),
      oldestOverdueDate: o.oldestOverdueDate,
      oldestOverdueDays: o.oldestOverdueDays,
      lastActivityDate: o.lastActivityDate ?? row.last_actual_date,
    };
  }

  return { sites, visits, subjects };
}

/**
 * Visit Window Compliance bundle for the redesigned page. Wraps
 * `getStudyVisitScheduleRollup` (so the existing exporters & dashboards keep
 * the unchanged shape they depend on) and layers in trends, alerts,
 * top-overdue, compliance trend, and per-row priority/risk/next-action.
 */
export async function getStudyVisitWindowComplianceRollup(
  studyId: string,
): Promise<VisitWindowComplianceBundle> {
  const supabase = await createClient();
  const today = new Date();

  const rollup = await getStudyVisitScheduleRollup(studyId);

  const [trendRowsRes, visitDefsRes, overdueRowsRes] = await Promise.all([
    supabase
      .from('v_visit_window_daily_trend')
      .select('study_id, site_id, day, window_bucket, bucket_count')
      .eq('study_id', studyId),
    supabase
      .from('study_visit_definitions')
      .select('visit_name, window_before_days, window_after_days')
      .eq('study_id', studyId),
    supabase
      .from('subject_visits')
      .select(
        'subject_id, visit_name, planned_date, window_end, actual_date, status, subjects!inner(site_id, study_id)',
      )
      .eq('subjects.study_id', studyId),
  ]);

  const trendRows = (trendRowsRes.data as DailyTrendRow[] | null) ?? [];
  const trends = buildTrendsFromDailyRows(trendRows, today);
  const complianceTrend = buildComplianceTrend(trendRows, today);

  const visitDefs = new Map<string, VisitDefinitionMetaRow>();
  for (const row of (visitDefsRes.data as VisitDefinitionMetaRow[] | null) ?? []) {
    visitDefs.set(row.visit_name, row);
  }

  const overdueRows = (overdueRowsRes.data as unknown as SubjectVisitOverdueRow[] | null) ?? [];
  const overduesBySite = aggregateOverdues(
    overdueRows,
    today,
    (r) => r.subjects?.site_id ?? null,
  );
  const overduesBySubject = aggregateOverdues(
    overdueRows,
    today,
    (r) => r.subject_id,
  );
  const overduesByVisit = aggregateOverdues(overdueRows, today, (r) => r.visit_name);

  const extras = buildExtras(
    rollup,
    visitDefs,
    overduesBySite,
    overduesBySubject,
    overduesByVisit,
  );

  return {
    rollup,
    trends,
    alerts: buildStudyAlerts(rollup),
    topOverdueVisitTypes: buildTopOverdueVisitTypes(rollup),
    complianceTrend,
    extras,
    generatedAt: today.toISOString(),
  };
}

/**
 * Site-scoped sibling of `getStudyVisitWindowComplianceRollup`. Same KPI strip
 * + alerts banner, no by-site rollup, no compliance/top-overdue cards (those
 * are study-wide).
 */
export async function getSiteVisitWindowComplianceRollup(
  siteId: string,
): Promise<SiteVisitWindowComplianceBundle> {
  const supabase = await createClient();
  const today = new Date();

  const rollup = await getSiteVisitScheduleRollup(siteId);

  const [trendRowsRes, studyIdRes, overdueRowsRes] = await Promise.all([
    supabase
      .from('v_visit_window_daily_trend')
      .select('study_id, site_id, day, window_bucket, bucket_count')
      .eq('site_id', siteId),
    supabase.from('study_sites').select('study_id').eq('id', siteId).maybeSingle(),
    supabase
      .from('subject_visits')
      .select(
        'subject_id, visit_name, planned_date, window_end, actual_date, status, subjects!inner(site_id, study_id)',
      )
      .eq('subjects.site_id', siteId),
  ]);

  const trendRows = (trendRowsRes.data as DailyTrendRow[] | null) ?? [];
  const trends = buildTrendsFromDailyRows(trendRows, today);

  // Visit definitions live at the study scope so we look them up after
  // resolving the parent study_id.
  const studyId = (studyIdRes.data as { study_id: string | null } | null)?.study_id ?? null;
  const visitDefs = new Map<string, VisitDefinitionMetaRow>();
  if (studyId) {
    const { data: defs } = await supabase
      .from('study_visit_definitions')
      .select('visit_name, window_before_days, window_after_days')
      .eq('study_id', studyId);
    for (const row of (defs as VisitDefinitionMetaRow[] | null) ?? []) {
      visitDefs.set(row.visit_name, row);
    }
  }

  const overdueRows = (overdueRowsRes.data as unknown as SubjectVisitOverdueRow[] | null) ?? [];
  const overduesBySubject = aggregateOverdues(
    overdueRows,
    today,
    (r) => r.subject_id,
  );
  const overduesByVisit = aggregateOverdues(overdueRows, today, (r) => r.visit_name);

  // Reuse buildExtras with an empty `bySite` so we only compute visit + subject
  // extras here. Alternatively call the helper directly:
  const visits: Record<string, VisitRowExtras> = {};
  for (const row of rollup.byVisit) {
    const def = visitDefs.get(row.visit_name);
    const before = def?.window_before_days ?? null;
    const after = def?.window_after_days ?? null;
    const symmetric =
      before !== null && after !== null && before === after ? after : null;
    const o = overduesByVisit.get(row.visit_name) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: null,
    };
    visits[row.visit_name] = {
      priority: derivePriority(row),
      nextAction: deriveNextAction(row),
      windowDays: symmetric,
      windowMinusDays: before === null ? null : -before,
      windowPlusDays: after,
      oldestOverdueDate: o.oldestOverdueDate,
      oldestOverdueDays: o.oldestOverdueDays,
      lastActivityDate: o.lastActivityDate,
    };
  }

  const subjects: Record<string, SubjectRowExtras> = {};
  for (const row of rollup.bySubject) {
    const o = overduesBySubject.get(row.subject_id) ?? {
      oldestOverdueDate: null,
      oldestOverdueDays: null,
      lastActivityDate: row.last_actual_date,
    };
    subjects[row.subject_id] = {
      riskLevel: deriveSubjectRisk(row),
      nextAction: deriveNextAction(row),
      oldestOverdueDate: o.oldestOverdueDate,
      oldestOverdueDays: o.oldestOverdueDays,
      lastActivityDate: o.lastActivityDate ?? row.last_actual_date,
    };
  }

  return {
    rollup,
    trends,
    alerts: buildSiteAlerts(rollup),
    extras: { visits, subjects },
    generatedAt: today.toISOString(),
  };
}

