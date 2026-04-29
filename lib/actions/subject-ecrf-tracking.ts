'use server';

import { revalidatePath } from 'next/cache';

import { SUBJECT_DEACTIVATED_EDIT_TOOLTIP } from '@/lib/constants/subject-lifecycle';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import {
  SUBJECT_CRF_METRICS,
  SUBJECT_CRF_QUERY_STATUSES,
  type SubjectCrf,
  type SubjectCrfMetricKey,
  type SubjectCrfQueryStatus,
  type SubjectVisitWithCrfs,
} from '@/lib/types/ctms';

interface ResolvedSubject {
  studyId: string;
  siteId: string | null;
  isActive: boolean;
}

async function resolveSubjectContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectId: string,
): Promise<ResolvedSubject | null> {
  const { data } = await supabase
    .from('subjects')
    .select('study_id, site_id, is_active')
    .eq('id', subjectId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { study_id: string; site_id: string | null; is_active: boolean | null };
  return {
    studyId: row.study_id,
    siteId: row.site_id ?? null,
    isActive: row.is_active !== false,
  };
}

async function resolveSubjectIdForCrf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectCrfId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('subject_crfs')
    .select('subject_id')
    .eq('id', subjectCrfId)
    .maybeSingle();
  return (data as { subject_id: string } | null)?.subject_id ?? null;
}

function revalidateSubject(subjectId: string, ctx: ResolvedSubject) {
  revalidateStudyCtmsLayout(ctx.studyId);
  revalidatePath(`/protected/subjects/${subjectId}`);
}

// ─── Snapshot / resync ───────────────────────────────────────────────────────

/**
 * Snapshot the study's currently-live eCRF template into this subject. Idempotent:
 * the underlying RPC short-circuits if a snapshot already exists for the subject.
 */
export async function snapshotSubjectEcrf(
  subjectId: string,
): Promise<{ error: string | null; alreadySnapshotted?: boolean }> {
  const supabase = await createClient();
  const ctx = await resolveSubjectContext(supabase, subjectId);
  if (!ctx) return { error: 'Subject not found.' };

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, ctx.studyId);
  if (writeGuard) return { error: writeGuard };
  if (!ctx.isActive) return { error: SUBJECT_DEACTIVATED_EDIT_TOOLTIP };

  const { data, error } = await supabase.rpc('snapshot_ecrf_to_subject', {
    p_subject_id: subjectId,
  });
  if (error) return { error: error.message };

  revalidateSubject(subjectId, ctx);
  return {
    error: null,
    alreadySnapshotted:
      (data as { already_snapshotted?: boolean } | null)?.already_snapshotted ?? false,
  };
}

/**
 * Add-only resync of new live-template visits / CRFs onto an existing subject.
 * Existing rows and metric values are never touched (regulatory-safe).
 */
export async function resyncSubjectEcrf(
  subjectId: string,
): Promise<{ error: string | null; visitsAdded?: number; crfsAdded?: number }> {
  const supabase = await createClient();
  const ctx = await resolveSubjectContext(supabase, subjectId);
  if (!ctx) return { error: 'Subject not found.' };

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, ctx.studyId);
  if (writeGuard) return { error: writeGuard };
  if (!ctx.isActive) return { error: SUBJECT_DEACTIVATED_EDIT_TOOLTIP };

  const { data, error } = await supabase.rpc('resync_ecrf_to_subject', {
    p_subject_id: subjectId,
  });
  if (error) return { error: error.message };

  revalidateSubject(subjectId, ctx);
  const result = (data ?? {}) as { visits_added?: number; crfs_added?: number };
  return {
    error: null,
    visitsAdded: result.visits_added ?? 0,
    crfsAdded: result.crfs_added ?? 0,
  };
}

// ─── Metric & query mutations ───────────────────────────────────────────────

interface PatchPayload {
  data_entry?: boolean;
  source_data_review?: boolean;
  source_data_verified?: boolean;
  pi_signed?: boolean;
  data_management_lock?: boolean;
  query_status?: SubjectCrfQueryStatus;
}

