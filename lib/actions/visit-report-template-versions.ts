/**
 * Trip-report template version helpers.
 *
 * A trip report snapshots its `visit_report_templates` row + question
 * rows at create time so later edits to the template never silently
 * mutate historical reports. The snapshot lives in
 * `visit_report_template_versions` and `visit_report_template_question_versions`
 * (see migration 20260601000000_trip_report_template_versions.sql).
 *
 * Lifecycle:
 * - `snapshotTemplateForReport(reportId, supabase, { reason: 'on_create', profileId })`
 *   is called from `createSiteVisitWithReport` (and `linkReportToTemplate`)
 *   right after the trip report row is inserted.
 * - `maybeRefreshSnapshotForReport(reportId, supabase, profileId)` runs at
 *   the entry of every author-write server action. It is a no-op unless
 *   the report is still `report_pending` AND the live template's
 *   `updated_at` is newer than the existing snapshot. When it does fire,
 *   pre-snapshot responses are migrated to the new snapshot's question
 *   rows by matching `source_question_id`.
 * - `loadTemplateForReport(reportId, supabase)` is the canonical read
 *   path used by both authoring and the PDF builder. It prefers
 *   `template_version_id` (the snapshot) and falls back to the live
 *   template for legacy reports that pre-date this feature.
 *
 * This file is a regular helper module (no `'use server'`) so callers
 * pass in their already-resolved Supabase client. Mirrors the pattern in
 * `lib/visit-report-permissions.ts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  VisitReportTemplate,
  VisitReportTemplateQuestion,
  VisitReportTemplateSnapshotReason,
  VisitReportTemplateSource,
} from '@/lib/types/visit-reports';

export interface SnapshotTemplateOptions {
  reason: VisitReportTemplateSnapshotReason;
  profileId: string | null;
}

export interface SnapshotTemplateResult {
  versionId: string | null;
  error: string | null;
}

interface TripReportSnapshotRow {
  id: string;
  template_id: string | null;
  template_version_id: string | null;
  report_status: string | null;
}

async function fetchTripReportForSnapshot(
  supabase: SupabaseClient,
  reportId: string
): Promise<{ row: TripReportSnapshotRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('trip_reports')
    .select('id, template_id, template_version_id, report_status')
    .eq('id', reportId)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: (data as TripReportSnapshotRow | null) ?? null, error: null };
}

async function fetchLiveTemplateAndQuestions(
  supabase: SupabaseClient,
  templateId: string
): Promise<{
  template: VisitReportTemplate | null;
  questions: VisitReportTemplateQuestion[];
  error: string | null;
}> {
  const [tplRes, qRes] = await Promise.all([
    supabase.from('visit_report_templates').select('*').eq('id', templateId).maybeSingle(),
    supabase
      .from('visit_report_template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
  ]);
  if (tplRes.error) return { template: null, questions: [], error: tplRes.error.message };
  if (qRes.error) return { template: null, questions: [], error: qRes.error.message };
  return {
    template: (tplRes.data as VisitReportTemplate | null) ?? null,
    questions: (qRes.data as VisitReportTemplateQuestion[] | null) ?? [],
    error: null,
  };
}

/**
 * Atomically snapshot the live template for `reportId` into the version
 * tables, then update `trip_reports.template_version_id` to the new
 * version. No-op (returns versionId: null, error: null) when the report
 * has no `template_id` (mid-flight reports without a chosen template).
 *
 * Failure semantics: on the create path, callers should treat a non-null
 * `error` as a hard failure and roll back the trip report row, since the
 * whole point is that the report has an immutable schema attached
 * before any author work happens.
 */
