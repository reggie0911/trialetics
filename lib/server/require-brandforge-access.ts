import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';

/**
 * Redirects to `/protected` when the user's company does not have BrandForge enabled.
 * Platform admins bypass (support / cross-tenant work).
 */
export async function requireBrandforgeAccess(redirectTo = '/protected'): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, is_platform_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect('/auth/login?reason=profile');
  }

  if (profile.is_platform_admin === true) {
    return;
  }

  const { data: company } = await supabase
    .from('companies')
    .select('has_brandforge_access')
    .eq('id', profile.company_id)
    .maybeSingle();

  const hasBrandforgeAccess = company?.has_brandforge_access === true;
  if (!hasBrandforgeAccess) {
    redirect(redirectTo);
  }
}
