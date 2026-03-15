'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  TeamRole,
  StudyTeamMember,
  StudyTeamMemberWithProfile,
  TeamMemberRole,
  TeamMemberWithStudies,
} from '@/lib/types/ctms';

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

// =====================================================
// Team Roles
// =====================================================

export async function getTeamRoles(): Promise<TeamRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_roles')
    .select('*')
    .order('role_name');
  if (error) throw new Error(error.message);
  return (data as unknown as TeamRole[]) ?? [];
}

export async function createTeamRole(
  roleName: string,
  description?: string
): Promise<{ data: TeamRole | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('team_roles')
      .insert({
        company_id: companyId,
        role_name: roleName,
        description: description || null,
      })
      .select()
      .single();
    if (error) {
      if (error.message.includes('duplicate')) {
        return { data: null, error: 'A role with this name already exists.' };
      }
      return { data: null, error: error.message };
    }
    revalidatePath('/protected/team');
    return { data: data as unknown as TeamRole, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteTeamRole(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('team_roles').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Study Team Members
// =====================================================

export async function getStudyTeamMembers(studyId: string): Promise<StudyTeamMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_team_members')
    .select('*, profiles(first_name, last_name, email, avatar_url), team_roles(role_name), study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyTeamMemberWithProfile[]) ?? [];
}

export async function getCompanyProfiles(): Promise<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('company_id', companyId)
    .order('first_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface AddTeamMemberInput {
  study_id: string;
  profile_id: string;
  role: TeamMemberRole;
  custom_role_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function addTeamMember(
  input: AddTeamMemberInput
): Promise<{ data: StudyTeamMember | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('study_team_members')
      .insert({
        study_id: input.study_id,
        profile_id: input.profile_id,
        role: input.role,
        custom_role_id: input.custom_role_id || null,
        site_id: input.site_id || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return { data: null, error: 'This person already has this role on this study.' };
      }
      return { data: null, error: error.message };
    }

    revalidatePath(`/protected/studies/${input.study_id}`);
    revalidatePath('/protected/team');
    return { data: data as unknown as StudyTeamMember, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateTeamMemberInput {
  id: string;
  study_id: string;
  role?: TeamMemberRole;
  custom_role_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export async function updateTeamMember(
  input: UpdateTeamMemberInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('study_team_members')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${study_id}`);
    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function removeTeamMember(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('study_team_members')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${studyId}`);
    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Company-wide Team Directory
// =====================================================

export async function getTeamDirectory(): Promise<TeamMemberWithStudies[]> {
  const supabase = await createClient();
  const companyId = await getCompanyId();

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role')
    .eq('company_id', companyId)
    .order('first_name');

  if (profilesError) throw new Error(profilesError.message);
  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p) => p.id);

  const { data: assignments, error: assignError } = await supabase
    .from('study_team_members')
    .select('id, study_id, profile_id, role, is_active, custom_role_id, team_roles(role_name), studies(title), study_sites(name)')
    .in('profile_id', profileIds);

  if (assignError) throw new Error(assignError.message);

  return profiles.map((profile) => {
    const memberAssignments = (assignments ?? [])
      .filter((a: Record<string, unknown>) => a.profile_id === profile.id)
      .map((a: Record<string, unknown>) => ({
        id: a.id as string,
        study_id: a.study_id as string,
        study_title: (a.studies as Record<string, unknown> | null)?.title as string ?? '—',
        role: a.role as TeamMemberRole,
        custom_role_name: (a.team_roles as Record<string, unknown> | null)?.role_name as string | null,
        site_name: (a.study_sites as Record<string, unknown> | null)?.name as string | null,
        is_active: a.is_active as boolean,
      }));

    return {
      profile_id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      app_role: (profile.role as 'admin' | 'user') ?? 'user',
      assignments: memberAssignments,
    };
  });
}

// =====================================================
// Profile Management
// =====================================================

export interface UpdateProfileInput {
  profile_id: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'user';
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { profile_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(cleanUpdates)
      .eq('id', profile_id);

    if (error) return { error: error.message };

    revalidatePath('/protected/team');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