export async function snapshotTemplateForReport(
  reportId: string,
  supabase: SupabaseClient,
  options: SnapshotTemplateOptions
): Promise<SnapshotTemplateResult> {
  const { row, error: fetchErr } = await fetchTripReportForSnapshot(supabase, reportId);
  if (fetchErr) return { versionId: null, error: fetchErr };
  if (!row) return { versionId: null, error: 'Trip report not found.' };
  if (!row.template_id) return { versionId: null, error: null };

  const { template, questions, error: liveErr } = await fetchLiveTemplateAndQuestions(
    supabase,
    row.template_id
  );
  if (liveErr) return { versionId: null, error: liveErr };
  if (!template) return { versionId: null, error: 'Live template no longer exists.' };

  // Compute the next per-template version_number. Race-safe enough for
  // our usage: the unique (template_id, version_number) constraint will
  // reject collisions if two snapshots interleave, in which case the
  // caller can retry. We don't expect concurrent writes against the same
  // (template_id) since on_create is per-report and on_first_edit is
  // gated by report_status === 'report_pending'.
  const { data: existingVersions, error: vCountErr } = await supabase
    .from('visit_report_template_versions')
    .select('version_number')
    .eq('template_id', row.template_id)
    .order('version_number', { ascending: false })
    .limit(1);
  if (vCountErr) return { versionId: null, error: vCountErr.message };
  const nextVersion = ((existingVersions?.[0]?.version_number as number | undefined) ?? 0) + 1;

  const { data: versionRow, error: vInsErr } = await supabase
    .from('visit_report_template_versions')
    .insert({
      template_id: row.template_id,
      version_number: nextVersion,
      name: template.name,
      visit_report_type: template.visit_report_type,
      days_submission: template.days_submission,
      days_approval: template.days_approval,
      snapshot_reason: options.reason,
      snapshot_taken_by: options.profileId ?? null,
    })
    .select('id')
    .single();
  if (vInsErr || !versionRow) {
    return { versionId: null, error: vInsErr?.message ?? 'Failed to insert template version.' };
  }
  const versionId = (versionRow as { id: string }).id;

  if (questions.length > 0) {
    const payload = questions.map((q) => ({
      template_version_id: versionId,
      source_question_id: q.id,
      report_order: q.report_order ?? 0,
      report_section: q.report_section ?? null,
      report_sub_section: q.report_sub_section ?? null,
      question_text: q.question_text,
      sort_order: q.sort_order ?? 0,
    }));
    const { error: qInsErr } = await supabase
      .from('visit_report_template_question_versions')
      .insert(payload);
    if (qInsErr) {
      // Best-effort cleanup: remove the orphan version row so we don't
      // leave a header without questions. Errors here are intentionally
      // swallowed -- the caller already sees the original failure.
      await supabase.from('visit_report_template_versions').delete().eq('id', versionId);
      return { versionId: null, error: qInsErr.message };
    }
  }

  const { error: linkErr } = await supabase
    .from('trip_reports')
    .update({ template_version_id: versionId })
    .eq('id', reportId);
  if (linkErr) {
    // Same cleanup: orphaned version + questions get pruned via CASCADE
    // on the question_versions table.
    await supabase.from('visit_report_template_versions').delete().eq('id', versionId);
    return { versionId: null, error: linkErr.message };
  }

  return { versionId, error: null };
}

/**
 * Re-snapshot the template if the live template has been edited since
 * the report's snapshot was taken AND the report is still in
 * `report_pending` (i.e. the author has not started writing yet).
 *
 * If the report has no snapshot yet (legacy report), this also takes an
 * initial `on_first_edit` snapshot so subsequent edits are locked in.
 *
 * On the re-snapshot path, any existing trip_report_question_responses
 * that point at the previous version's question rows are migrated to
 * the new version's matching rows by `source_question_id`.
 */
