import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';

/** Legacy URL; full study list UI was merged into the unified CTMS dashboard. */
export default async function StudiesCatalogPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect('/auth/login');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('has_ctms_access')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (company?.has_ctms_access === false) {
    redirect('/protected');
  }

  redirect('/protected/studies');
}
