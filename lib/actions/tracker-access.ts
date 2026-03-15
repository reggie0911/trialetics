'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';

export async function requireTrackerAccess() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
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

  return profile;
}
