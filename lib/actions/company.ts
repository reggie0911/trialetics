'use server';

import { createClient } from '@/lib/server';

export async function checkTrackerAccess(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) return false;

  const { data: company } = await supabase
    .from('companies')
    .select('has_tracker_access')
    .eq('id', profile.company_id)
    .single();

  return company?.has_tracker_access === true;
}

export async function getCompanyTrackerAccess(companyId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('has_tracker_access')
    .eq('id', companyId)
    .single();

  return company?.has_tracker_access === true;
}
