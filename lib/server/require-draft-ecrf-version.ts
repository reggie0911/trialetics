import type { SupabaseClient } from '@supabase/supabase-js';

export const ECRF_NON_DRAFT_EDIT_MESSAGE =
  'Cannot edit a live or archived version. Clone it to a new draft first.';

/**
 * Asserts that the given template version belongs to `studyId` and is in
 * `draft` status. Used by every per-row CRUD function in `study-crfs.ts` and
 * `study-visit-definitions.ts`, plus the bulk import action.
 *
 * Note: callers should run `assertEcrfAdminForStudy` and
 * `assertStudyWritableForCurrentUser` before this helper.
 */
export async function assertDraftVersion(
  supabase: SupabaseClient,
  studyId: string,
  versionId: string
): Promise<{ error: string | null }> {
  if (!versionId) return { error: 'Template version is required.' };

  const { data, error } = await supabase
    .from('study_ecrf_template_versions')
    .select('study_id, status')
    .eq('id', versionId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data || data.study_id !== studyId) {
    return { error: 'Template version not found.' };
  }
  if (data.status !== 'draft') {
    return { error: ECRF_NON_DRAFT_EDIT_MESSAGE };
  }
  return { error: null };
}
