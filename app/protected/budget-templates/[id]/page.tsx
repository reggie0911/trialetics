import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getBudgetTemplate } from '@/lib/actions/budget-templates';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getAllClinicalSites } from '@/lib/actions/clinical-sites';
import BudgetTemplateDetailClient from '@/components/budget-templates/budget-template-detail-client';

export default async function BudgetTemplateDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<Record<string, string | string[]>>;
  }
) {
  const searchParams = await props.searchParams;
  const { id } = await props.params;
  if (searchParams) await searchParams;
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

  if (!profile?.company_id) {
    redirect('/protected');
  }

  const [templateResult, protocolsResult, sitesResult] = await Promise.all([
    getBudgetTemplate(id),
    getAllClinicalProtocols(profile.company_id),
    getAllClinicalSites(profile.company_id),
  ]);

  if (!templateResult.success || !templateResult.data) {
    return (
      <div className="p-6 bg-[#E9E9E9] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 text-xs text-destructive">
            Template not found or you don&apos;t have access to it.
          </div>
        </div>
      </div>
    );
  }

  const protocols = protocolsResult.success && protocolsResult.data ? protocolsResult.data : [];
  const sites = sitesResult.success && sitesResult.data ? sitesResult.data : [];

  return (
    <BudgetTemplateDetailClient
      templateId={id}
      companyId={profile.company_id}
      profileId={profile.id}
      protocols={protocols as { id: string; protocol_number: string; title: string }[]}
      sites={sites as { id: string; site_number: string | null; protocol_id: string }[]}
      initialTemplate={templateResult.data}
    />
  );
}
