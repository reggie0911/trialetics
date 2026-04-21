import type { SupabaseClient } from '@supabase/supabase-js';

export const ECRF_ADMIN_ONLY_MESSAGE =
  'You must be a company admin to manage the eCRF Builder.';

/**
 * Ensures the signed-in user is a company admin (`profiles.role = 'admin'`)
 * AND that the target study belongs to that admin's company.
 *
 * Call this as the FIRST guard in any server action or route handler that
 * touches eCRF Builder tables (visit definitions, CRFs, questions, template
 * versions). It runs before `assertStudyWritableForCurrentUser` so closed-study
 * errors don't leak the existence of the resource to non-admins.
 *
 * Returns `{ error: null }` on success, or `{ error: <message> }` on failure.
 */
export async function assertEcrfAdminForStudy(
  supabase: SupabaseClient,
  studyId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile?.company_id) return { error: ECRF_ADMIN_ONLY_MESSAGE };
  if (profile.role !== 'admin') return { error: ECRF_ADMIN_ONLY_MESSAGE };

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, company_id')
    .eq('id', studyId)
    .maybeSingle();

  if (studyError) return { error: studyError.message };
  if (!study || study.company_id !== profile.company_id) {
    return { error: ECRF_ADMIN_ONLY_MESSAGE };
  }

  return { error: null };
}
