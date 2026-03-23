import type { SupabaseClient } from '@supabase/supabase-js';

const DIRECTORY_EDITOR_TEAM_ROLES = [
  'clinical_project_manager',
  'clinical_trial_assistant',
  'clinical_research_associate',
] as const;

export async function getDirectoryPermissionContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profileId: string; companyId: string; isAdmin: boolean } | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', userId)
    .single();

  if (error || !profile?.company_id) return null;
  return {
    profileId: profile.id,
    companyId: profile.company_id,
    isAdmin: profile.role === 'admin',
  };
}

/** Mutations: admin OR active study team PM/CTA/CRA on any company study. */
export async function canEditDirectory(
  supabase: SupabaseClient,
  ctx: { profileId: string; companyId: string; isAdmin: boolean }
): Promise<boolean> {
  if (ctx.isAdmin) return true;

  const { data: members } = await supabase
    .from('study_team_members')
    .select('study_id')
    .eq('profile_id', ctx.profileId)
    .eq('is_active', true)
    .in('role', [...DIRECTORY_EDITOR_TEAM_ROLES]);

  if (!members?.length) return false;

  const studyIds = [...new Set(members.map((m) => m.study_id))];
  const { count } = await supabase
    .from('studies')
    .select('id', { count: 'exact', head: true })
    .in('id', studyIds)
    .eq('company_id', ctx.companyId);

  return (count ?? 0) > 0;
}

export async function canImportDirectoryCsv(
  supabase: SupabaseClient,
  ctx: { isAdmin: boolean }
): Promise<boolean> {
  return ctx.isAdmin;
}
