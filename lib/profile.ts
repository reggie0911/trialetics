import { createClient } from './server';
import type {
  Profile,
  ProfileWithCompany,
  UserProjectWithDetails,
  UserModuleWithDetails,
  Project,
} from './types/database.types';

/**
 * Get a user's profile by their auth user ID
 */
export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('user_id', userId)
    .single();

  return { data: data as ProfileWithCompany | null, error };
}

/**
 * Get a user's profile by their profile ID
 */
export async function getProfileById(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', profileId)
    .single();

  return { data: data as ProfileWithCompany | null, error };
}

/**
 * Get all projects assigned to a user
 */
export async function getUserProtocols(userId: string) {
  const supabase = await createClient();
  
  // First get the profile ID from user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    return { data: null, error: { message: 'Profile not found' } };
  }

  const { data, error } = await supabase
    .from('user_projects')
    .select('*, projects(*)')
    .eq('user_id', profile.id);

  return { data: data as UserProjectWithDetails[] | null, error };
}

/**
 * Get all modules accessible to a user
 */
export async function getUserModules(userId: string) {
  const supabase = await createClient();
  
  // First get the profile ID from user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    return { data: null, error: { message: 'Profile not found' } };
  }

  const { data, error } = await supabase
    .from('user_modules')
    .select('*, modules(*)')
    .eq('user_id', profile.id);

  return { data: data as UserModuleWithDetails[] | null, error };
}

/**
 * Get all profiles in a company
 */
export async function getCompanyProfiles(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', companyId);

  return { data: data as Profile[] | null, error };
}

/**
 * Get all projects for a company
 */
export async function getCompanyProtocols(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  return { data: data as Project[] | null, error };
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'first_name' | 'avatar_url'>>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}

/**
 * Assign a project to a user
 */
export async function assignProtocolToUser(profileId: string, projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_projects')
    .insert({ user_id: profileId, project_id: projectId })
    .select()
    .single();

  return { data, error };
}

/**
 * Remove a project assignment from a user
 */
export async function unassignProtocolFromUser(profileId: string, projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_projects')
    .delete()
    .eq('user_id', profileId)
    .eq('project_id', projectId);

  return { data, error };
}

/**
 * Grant a module to a user
 */
export async function grantModuleToUser(profileId: string, moduleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_modules')
    .insert({ user_id: profileId, module_id: moduleId })
    .select()
    .single();

  return { data, error };
}

/**
 * Revoke a module from a user
 */
export async function revokeModuleFromUser(profileId: string, moduleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_modules')
    .delete()
    .eq('user_id', profileId)
    .eq('module_id', moduleId);

  return { data, error };
}

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return data?.role === 'admin';
}

/**
 * Get all available modules
 */
export async function getAllModules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('active', true)
    .order('name');

  return { data, error };
}