export async function maybeRefreshSnapshotForReport(
  reportId: string,
  supabase: SupabaseClient,
  profileId: string | null
): Promise<{ refreshed: boolean; error: string | null }> {
  const { row, error: fetchErr } = await fetchTripReportForSnapshot(supabase, reportId);
  if (fetchErr) return { refreshed: false, error: fetchErr };
  if (!row) return { refreshed: false, error: 'Trip report not found.' };
  if (!row.template_id) return { refreshed: false, error: null };
  if (row.report_status !== 'report_pending') return { refreshed: false, error: null };

  // Fetch the live template's updated_at and the current snapshot's
  // created_at side-by-side to decide whether anything changed.
  const { data: liveTpl, error: liveErr } = await supabase
    .from('visit_report_templates')
    .select('updated_at')
    .eq('id', row.template_id)
    .maybeSingle();
  if (liveErr) return { refreshed: false, error: liveErr.message };
  if (!liveTpl) return { refreshed: false, error: 'Live template no longer exists.' };

  let existingVersionCreatedAt: string | null = null;
  let existingVersionId: string | null = row.template_version_id;
  if (existingVersionId) {
    const { data: existingVersion, error: vErr } = await supabase
      .from('visit_report_template_versions')
      .select('id, created_at')
      .eq('id', existingVersionId)
      .maybeSingle();
    if (vErr) return { refreshed: false, error: vErr.message };
    existingVersionCreatedAt = (existingVersion as { created_at?: string } | null)?.created_at ?? null;
  }

  const liveUpdatedAt = (liveTpl as { updated_at?: string }).updated_at;
  if (!liveUpdatedAt) return { refreshed: false, error: null };

  // Up-to-date snapshot: nothing to do.
  if (existingVersionCreatedAt && new Date(liveUpdatedAt) <= new Date(existingVersionCreatedAt)) {
    return { refreshed: false, error: null };
  }

  // Take the new snapshot.
  const snap = await snapshotTemplateForReport(reportId, supabase, {
    reason: 'on_first_edit',
    profileId,
  });
  if (snap.error || !snap.versionId) {
    return { refreshed: false, error: snap.error ?? 'Failed to refresh snapshot.' };
  }

  // Migrate any pre-existing responses by source_question_id. Only
  // applies when an existing snapshot (versionId) was in place; legacy
  // reports without a previous snapshot have responses that point at
  // template_question_id, which the response-write paths handle
  // separately.
  if (existingVersionId) {
    await migrateResponsesBetweenSnapshots({
      supabase,
      reportId,
      previousVersionId: existingVersionId,
      nextVersionId: snap.versionId,
    });
  }

  return { refreshed: true, error: null };
}

/**
 * Move trip_report_question_responses from one snapshot's question rows
 * to the matching rows in the next snapshot, keyed by source_question_id.
 * Best-effort: rows whose source question was deleted in the new snapshot
 * are left in place pointing at the old version (the unique partial
 * indexes still hold).
 */
async function migrateResponsesBetweenSnapshots(args: {
  supabase: SupabaseClient;
  reportId: string;
  previousVersionId: string;
  nextVersionId: string;
}): Promise<void> {
  const { supabase, reportId, previousVersionId, nextVersionId } = args;

  const { data: prevQuestions } = await supabase
    .from('visit_report_template_question_versions')
    .select('id, source_question_id')
    .eq('template_version_id', previousVersionId);
  const { data: nextQuestions } = await supabase
    .from('visit_report_template_question_versions')
    .select('id, source_question_id')
    .eq('template_version_id', nextVersionId);

  const prevList = (prevQuestions ?? []) as Array<{ id: string; source_question_id: string | null }>;
  const nextList = (nextQuestions ?? []) as Array<{ id: string; source_question_id: string | null }>;
  if (prevList.length === 0 || nextList.length === 0) return;

  const nextBySourceId = new Map<string, string>();
  for (const q of nextList) {
    if (q.source_question_id) nextBySourceId.set(q.source_question_id, q.id);
  }

  for (const q of prevList) {
    if (!q.source_question_id) continue;
    const nextId = nextBySourceId.get(q.source_question_id);
    if (!nextId) continue;
    await supabase
      .from('trip_report_question_responses')
      .update({ template_question_version_id: nextId })
      .eq('trip_report_id', reportId)
      .eq('template_question_version_id', q.id);
  }
}

export interface LoadedTemplateForReport {
  template: VisitReportTemplate | null;
  questions: VisitReportTemplateQuestion[];
  source: VisitReportTemplateSource | null;
  error: string | null;
}

/**
 * Canonical read for the template + questions of a trip report. Prefers
 * the snapshot when `template_version_id` is set; otherwise falls back
 * to the live template (for legacy reports). Returns the same
 * `{ template, questions }` shape the authoring UI and PDF builder
 * already consume so callers don't need to branch.
 */
