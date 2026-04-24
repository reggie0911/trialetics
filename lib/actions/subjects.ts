'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type {
  Subject,
  Study,
  StudySite,
  SubjectCrf,
  SubjectStatus,
  SubjectTrackingSummary,
  SubjectWithSite,
  SubjectWithDetails,
  SubjectVisit,
  SubjectVisitWithCrfs,
  VisitAnchorKind,
  VisitStatus,
  EnrollmentFunnelData,
} from '@/lib/types/ctms';

interface TrackingSummaryRow {
  subject_id: string;
  data_expected_total: number | null;
  data_entry_total: number | null;
  sdv_total: number | null;
  lock_total: number | null;
  open_query_count: number | null;
  answered_query_count: number | null;
}

function summaryRowToType(row: TrackingSummaryRow): SubjectTrackingSummary {
  return {
    dataExpectedTotal: Number(row.data_expected_total ?? 0),
    dataEntryTotal: Number(row.data_entry_total ?? 0),
    sdvTotal: Number(row.sdv_total ?? 0),
    lockTotal: Number(row.lock_total ?? 0),
    openQueryCount: Number(row.open_query_count ?? 0),
    answeredQueryCount: Number(row.answered_query_count ?? 0),
  };
}

async function getStudyIdForSubject(supabase: Awaited<ReturnType<typeof createClient>>, subjectId: string) {
  const { data: row } = await supabase.from('subjects').select('study_id').eq('id', subjectId).maybeSingle();
  return (row as { study_id: string } | null)?.study_id ?? null;
}

async function revalidateSubjectCachesForStudySubject(subjectId: string) {
  const supabase = await createClient();
  const { data: row } = await supabase.from('subjects').select('study_id').eq('id', subjectId).maybeSingle();
  if (row?.study_id) revalidateStudyCtmsLayout((row as { study_id: string }).study_id);
  revalidatePath(`/protected/subjects/${subjectId}`);
}

// --------------- Subjects ---------------

export interface SubjectWithStudySite extends Subject {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
  studies: Pick<Study, 'protocol_number' | 'title'>;
}

export async function getSubjectCountBySite(siteId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('subjects')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .in('status', ['randomized', 'active', 'completed']);
  if (error) return 0;
  return count ?? 0;
}

export async function getAllSubjects(): Promise<SubjectWithStudySite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('*, study_sites(site_number, name), studies(protocol_number, title)')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as SubjectWithStudySite[]) ?? [];
}

export interface SubjectFilters {
  search?: string;
  status?: SubjectStatus;
  siteId?: string;
}

