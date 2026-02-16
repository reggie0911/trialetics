import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { SiteTrainingClient } from '@/components/clinical-training/site-training-client';

export default async function SiteTrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const { siteId } = await params;
  if (searchParams) await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) redirect('/protected');

  const { data: site } = await supabase
    .from('clinical_sites')
    .select('id, site_number, protocol_id')
    .eq('id', siteId)
    .eq('company_id', profile.company_id)
    .single();

  if (!site) redirect('/protected/clinical-training');

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Site Training</h1>
            <p className="text-sm text-muted-foreground">
              Manage training plans and topics for site {site.site_number || siteId}
            </p>
          </div>
          <ModuleNavbar />
        </div>
        <SiteTrainingClient
          clinicalSiteId={siteId}
          siteNumber={site.site_number || 'Site'}
          companyId={profile.company_id}
        />
      </main>
    </div>
  );
}
