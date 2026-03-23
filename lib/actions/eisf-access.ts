'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';

export async function requireEisfAccess(): Promise<{ id: string; company_id: string; role: string }> {
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
    .select('has_eisf_access')
    .eq('id', profile.company_id)
    .single();

  if (!company?.has_eisf_access) {
    redirect('/protected');
  }

  return profile as { id: string; company_id: string; role: string };
}
