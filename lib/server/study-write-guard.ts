import type { SupabaseClient } from '@supabase/supabase-js';

import { STUDY_DEACTIVATED_MESSAGE } from '@/lib/constants/study-deactivated-message';

export { STUDY_DEACTIVATED_MESSAGE };

/**
 * Ensures the study exists, belongs to the caller's company, and is not deactivated (closed).
 */
export async function assertStudyWritable(
  supabase: SupabaseClient,
  studyId: string,
  companyId: string
): Promise<{ error: string | null }> {
  const { data: study, error } = await supabase
    .from('studies')
    .select('id, company_id, status')
    .eq('id', studyId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!study || study.company_id !== companyId) {
    return { error: 'Study not found.' };
  }
  if (study.status === 'closed') {
    return { error: STUDY_DEACTIVATED_MESSAGE };
  }
  return { error: null };
}

/**
 * Loads the signed-in user's company and runs {@link assertStudyWritable}.
 * Use in server actions when you have a `studyId` but not yet a `companyId`.
 */
export async function assertStudyWritableForCurrentUser(
  supabase: SupabaseClient,
  studyId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) {
    return { error: 'Profile not found.' };
  }
  return assertStudyWritable(supabase, studyId, profile.company_id);
}