export async function getStudySubjects(
  studyId: string,
  filters?: SubjectFilters
): Promise<SubjectWithSite[]> {
  const supabase = await createClient();

  let query = supabase
    .from('subjects')
    .select('*, study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('subject_number');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.siteId) {
    query = query.eq('site_id', filters.siteId);
  }

  if (filters?.search) {
    query = query.or(
      `subject_number.ilike.%${filters.search}%,screening_number.ilike.%${filters.search}%,randomization_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const subjects = (data as unknown as SubjectWithSite[]) ?? [];

  if (subjects.length === 0) return subjects;

  // Hydrate tracking_summary for each subject in a single round trip.
  const ids = subjects.map((s) => s.id);
  const { data: summaries } = await supabase
    .from('v_subject_ecrf_tracking_summary')
    .select('*')
    .in('subject_id', ids);

  const summaryById = new Map<string, SubjectTrackingSummary>();
  for (const row of (summaries ?? []) as TrackingSummaryRow[]) {
    summaryById.set(row.subject_id, summaryRowToType(row));
  }

  return subjects.map((s) => ({
    ...s,
    tracking_summary: summaryById.get(s.id) ?? null,
  }));
}

export async function getSubjectById(id: string): Promise<SubjectWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('*, study_sites(site_number, name), subject_visits(*)')
    .eq('id', id)
    .order('visit_number', { referencedTable: 'subject_visits', ascending: true })
    .single();

  if (error) return null;
  const subject = data as unknown as SubjectWithDetails;

  // Eager-load the eCRF Tracking tree (subject_visits with their subject_crfs).
  // Single batched query to avoid N+1; visits with no snapshotted CRFs simply
  // get an empty `crfs` array so the UI can render them as empty groups.
  const visitIds = (subject.subject_visits ?? []).map((v) => v.id);
  if (visitIds.length > 0) {
    const { data: crfs } = await supabase
      .from('subject_crfs')
      .select('*')
      .in('subject_visit_id', visitIds)
      .order('sort_order', { ascending: true });

    const crfsByVisit = new Map<string, SubjectCrf[]>();
    for (const crf of (crfs ?? []) as SubjectCrf[]) {
      const list = crfsByVisit.get(crf.subject_visit_id) ?? [];
      list.push(crf);
      crfsByVisit.set(crf.subject_visit_id, list);
    }

    const tracking: SubjectVisitWithCrfs[] = (subject.subject_visits ?? [])
      .slice()
      .sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return (a.visit_number ?? 0) - (b.visit_number ?? 0);
      })
      .map((v) => ({ ...v, crfs: crfsByVisit.get(v.id) ?? [] }));

    subject.subject_visits_tracking = tracking;
  } else {
    subject.subject_visits_tracking = [];
  }

  return subject;
}

function funnelFromStatusRows(
  rows: { status: string }[] | null | undefined,
  queryTotals: { openQueryCount: number; answeredQueryCount: number } = {
    openQueryCount: 0,
    answeredQueryCount: 0,
  },
): EnrollmentFunnelData {
  const counts: EnrollmentFunnelData = {
    preScreening: 0,
    screening: 0,
    screenFailed: 0,
    randomized: 0,
    active: 0,
    completed: 0,
    withdrawn: 0,
    discontinued: 0,
    total: rows?.length ?? 0,
    openQueryCount: queryTotals.openQueryCount,
    answeredQueryCount: queryTotals.answeredQueryCount,
  };

  for (const row of rows ?? []) {
    switch (row.status) {
      case 'pre_screening': counts.preScreening++; break;
      case 'screening': counts.screening++; break;
      case 'screen_failed': counts.screenFailed++; break;
      case 'randomized': counts.randomized++; break;
      case 'active': counts.active++; break;
      case 'completed': counts.completed++; break;
      case 'withdrawn': counts.withdrawn++; break;
      case 'discontinued': counts.discontinued++; break;
    }
  }

  return counts;
}

async function aggregateQueryCountsForSubjectIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectIds: string[],
): Promise<{ openQueryCount: number; answeredQueryCount: number }> {
  if (subjectIds.length === 0) return { openQueryCount: 0, answeredQueryCount: 0 };
  const { data } = await supabase
    .from('v_subject_ecrf_tracking_summary')
    .select('open_query_count, answered_query_count')
    .in('subject_id', subjectIds);

  let openQueryCount = 0;
  let answeredQueryCount = 0;
  for (const row of (data ?? []) as TrackingSummaryRow[]) {
    openQueryCount += Number(row.open_query_count ?? 0);
    answeredQueryCount += Number(row.answered_query_count ?? 0);
  }
  return { openQueryCount, answeredQueryCount };
}

export async function getEnrollmentFunnel(studyId: string): Promise<EnrollmentFunnelData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('id, status')
    .eq('study_id', studyId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; status: string }[];
  const totals = await aggregateQueryCountsForSubjectIds(
    supabase,
    rows.map((r) => r.id),
  );
  return funnelFromStatusRows(rows, totals);
}

export async function getEnrollmentFunnelForSite(siteId: string): Promise<EnrollmentFunnelData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('id, status')
    .eq('site_id', siteId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; status: string }[];
  const totals = await aggregateQueryCountsForSubjectIds(
    supabase,
    rows.map((r) => r.id),
  );
  return funnelFromStatusRows(rows, totals);
}

export interface CreateSubjectInput {
  study_id: string;
  site_id: string;
  subject_number: string;
  screening_number?: string;
  randomization_number?: string;
  status?: SubjectStatus;
  screening_date?: string;
  randomization_date?: string;
}

export async function createSubject(
  input: CreateSubjectInput
): Promise<{ data: Subject | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        study_id: input.study_id,
        site_id: input.site_id,
        subject_number: input.subject_number,
        screening_number: input.screening_number || null,
        randomization_number: input.randomization_number || null,
        status: input.status || 'pre_screening',
        screening_date: input.screening_date || null,
        randomization_date: input.randomization_date || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A subject with this number already exists in this study.' };
      }
      return { data: null, error: error.message };
    }

    const subject = data as unknown as Subject;

    // Snapshot the live eCRF template into this subject. Best-effort: if the
    // study has no live template yet, the RPC returns gracefully and the
    // subject is still created. Any unexpected error is logged but does not
    // block the creation flow.
    try {
      await supabase.rpc('snapshot_ecrf_to_subject', { p_subject_id: subject.id });
    } catch (snapshotErr) {
      console.warn(
        `[createSubject] snapshot_ecrf_to_subject failed for subject ${subject.id}:`,
        snapshotErr,
      );
    }

    revalidatePath('/protected');
    revalidateStudyCtmsLayout(input.study_id);
    revalidatePath(`/protected/sites/${input.site_id}`);
    return { data: subject, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateSubjectInput {
  id: string;
  study_id: string;
  site_id?: string;
  subject_number?: string;
  screening_number?: string;
  randomization_number?: string;
  status?: SubjectStatus;
  screening_date?: string;
  randomization_date?: string;
  completion_date?: string;
  withdrawal_date?: string;
  withdrawal_reason?: string;
  /** Revalidate site detail after update when subject belongs to this site. */
  revalidateSiteId?: string;
}

export async function updateSubject(
  input: UpdateSubjectInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { error: writeGuard };

    const { id, study_id, revalidateSiteId, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('subjects')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { error: 'A subject with this number already exists in this study.' };
      }
      return { error: error.message };
    }

    revalidateStudyCtmsLayout(study_id);
    revalidatePath(`/protected/subjects/${id}`);
    const updatedSiteId = cleanUpdates.site_id;
    if (typeof revalidateSiteId === 'string') {
      revalidatePath(`/protected/sites/${revalidateSiteId}`);
    } else if (typeof updatedSiteId === 'string') {
      revalidatePath(`/protected/sites/${updatedSiteId}`);
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSubject(
  id: string,
  studyId: string,
  siteId?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
    if (siteId) revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// --------------- Visits ---------------

export interface AddVisitInput {
  subject_id: string;
  visit_name: string;
  visit_number: number;
  planned_date?: string;
  actual_date?: string;
  status?: VisitStatus;
  window_start?: string;
  window_end?: string;
  notes?: string;
}

export async function addSubjectVisit(
  input: AddVisitInput,
  subjectId: string
): Promise<{ data: SubjectVisit | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { data: null, error: writeGuard };
    }

    const { data, error } = await supabase
      .from('subject_visits')
      .insert({
        subject_id: input.subject_id,
        visit_name: input.visit_name,
        visit_number: input.visit_number,
        planned_date: input.planned_date || null,
        actual_date: input.actual_date || null,
        status: input.status || 'scheduled',
        window_start: input.window_start || null,
        window_end: input.window_end || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await revalidateSubjectCachesForStudySubject(subjectId);
    return { data: data as unknown as SubjectVisit, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSubjectVisit(
  id: string,
  subjectId: string,
  updates: Partial<Omit<AddVisitInput, 'subject_id'>>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { error: writeGuard };
    }

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('subject_visits')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    await revalidateSubjectCachesForStudySubject(subjectId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSubjectVisit(
  id: string,
  subjectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { error: writeGuard };
    }

    const { error } = await supabase
      .from('subject_visits')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    await revalidateSubjectCachesForStudySubject(subjectId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// --------------- Visit timing (anchor-driven schedule) ---------------

/**
 * Allowlisted timing fields editable via the Visits panel. Visit identity
 * (visit_name, visit_number, visit_definition_id, sort_order) is owned by
 * the eCRF template snapshot and is NOT writable from this surface.
 */
export interface SubjectVisitTimingPatch {
  planned_date?: string | null;
  actual_date?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  /** Per-subject override for days BEFORE planned date inside the window. */
  window_before_days?: number | null;
  /** Per-subject override for days AFTER planned date inside the window. */
  window_after_days?: number | null;
  status?: VisitStatus;
  notes?: string | null;
}

const ALLOWED_TIMING_FIELDS: Array<keyof SubjectVisitTimingPatch> = [
  'planned_date',
  'actual_date',
  'window_start',
  'window_end',
  'window_before_days',
  'window_after_days',
  'status',
  'notes',
];

/**
 * Update one or more timing fields on a subject_visits row. Routes through the
 * apply_subject_visit_patch RPC so every changed field gets one audit row in
 * subject_visit_events. Returns the count of audit events written so the UI
 * can surface "no change" cases without an error toast.
 */
export async function updateSubjectVisitTiming(
  visitId: string,
  subjectId: string,
  patch: SubjectVisitTimingPatch,
): Promise<{ error: string | null; eventsWritten: number }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { error: writeGuard, eventsWritten: 0 };
    }

    const cleanPatch: Record<string, unknown> = {};
    for (const key of ALLOWED_TIMING_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        const value = patch[key];
        cleanPatch[key] = value === '' ? null : value;
      }
    }

    if (Object.keys(cleanPatch).length === 0) {
      return { error: null, eventsWritten: 0 };
    }

    const { data, error } = await supabase.rpc('apply_subject_visit_patch', {
      p_visit_id: visitId,
      p_patch: cleanPatch,
    });
    if (error) return { error: error.message, eventsWritten: 0 };

    await revalidateSubjectCachesForStudySubject(subjectId);
    return {
      error: null,
      eventsWritten: typeof data === 'number' ? data : Number(data ?? 0),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      eventsWritten: 0,
    };
  }
}

/**
 * Update the per-subject schedule anchor (kind + date) and optionally trigger
 * a recompute. The matching anchor date column on `subjects` (`screening_date`
 * or `randomization_date`) is updated alongside `visit_anchor_kind` so the
 * recompute RPC reads consistent state.
 */
export async function setSubjectVisitAnchor(
  subjectId: string,
  kind: VisitAnchorKind,
  anchorDate: string | null,
  recompute: boolean,
): Promise<{ error: string | null; updated: number }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { error: writeGuard, updated: 0 };
    }

    const dateColumn = kind === 'screening' ? 'screening_date' : 'randomization_date';
    const cleanDate = anchorDate && anchorDate.trim().length > 0 ? anchorDate : null;

    const { error: updateError } = await supabase
      .from('subjects')
      .update({ visit_anchor_kind: kind, [dateColumn]: cleanDate })
      .eq('id', subjectId);

    if (updateError) return { error: updateError.message, updated: 0 };

    let updated = 0;
    if (recompute) {
      const { data, error: rpcError } = await supabase.rpc('recompute_subject_visit_dates', {
        p_subject_id: subjectId,
      });
      if (rpcError) return { error: rpcError.message, updated: 0 };
      updated = Number((data as { updated?: number } | null)?.updated ?? 0);
    }

    await revalidateSubjectCachesForStudySubject(subjectId);
    return { error: null, updated };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      updated: 0,
    };
  }
}

/**
 * Recompute planned_date / window_start / window_end for every SCHEDULED
 * subject_visits row using the subject's current anchor. Completed / missed /
 * skipped rows are never touched. Hand-edited rows that are still scheduled
 * are overwritten (by design) so a single button reliably re-syncs the
 * schedule after a date slip.
 */
export async function recomputeSubjectVisitDates(
  subjectId: string,
): Promise<{ error: string | null; updated: number; anchorDate: string | null }> {
  const supabase = await createClient();

  try {
    const studyId = await getStudyIdForSubject(supabase, subjectId);
    if (studyId) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
      if (writeGuard) return { error: writeGuard, updated: 0, anchorDate: null };
    }

    const { data, error } = await supabase.rpc('recompute_subject_visit_dates', {
      p_subject_id: subjectId,
    });
    if (error) return { error: error.message, updated: 0, anchorDate: null };

    const result = (data ?? {}) as { updated?: number; anchor_date?: string | null };
    await revalidateSubjectCachesForStudySubject(subjectId);
    return {
      error: null,
      updated: Number(result.updated ?? 0),
      anchorDate: result.anchor_date ?? null,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      updated: 0,
      anchorDate: null,
    };
  }
}

