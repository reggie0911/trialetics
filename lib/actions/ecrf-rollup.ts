'use server';

import { createClient } from '@/lib/server';
import type {
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
  study_sites: { site_number: string | null } | null;
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
  let summaryById = new Map<string, SubjectSummaryRow>();
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

// ─── Study-scoped rollup ──────────────────────────────────────────────────────

/**
 * Read-only eCRF rollup for an entire study. Same shape as the site bundle
 * with an additional `bySite` section. The "By Visit" rollup is summed across
 * sites in app code so we can reuse the single (study, site, visit) view
 * instead of materialising a fourth SQL view.
 */
export async function getStudyEcrfRollup(
  studyId: string,
): Promise<StudyEcrfRollupBundle> {
  const supabase = await createClient();

  const { data: subjectMetaData } = await supabase
    .from('subjects')
    .select(
      'id, subject_number, status, site_id, template_synced_at, study_sites(site_number)',
    )
    .eq('study_id', studyId);
  const subjects = (subjectMetaData as unknown as SubjectMetaRow[] | null) ?? [];

  const subjectIds = subjects.map((s) => s.id);
  let summaryById = new Map<string, SubjectSummaryRow>();
  if (subjectIds.length > 0) {
    const { data: summaries } = await supabase
      .from('v_subject_ecrf_tracking_summary')
      .select('*')
      .in('subject_id', subjectIds);
    for (const row of (summaries as SubjectSummaryRow[] | null) ?? []) {
      summaryById.set(row.subject_id, row);
    }
  }

  const { data: visitRowsRaw } = await supabase
    .from('v_visit_ecrf_tracking_summary')
    .select('*')
    .eq('study_id', studyId);
  const byVisit = collapseVisitsAcrossSites(
    (visitRowsRaw as VisitSummaryRow[] | null) ?? [],
  );

  const { data: siteRowsRaw } = await supabase
    .from('v_site_ecrf_tracking_summary')
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

  const bySite: SiteEcrfRollup[] = siteRows
    .map((row) => {
      const meta = siteMetaById.get(row.site_id);
      return {
        site_id: row.site_id,
        site_number: meta?.site_number ?? '—',
        site_name: meta?.name ?? '—',
        country: meta?.study_countries?.country_name ?? null,
        subjectCount: num(row.subject_count),
        dataExpectedTotal: num(row.data_expected_total),
        dataEntryTotal: num(row.data_entry_total),
        sdvTotal: num(row.sdv_total),
        lockTotal: num(row.lock_total),
        openQueryCount: num(row.open_query_count),
        answeredQueryCount: num(row.answered_query_count),
      } satisfies SiteEcrfRollup;
    })
    .sort((a, b) => a.site_number.localeCompare(b.site_number));

  const bySubject = buildSubjectRollupRows(subjects, summaryById);
  const totals = sumTotals(Array.from(summaryById.values()));

  return {
    totals,
    bySubject,
    byVisit,
    bySite,
    lastTemplateSyncedAt: latestTemplateSyncedAt(subjects),
  };
}