export async function loadTemplateForReport(
  reportId: string,
  supabase: SupabaseClient
): Promise<LoadedTemplateForReport> {
  const { row, error: fetchErr } = await fetchTripReportForSnapshot(supabase, reportId);
  if (fetchErr) {
    return { template: null, questions: [], source: null, error: fetchErr };
  }
  if (!row) {
    return { template: null, questions: [], source: null, error: 'Trip report not found.' };
  }

  if (row.template_version_id) {
    const [verRes, qVerRes] = await Promise.all([
      supabase
        .from('visit_report_template_versions')
        .select('*')
        .eq('id', row.template_version_id)
        .maybeSingle(),
      supabase
        .from('visit_report_template_question_versions')
        .select('*')
        .eq('template_version_id', row.template_version_id)
        .order('sort_order', { ascending: true }),
    ]);
    if (verRes.error) {
      return { template: null, questions: [], source: null, error: verRes.error.message };
    }
    if (qVerRes.error) {
      return { template: null, questions: [], source: null, error: qVerRes.error.message };
    }
    const version = verRes.data as Record<string, unknown> | null;
    if (version && row.template_id) {
      // Re-shape the version + question_versions rows into the
      // VisitReportTemplate / VisitReportTemplateQuestion types so
      // downstream consumers don't need to know they're reading from a
      // snapshot. The `id` we expose is intentionally the live
      // template_id (not the version id) so URL routing and template
      // lookup keys remain stable across snapshots.
      const template: VisitReportTemplate = {
        id: row.template_id,
        company_id: '',
        study_id: null,
        name: String(version.name ?? ''),
        visit_report_type: version.visit_report_type as VisitReportTemplate['visit_report_type'],
        days_submission: Number(version.days_submission ?? 0),
        days_approval: Number(version.days_approval ?? 0),
        days_basis: 'calendar',
        template_status: 'active',
        created_by: null,
        created_at: String(version.created_at ?? ''),
        updated_at: String(version.created_at ?? ''),
      };
      const questions: VisitReportTemplateQuestion[] = ((qVerRes.data ?? []) as Array<
        Record<string, unknown>
      >).map((q) => ({
        // Expose the version row id as `id` so downstream response maps
        // (responses[q.id]) line up with how the snapshot path writes
        // template_question_version_id into the response row.
        id: String(q.id),
        template_id: row.template_id as string,
        report_order: Number(q.report_order ?? 0),
        report_section: (q.report_section as string | null) ?? null,
        report_sub_section: (q.report_sub_section as string | null) ?? null,
        question_text: String(q.question_text ?? ''),
        sort_order: Number(q.sort_order ?? 0),
        created_at: String(q.created_at ?? ''),
      }));
      return {
        template,
        questions,
        source: { kind: 'snapshot', versionId: row.template_version_id },
        error: null,
      };
    }
  }

  // Legacy path: no snapshot yet, read the live template directly.
  if (!row.template_id) {
    return { template: null, questions: [], source: null, error: null };
  }
  const { template, questions, error } = await fetchLiveTemplateAndQuestions(supabase, row.template_id);
  return {
    template,
    questions,
    source: { kind: 'live', templateId: row.template_id },
    error,
  };
}

/**
 * For response-write paths: given a report and a `template_question_id`
 * (the live question id the client knows about), return the version row
 * id that the response should be linked to instead, when the report has
 * a snapshot. Returns `null` for legacy reports so callers fall back to
 * writing template_question_id.
 */
export async function resolveTemplateQuestionVersionId(
  supabase: SupabaseClient,
  reportId: string,
  templateQuestionId: string
): Promise<string | null> {
  const { row } = await fetchTripReportForSnapshot(supabase, reportId);
  if (!row?.template_version_id) return null;

  // The authoring UI is fed snapshot question rows from
  // `loadTemplateForReport`, so the `template_question_id` it sends back
  // is already the version row id when the report has a snapshot. Allow
  // both shapes: id-of-version-row OR live source_question_id.
  const { data: byId } = await supabase
    .from('visit_report_template_question_versions')
    .select('id')
    .eq('template_version_id', row.template_version_id)
    .eq('id', templateQuestionId)
    .maybeSingle();
  if (byId) return (byId as { id: string }).id;

  const { data: bySource } = await supabase
    .from('visit_report_template_question_versions')
    .select('id')
    .eq('template_version_id', row.template_version_id)
    .eq('source_question_id', templateQuestionId)
    .maybeSingle();
  if (bySource) return (bySource as { id: string }).id;

  return null;
}