async function applySubjectCrfPatch(
  subjectCrfId: string,
  patch: PatchPayload,
): Promise<{ error: string | null; subjectId: string | null }> {
  const supabase = await createClient();
  const subjectId = await resolveSubjectIdForCrf(supabase, subjectCrfId);
  if (!subjectId) return { error: 'CRF row not found.', subjectId: null };

  const ctx = await resolveSubjectContext(supabase, subjectId);
  if (!ctx) return { error: 'Subject not found.', subjectId };

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, ctx.studyId);
  if (writeGuard) return { error: writeGuard, subjectId };
  if (!ctx.isActive) return { error: SUBJECT_DEACTIVATED_EDIT_TOOLTIP, subjectId };

  const { error } = await supabase.rpc('apply_subject_crf_patch', {
    p_subject_crf_id: subjectCrfId,
    p_patch: patch,
  });
  if (error) return { error: error.message, subjectId };

  revalidateSubject(subjectId, ctx);
  return { error: null, subjectId };
}

/**
 * Toggle a single boolean metric on a subject_crf row. The RPC enforces the
 * SDV/Lock-implies-DE cascade and writes one audit row per changed field.
 */
export async function setSubjectCrfMetric(input: {
  subjectCrfId: string;
  metric: SubjectCrfMetricKey;
  value: boolean;
}): Promise<{ error: string | null }> {
  if (!SUBJECT_CRF_METRICS.includes(input.metric)) {
    return { error: `Unknown metric "${input.metric}".` };
  }
  const patch: PatchPayload = { [input.metric]: input.value };
  const { error } = await applySubjectCrfPatch(input.subjectCrfId, patch);
  return { error };
}

/**
 * Set the single tri-state query status on a subject_crf row.
 */
export async function setSubjectCrfQueryStatus(input: {
  subjectCrfId: string;
  value: SubjectCrfQueryStatus;
}): Promise<{ error: string | null }> {
  if (!SUBJECT_CRF_QUERY_STATUSES.includes(input.value)) {
    return { error: `Unknown query status "${input.value}".` };
  }
  const { error } = await applySubjectCrfPatch(input.subjectCrfId, {
    query_status: input.value,
  });
  return { error };
}

/**
 * Apply the same patch to many subject_crf rows in one round trip. The RPC is
 * still executed per-row so the cascade + audit semantics are preserved.
 * Returns the count that succeeded plus the first error encountered (if any).
 */
export async function bulkSetSubjectCrfMetrics(input: {
  subjectCrfIds: string[];
  patch: PatchPayload;
}): Promise<{ error: string | null; succeeded: number }> {
  let succeeded = 0;
  for (const id of input.subjectCrfIds) {
    const { error } = await applySubjectCrfPatch(id, input.patch);
    if (error) return { error, succeeded };
    succeeded += 1;
  }
  return { error: null, succeeded };
}

// ─── Read helpers ────────────────────────────────────────────────────────────

/**
 * Eager-load the subject's eCRF Tracking tree: subject_visits with their
 * subject_crfs, ordered for stable display.
 */
export async function getSubjectEcrfTracking(
  subjectId: string,
): Promise<SubjectVisitWithCrfs[]> {
  const supabase = await createClient();

  const { data: visits, error: visitsErr } = await supabase
    .from('subject_visits')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('visit_number', { ascending: true });
  if (visitsErr || !visits) return [];

  const visitIds = (visits as { id: string }[]).map((v) => v.id);
  if (visitIds.length === 0) return [];

  const { data: crfs, error: crfsErr } = await supabase
    .from('subject_crfs')
    .select('*')
    .in('subject_visit_id', visitIds)
    .order('sort_order', { ascending: true });
  if (crfsErr) return [];

  const crfsByVisit = new Map<string, SubjectCrf[]>();
  for (const crf of (crfs ?? []) as SubjectCrf[]) {
    const list = crfsByVisit.get(crf.subject_visit_id) ?? [];
    list.push(crf);
    crfsByVisit.set(crf.subject_visit_id, list);
  }

  return (visits as unknown as SubjectVisitWithCrfs[]).map((v) => ({
    ...v,
    crfs: crfsByVisit.get(v.id) ?? [],
  }));
}
