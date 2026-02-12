import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { PaymentSiteDetailPageClient } from '@/components/clinical-payments/payment-site-detail-page-client';

export default async function ClinicalPaymentSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, email')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/protected');
  }

  const { data: site } = await supabase
    .from('clinical_sites')
    .select(`
      id,
      site_number,
      organization_id,
      protocol_id,
      region_id,
      clinical_protocols(id, protocol_number, title),
      clinical_regions(region_name),
      organizations(name)
    `)
    .eq('id', siteId)
    .eq('company_id', profile.company_id)
    .single();

  if (!site) {
    notFound();
  }

  const organization = Array.isArray(site.organizations) ? site.organizations[0] : site.organizations;
  const protocol = Array.isArray(site.clinical_protocols) ? site.clinical_protocols[0] : site.clinical_protocols;
  const region = Array.isArray(site.clinical_regions) ? site.clinical_regions[0] : site.clinical_regions;

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-sans">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              Site Payments - {site.site_number ?? 'N/A'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {organization?.name ?? 'Site'} - Protocol: {protocol?.protocol_number ?? 'N/A'}
            </p>
          </div>
          <ModuleNavbar />
        </div>

        <PaymentSiteDetailPageClient
          siteId={siteId}
          site={site}
          companyId={profile.company_id}
          profileId={profile.id}
          email={profile.email || user.email || ''}
        />
      </main>
    </div>
  );
}
