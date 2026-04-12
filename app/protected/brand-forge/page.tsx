import { BrandForgeDashboardClient } from '@/components/brand-forge/brand-forge-dashboard-client';
import { createClient } from '@/lib/server';

export default async function BrandForgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user!.id)
    .single();

  return (
    <BrandForgeDashboardClient
      companyId={profile?.company_id ?? ''}
      profileId={profile?.id ?? ''}
    />
  );
}
