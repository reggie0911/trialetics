'use server';

import { createClient } from '@/lib/server';
import type {
  SiteVisitScheduleBundle,
  StudyVisitScheduleBundle,
  SubjectStatus,
  VisitAnchorKind,
  VisitScheduleBucketCounts,
  VisitScheduleSiteRow,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
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
