'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';

export type TrackerDefinitionGateProfile = {
  id: string;
  company_id: string;
  role: string;
};

/**
 * Ensures the tracker exists for the user's company, company has_tracker_access,
 * and platform_access_enabled is true (AND). Redirects to /protected if not.
 */
export async function requireTrackerDefinitionAccess(
  trackerDefinitionId: string
): Promise<TrackerDefinitionGateProfile> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) {
    redirect('/auth/login');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('has_tracker_access')
    .eq('id', profile.company_id)
    .single();

  if (!company?.has_tracker_access) {
    redirect('/protected');
  }

  const { data: def } = await supabase
    .from('custom_tracker_definitions')
    .select('id, company_id, platform_access_enabled')
    .eq('id', trackerDefinitionId)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  if (!def || !def.platform_access_enabled) {
    redirect('/protected');
  }

  return profile as TrackerDefinitionGateProfile;
}
