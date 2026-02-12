import { redirect } from 'next/navigation';
import TemplateDetailPageClient from '@/components/visit-templates/template-detail-page-client';
import { createClient } from '@/lib/server';
import { getVisitTemplateById } from '@/lib/actions/subject-visit-templates';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Get user and company_id server-side
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

  // Fetch template and protocols in parallel
  const [templateResult, protocolsResult] = await Promise.all([
    getVisitTemplateById(profile.company_id, id),
    getAllClinicalProtocols(profile.company_id),
  ]);

  if (!templateResult.success || !templateResult.data) {
    return (
      <div className="p-6 bg-[#E9E9E9] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 text-xs text-destructive">
            Template not found or you don't have access to it.
          </div>
        </div>
      </div>
    );
  }

  const protocols = protocolsResult.success && protocolsResult.data ? protocolsResult.data : [];

  return (
    <TemplateDetailPageClient 
      templateId={id} 
      companyId={profile.company_id}
      profileId={profile.id}
      email={profile.email || user.email || ''}
      protocols={protocols}
      initialTemplate={templateResult.data}
    />
  );
}
