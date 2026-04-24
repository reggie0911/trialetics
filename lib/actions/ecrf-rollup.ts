'use server';

import { createClient } from '@/lib/server';
import { buildEcrfAlerts } from '@/lib/parsers/ecrf-alerts';
import {
  deriveDataEntryByStatus,
  missingCrfsFor,
} from '@/lib/parsers/ecrf-tracking-extras';
import type {
  EcrfTrend,
  EcrfTrendKind,
  SiteEcrfRollup,
  SiteEcrfRollupBundle,
  StudyEcrfRollupBundle,
  SubjectEcrfRollupRow,
  SubjectStatus,
  SubjectTrackingSummary,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

// ─── Row shapes from the SQL views ────────────────────────────────────────────

interface SubjectSummaryRow {
  subject_id: string;
  data_expected_total: number | null;
  data_entry_total: number | null;
  sdv_total: number | null;
  lock_total: number | null;
  open_query_count: number | null;
  answered_query_count: number | null;
}

interface SiteSummaryRow {
  study_id: string;
  site_id: string;
  subject_count: number | null;
  data_expected_total: number | null;
  data_entry_total: number | null;
  sdv_total: number | null;
  lock_total: number | null;
  open_query_count: number | null;
  answered_query_count: number | null;
}

interface VisitSummaryRow {
  study_id: string;
  site_id: string;
  visit_name: string;
  subject_count: number | null;
  data_expected_total: number | null;
  data_entry_total: number | null;
  sdv_total: number | null;
  lock_total: number | null;
  open_query_count: number | null;
  answered_query_count: number | null;
}

interface SubjectMetaRow {
  id: string;
  subject_number: string;
  status: SubjectStatus;
  site_id: string | null;
  template_synced_at: string | null;
  study_sites: { site_number: string | null; name: string | null } | null;
}

interface StudySiteMetaRow {
  id: string;
  site_number: string;
  name: string;
  study_countries: { country_name: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_TOTALS: SubjectTrackingSummary = {
  dataExpectedTotal: 0,
  dataEntryTotal: 0,
  sdvTotal: 0,
  lockTotal: 0,
  openQueryCount: 0,
  answeredQueryCount: 0,
};

function num(value: number | null | undefined): number {
  return Number(value ?? 0);
}

/** Sum a set of summary-shaped rows into a single SubjectTrackingSummary bucket. */
function sumTotals(
  rows: Array<{
    data_expected_total: number | null;
    data_entry_total: number | null;
    sdv_total: number | null;
    lock_total: number | null;
    open_query_count: number | null;
    answered_query_count: number | null;
  }>,
): SubjectTrackingSummary {
  const out: SubjectTrackingSummary = { ...EMPTY_TOTALS };
  for (const row of rows) {
    out.dataExpectedTotal += num(row.data_expected_total);
    out.dataEntryTotal += num(row.data_entry_total);
    out.sdvTotal += num(row.sdv_total);
    out.lockTotal += num(row.lock_total);
    out.openQueryCount += num(row.open_query_count);
    out.answeredQueryCount += num(row.answered_query_count);
  }
  return out;
}

/**
 * Collapse per-(site, visit) rows into per-visit rows by summing across sites.
 * Used at study scope so the "By Visit" rollup is study-wide rather than
 * site-broken-out.
 */
function collapseVisitsAcrossSites(rows: VisitSummaryRow[]): VisitEcrfRollup[] {
  const byVisit = new Map<string, VisitEcrfRollup>();
  for (const row of rows) {
    const existing = byVisit.get(row.visit_name);
    if (existing) {
      existing.subjectCount += num(row.subject_count);
      existing.dataExpectedTotal += num(row.data_expected_total);
      existing.dataEntryTotal += num(row.data_entry_total);
      existing.sdvTotal += num(row.sdv_total);
      existing.lockTotal += num(row.lock_total);
      existing.openQueryCount += num(row.open_query_count);
      existing.answeredQueryCount += num(row.answered_query_count);
    } else {
      byVisit.set(row.visit_name, {
        visit_name: row.visit_name,
        subjectCount: num(row.subject_count),
        dataExpectedTotal: num(row.data_expected_total),
        dataEntryTotal: num(row.data_entry_total),
        sdvTotal: num(row.sdv_total),
        lockTotal: num(row.lock_total),
        openQueryCount: num(row.open_query_count),
        answeredQueryCount: num(row.answered_query_count),
      });
    }
  }
  return Array.from(byVisit.values()).sort((a, b) =>
    a.visit_name.localeCompare(b.visit_name),
  );
}

function visitRowToRollup(row: VisitSummaryRow): VisitEcrfRollup {
  return {
    visit_name: row.visit_name,
    subjectCount: num(row.subject_count),
    dataExpectedTotal: num(row.data_expected_total),
    dataEntryTotal: num(row.data_entry_total),
    sdvTotal: num(row.sdv_total),
    lockTotal: num(row.lock_total),
    openQueryCount: num(row.open_query_count),
    answeredQueryCount: num(row.answered_query_count),
  };
}

function buildSubjectRollupRows(
  subjects: SubjectMetaRow[],
  summaryById: Map<string, SubjectSummaryRow>,
): SubjectEcrfRollupRow[] {
  return subjects
    .map((s) => {
      const summary = summaryById.get(s.id);
      return {
        subject_id: s.id,
        subject_number: s.subject_number,
        status: s.status,
        site_id: s.site_id,
        site_number: s.study_sites?.site_number ?? null,
        site_name: s.study_sites?.name ?? null,
        dataExpectedTotal: num(summary?.data_expected_total),
        dataEntryTotal: num(summary?.data_entry_total),
        sdvTotal: num(summary?.sdv_total),
        lockTotal: num(summary?.lock_total),
        openQueryCount: num(summary?.open_query_count),
        answeredQueryCount: num(summary?.answered_query_count),
      } satisfies SubjectEcrfRollupRow;
    })
    .sort((a, b) => a.subject_number.localeCompare(b.subject_number));
}

function latestTemplateSyncedAt(subjects: SubjectMetaRow[]): string | null {
  let latest: string | null = null;
  for (const s of subjects) {
    if (!s.template_synced_at) continue;
    if (!latest || s.template_synced_at > latest) {
      latest = s.template_synced_at;
    }
  }
  return latest;
}

// ─── Site-scoped rollup ───────────────────────────────────────────────────────

/**
 * Read-only eCRF rollup for a single site. Pulls subjects + their per-subject
 * summaries (for the "By Subject" table and the overall totals) and the
 * pre-aggregated visit rows from `v_visit_ecrf_tracking_summary`.
 */
export async function getSiteEcrfRollup(
  siteId: string,
): Promise<SiteEcrfRollupBundle> {
  const supabase = await createClient();

  const { data: subjectMetaData } = await supabase
    .from('subjects')
    .select(
      'id, subject_number, status, site_id, template_synced_at, study_sites(site_number)',
    )
    .eq('site_id', siteId);
  const subjects = (subjectMetaData as unknown as SubjectMetaRow[] | null) ?? [];

  const subjectIds = subjects.map((s) => s.id);
  const summaryById = new Map<string, SubjectSummaryRow>();
  if (subjectIds.length > 0) {
    const { data: summaries } = await supabase
      .from('v_subject_ecrf_tracking_summary')
      .select('*')
      .in('subject_id', subjectIds);
    for (const row of (summaries as SubjectSummaryRow[] | null) ?? []) {
      summaryById.set(row.subject_id, row);
    }
  }

  const { data: visitRows } = await supabase
    .from('v_visit_ecrf_tracking_summary')
    .select('*')
    .eq('site_id', siteId);
  const byVisit = ((visitRows as VisitSummaryRow[] | null) ?? [])
    .map(visitRowToRollup)
    .sort((a, b) => a.visit_name.localeCompare(b.visit_name));

  const bySubject = buildSubjectRollupRows(subjects, summaryById);
  const totals = sumTotals(Array.from(summaryById.values()));

  return {
    totals,
    bySubject,
    byVisit,
    lastTemplateSyncedAt: latestTemplateSyncedAt(subjects),
  };
}

// ─── Dashboard extras ─────────────────────────────────────────────────────────

interface SubjectActivityRow {
  subject_id: string;
  last_entry_at: string | null;
  last_sdv_at: string | null;
  last_lock_at: string | null;
  overdue_query_count: number | null;
}

interface SiteActivityRow {
  study_id: string;
  site_id: string;
  last_entry_at: string | null;
  last_sdv_at: string | null;
  last_lock_at: string | null;
  overdue_query_count: number | null;
}

interface VisitExtrasRow {
  study_id: string;
  site_id: string;
  visit_name: string;
  visit_number: number | null;
  sort_order: number | null;
  timepoint_label: string | null;
  timepoint_days: number | null;
  subject_count: number | null;
  total_count: number | null;
  done_count: number | null;
  in_window_count: number | null;
  out_of_window_count: number | null;
  overdue_count: number | null;
  due_now_count: number | null;
  upcoming_count: number | null;
  pending_count: number | null;
  window_days: number | null;
}

interface MetricDailyRow {
  study_id: string;
  metric: EcrfTrendKind;
  day: string;
  count: number | null;
}

const TREND_KINDS: EcrfTrendKind[] = [
  'data_entry',
  'sdv',
  'lock',
  'queries_resolved',
];

/**
 * Build a 7-point sparkline series + a "vs prior 7 days" delta percentage for
 * each tracked metric. The view returns up to 14 days of activity; we split
 * the window in half and pad missing days with zero so every card always has
 * 7 points to plot.
 */
function buildTrends(rows: MetricDailyRow[]): EcrfTrend[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const byMetric = new Map<EcrfTrendKind, Map<string, number>>();
  for (const kind of TREND_KINDS) {
    byMetric.set(kind, new Map());
  }
  for (const row of rows) {
    const m = byMetric.get(row.metric);
    if (!m) continue;
    m.set(row.day.slice(0, 10), num(row.count));
  }

  return TREND_KINDS.map((kind) => {
    const series = byMetric.get(kind) ?? new Map();
    const padded = days.map((day) => ({ day, value: series.get(day) ?? 0 }));
    const recent = padded.slice(-7);
    const prior = padded.slice(0, 7);
    const recentSum = recent.reduce((acc, p) => acc + p.value, 0);
    const priorSum = prior.reduce((acc, p) => acc + p.value, 0);
    const deltaPct7d =
      priorSum > 0
        ? Math.round(((recentSum - priorSum) / priorSum) * 100)
        : recentSum > 0
        ? null
        : 0;
    return {
      kind,
      points: recent,
      deltaPct7d,
    } satisfies EcrfTrend;
  });
}

/**
 * Collapse the per-(site, visit_name) extras into per-visit rows by summing
 * the bucket counts across every site in the study. Sort/timepoint metadata
 * is taken from the row with the lowest sort_order so the table reads in
 * protocol order.
 */
function collapseVisitExtras(
  rows: VisitExtrasRow[],
): Map<string, {
  subjectsExpected: number;
  subjectsCompleted: number;
  subjectsOverdue: number;
  subjectsDueNow: number;
  subjectsUpcoming: number;
  timepointLabel: string | null;
  timepointDays: number | null;
  windowDays: number | null;
  sortOrder: number;
}> {
  const out = new Map<
    string,
    {
      subjectsExpected: number;
      subjectsCompleted: number;
      subjectsOverdue: number;
      subjectsDueNow: number;
      subjectsUpcoming: number;
      timepointLabel: string | null;
      timepointDays: number | null;
      windowDays: number | null;
      sortOrder: number;
    }
  >();

  for (const row of rows) {
    const existing = out.get(row.visit_name);
    const sortOrder = num(row.sort_order);
    if (existing) {
      existing.subjectsExpected += num(row.subject_count);
      existing.subjectsCompleted += num(row.done_count);
      existing.subjectsOverdue += num(row.overdue_count);
      existing.subjectsDueNow += num(row.due_now_count);
      existing.subjectsUpcoming += num(row.upcoming_count);
      // Prefer the lowest sort_order's timepoint metadata.
      if (sortOrder < existing.sortOrder) {
        existing.sortOrder = sortOrder;
        existing.timepointLabel = row.timepoint_label;
        existing.timepointDays = row.timepoint_days;
        existing.windowDays = row.window_days;
      }
    } else {
      out.set(row.visit_name, {
        subjectsExpected: num(row.subject_count),
        subjectsCompleted: num(row.done_count),
        subjectsOverdue: num(row.overdue_count),
        subjectsDueNow: num(row.due_now_count),
        subjectsUpcoming: num(row.upcoming_count),
        timepointLabel: row.timepoint_label,
        timepointDays: row.timepoint_days,
        windowDays: row.window_days,
        sortOrder,
      });
    }
  }
  return out;
}

// ─── Study-scoped rollup ──────────────────────────────────────────────────────

/**
 * Read-only eCRF rollup for an entire study. Same shape as the site bundle
 * with an additional `bySite` section, plus the dashboard extras (trends,
 * alerts, donut buckets, last-activity timestamps) used by the redesigned
 * eCRF Tracking page.
 */
export async function getStudyEcrfRollup(
  studyId: string,
): Promise<StudyEcrfRollupBundle> {
  const supabase = await createClient();

  const { data: subjectMetaData } = await supabase
    .from('subjects')
    .select(
      'id, subject_number, status, site_id, template_synced_at, study_sites(site_number, name)',
    )
    .eq('study_id', studyId);
  const subjects = (subjectMetaData as unknown as SubjectMetaRow[] | null) ?? [];

  const subjectIds = subjects.map((s) => s.id);
  const summaryById = new Map<string, SubjectSummaryRow>();
  const subjectActivityById = new Map<string, SubjectActivityRow>();
  if (subjectIds.length > 0) {
    const [{ data: summaries }, { data: activity }] = await Promise.all([
      supabase
        .from('v_subject_ecrf_tracking_summary')
        .select('*')
        .in('subject_id', subjectIds),
      supabase
        .from('v_subject_ecrf_activity')
        .select('*')
        .in('subject_id', subjectIds),
    ]);
    for (const row of (summaries as SubjectSummaryRow[] | null) ?? []) {
      summaryById.set(row.subject_id, row);
    }
    for (const row of (activity as SubjectActivityRow[] | null) ?? []) {
      subjectActivityById.set(row.subject_id, row);
    }
  }

  const { data: visitRowsRaw } = await supabase
    .from('v_visit_ecrf_tracking_summary')
    .select('*')
    .eq('study_id', studyId);
  const byVisitBase = collapseVisitsAcrossSites(
    (visitRowsRaw as VisitSummaryRow[] | null) ?? [],
  );

  const [
    { data: siteRowsRaw },
    { data: siteActivityRaw },
    { data: visitExtrasRaw },
    { data: metricDailyRaw },
  ] = await Promise.all([
    supabase
      .from('v_site_ecrf_tracking_summary')
      .select('*')
      .eq('study_id', studyId),
    supabase
      .from('v_site_ecrf_activity')
      .select('*')
      .eq('study_id', studyId),
    supabase
      .from('v_visit_ecrf_extras')
      .select('*')
      .eq('study_id', studyId),
    supabase
      .from('v_ecrf_metric_daily')
      .select('*')
      .eq('study_id', studyId),
  ]);
  const siteRows = (siteRowsRaw as SiteSummaryRow[] | null) ?? [];

  const siteActivityById = new Map<string, SiteActivityRow>();
  for (const row of (siteActivityRaw as SiteActivityRow[] | null) ?? []) {
    siteActivityById.set(row.site_id, row);
  }

  const visitExtrasByName = collapseVisitExtras(
    (visitExtrasRaw as VisitExtrasRow[] | null) ?? [],
  );

  const trends = buildTrends((metricDailyRaw as MetricDailyRow[] | null) ?? []);

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

  const bySite: SiteEcrfRollup[] = siteRows
    .map((row) => {
      const meta = siteMetaById.get(row.site_id);
      const activity = siteActivityById.get(row.site_id);
      const dataExpectedTotal = num(row.data_expected_total);
      const dataEntryTotal = num(row.data_entry_total);
      return {
        site_id: row.site_id,
        site_number: meta?.site_number ?? '—',
        site_name: meta?.name ?? '—',
        country: meta?.study_countries?.country_name ?? null,
        subjectCount: num(row.subject_count),
        dataExpectedTotal,
        dataEntryTotal,
        sdvTotal: num(row.sdv_total),
        lockTotal: num(row.lock_total),
        openQueryCount: num(row.open_query_count),
        answeredQueryCount: num(row.answered_query_count),
        lastEntryAt: activity?.last_entry_at ?? null,
        lastSdvAt: activity?.last_sdv_at ?? null,
        overdueQueryCount: num(activity?.overdue_query_count),
        missingCrfs: missingCrfsFor({ dataExpectedTotal, dataEntryTotal }),
      } satisfies SiteEcrfRollup;
    })
    .sort((a, b) => a.site_number.localeCompare(b.site_number));

  const bySubject = buildSubjectRollupRows(subjects, summaryById).map(
    (row) => {
      const activity = subjectActivityById.get(row.subject_id);
      return {
        ...row,
        lastEntryAt: activity?.last_entry_at ?? null,
        lastSdvAt: activity?.last_sdv_at ?? null,
        lastLockAt: activity?.last_lock_at ?? null,
        overdueQueryCount: num(activity?.overdue_query_count),
        missingCrfs: missingCrfsFor(row),
      } satisfies SubjectEcrfRollupRow;
    },
  );

  const byVisit: VisitEcrfRollup[] = byVisitBase
    .map((row) => {
      const extras = visitExtrasByName.get(row.visit_name);
      return {
        ...row,
        timepointLabel: extras?.timepointLabel ?? null,
        timepointDays: extras?.timepointDays ?? null,
        windowDays: extras?.windowDays ?? null,
        subjectsExpected: extras?.subjectsExpected ?? row.subjectCount,
        subjectsCompleted: extras?.subjectsCompleted ?? 0,
        subjectsOverdue: extras?.subjectsOverdue ?? 0,
        subjectsDueNow: extras?.subjectsDueNow ?? 0,
        subjectsUpcoming: extras?.subjectsUpcoming ?? 0,
        missingCrfs: missingCrfsFor(row),
        sortOrder: extras?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      } satisfies VisitEcrfRollup;
    })
    .sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      return a.visit_name.localeCompare(b.visit_name);
    });

  const totals = sumTotals(Array.from(summaryById.values()));
  const dataEntryByStatus = deriveDataEntryByStatus(bySubject);
  const alerts = buildEcrfAlerts({
    studyId,
    bySubject,
    bySite,
    byVisit,
  });

  return {
    totals,
    bySubject,
    byVisit,
    bySite,
    lastTemplateSyncedAt: latestTemplateSyncedAt(subjects),
    generatedAt: new Date().toISOString(),
    trends,
    alerts,
    dataEntryByStatus,
  };
}

/**
 * Server action invoked by the dashboard's "Refresh Data" button. Re-runs
 * `getStudyEcrfRollup` (cached views are recomputed inside Postgres) and
 * returns the fresh bundle so the client can swap it into local state without
 * a full route re-render.
 */
export async function refreshStudyEcrfRollup(
  studyId: string,
): Promise<StudyEcrfRollupBundle> {
  return getStudyEcrfRollup(studyId);
}
