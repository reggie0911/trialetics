'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type OrganizationTeamMember = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: string;
  created_at: string;
};

export async function getOrganizationTeamMembers(
  organizationId: string
): Promise<ActionResponse<Array<OrganizationTeamMember & { profile?: { id: string; first_name: string | null; email: string | null } }>>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organization_team_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching organization team members:', error);
      return { success: false, error: error.message };
    }

    if (!data?.length) {
      return { success: true, data: [] };
    }

    const profileIds = [...new Set(data.map((m) => m.profile_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .in('id', profileIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const enriched = data.map((m) => ({
      ...m,
      profile: profileMap.get(m.profile_id) || null,
    }));

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getOrganizationTeamMembers:', error);
    return { success: false, error: 'Failed to fetch site team members' };
  }
}

export async function addOrganizationTeamMember(
  organizationId: string,
  profileId: string,
  role: string = 'member'
): Promise<ActionResponse<OrganizationTeamMember>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('organization_team_members')
      .insert({
        organization_id: organizationId,
        profile_id: profileId,
        role: role,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This team member is already assigned' };
      }
      console.error('Error adding organization team member:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/contacts-organizations/${organizationId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error in addOrganizationTeamMember:', error);
    return { success: false, error: 'Failed to add team member' };
  }
}

export async function removeOrganizationTeamMember(
  memberId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: member } = await supabase
      .from('organization_team_members')
      .select('organization_id')
      .eq('id', memberId)
      .single();

    const { error } = await supabase
      .from('organization_team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing organization team member:', error);
      return { success: false, error: error.message };
    }

    if (member?.organization_id) {
      revalidatePath(`/protected/contacts-organizations/${member.organization_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in removeOrganizationTeamMember:', error);
    return { success: false, error: 'Failed to remove team member' };
  }
}
