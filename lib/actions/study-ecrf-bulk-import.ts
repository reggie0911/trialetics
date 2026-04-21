'use server';

import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertEcrfAdminForStudy } from '@/lib/server/require-ecrf-admin';
import { assertDraftVersion } from '@/lib/server/require-draft-ecrf-version';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type { EcrfBulkRow } from '@/lib/parsers/ecrf-csv';
import {
  computeEcrfBulkPreview,
  type EcrfBulkMode,
  type EcrfBulkPreview,
  type ExistingCrf,
  type ExistingQuestion,
  type ExistingVisit,
} from '@/lib/parsers/ecrf-bulk-preview';
import type {
  EcrfBulkImportInput,
  EcrfBulkImportResult,
  EcrfBulkResultCounts,
} from '@/lib/types/ecrf-bulk-import';

const REPLACE_CONFIRM_TOKEN = 'REPLACE';

function failure(error: string): EcrfBulkImportResult {
  return { ok: false, error, preview: null, result: null };
}

/**
 * Bulk import normalized eCRF rows into a draft template version.
 *
 * Always run with `dryRun: true` first to surface preview counts in the UI;
 * then call again without it to commit. The server is the source of truth —
 * the dry-run output is purely informational.
 */
export async function bulkImportEcrf(
  input: EcrfBulkImportInput
): Promise<EcrfBulkImportResult> {
  const { studyId, versionId, mode, rows, dryRun = false } = input;

  if (!studyId || !versionId) {
    return failure('studyId and versionId are required.');
  }
  if (!['append', 'upsert', 'replace'].includes(mode)) {
    return failure(`Invalid mode: ${mode}.`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return failure('No rows to import.');
  }
  if (mode === 'replace' && !dryRun) {
    if ((input.confirmReplaceText ?? '').trim() !== REPLACE_CONFIRM_TOKEN) {
      return failure(
        `Replace mode requires confirmation. Type "${REPLACE_CONFIRM_TOKEN}" to proceed.`
      );
    }
  }

  const supabase = await createClient();

  const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
  if (adminError) return failure(adminError);

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
  if (writeGuard) return failure(writeGuard);

  const { error: draftError } = await assertDraftVersion(supabase, studyId, versionId);
  if (draftError) return failure(draftError);

  // Build the preview from the current DB state. We do this even on a real
  // commit so the response can include the preview shown to the user, and so
  // tests can assert behavior without round-tripping CSV parsing.
  const preview = await buildPreview(supabase, studyId, versionId, mode, rows);
  if (!preview.ok) return failure(preview.error);

  if (dryRun) {
    return { ok: true, error: null, preview: preview.value, result: null };
  }

  const payload = rows.map(rowToJsonb);
  const { data, error } = await supabase.rpc('bulk_import_ecrf', {
    p_study_id: studyId,
    p_version_id: versionId,
    p_payload: payload,
    p_mode: mode,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
      preview: preview.value,
      result: null,
    };
  }

  revalidateStudyCtmsLayout(studyId);

  return {
    ok: true,
    error: null,
    preview: preview.value,
    result: (data as unknown as EcrfBulkResultCounts) ?? null,
  };
}

// ─── Internals ────────────────────────────────────────────────────────────────

function rowToJsonb(row: EcrfBulkRow): Record<string, unknown> {
  return {
    visit_name: row.visit_name,
    visit_timepoint_label: row.visit_timepoint_label,
    visit_timepoint_days:
      row.visit_timepoint_days === null ? null : String(row.visit_timepoint_days),
    crf_name: row.crf_name,
    crf_description: row.crf_description,
    question_label: row.question_label,
    question_help_text: row.question_help_text,
    question_type: row.question_type,
    question_required: row.question_required,
    question_options: row.question_options,
  };
}

interface PreviewOk {
  ok: true;
  value: EcrfBulkPreview;
}
interface PreviewErr {
  ok: false;
  error: string;
}

async function buildPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  versionId: string,
  mode: EcrfBulkMode,
  rows: EcrfBulkRow[]
): Promise<PreviewOk | PreviewErr> {
  const [visitsRes, crfsRes, questionsRes] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('id, visit_name')
      .eq('study_id', studyId)
      .eq('template_version_id', versionId),
    supabase
      .from('study_crfs')
      .select('id, visit_definition_id, name')
      .eq('study_id', studyId)
      .eq('template_version_id', versionId),
    supabase
      .from('study_crf_questions')
      .select('id, crf_id, label')
      .eq('template_version_id', versionId),
  ]);

  if (visitsRes.error) return { ok: false, error: visitsRes.error.message };
  if (crfsRes.error) return { ok: false, error: crfsRes.error.message };
  if (questionsRes.error) return { ok: false, error: questionsRes.error.message };

  const value = computeEcrfBulkPreview(rows, mode, {
    visits: ((visitsRes.data as unknown) as ExistingVisit[]) ?? [],
    crfs: ((crfsRes.data as unknown) as ExistingCrf[]) ?? [],
    questions: ((questionsRes.data as unknown) as ExistingQuestion[]) ?? [],
  });

  return { ok: true, value };
}
