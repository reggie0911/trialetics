import { createClient } from '@/lib/server';
import { RecruitmentKitEditor } from '@/components/brand-forge/recruitment/recruitment-kit-editor';
import type { BFRecruitmentKit } from '@/lib/types/brand-forge';

interface RecruitmentPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function RecruitmentPage({ params }: RecruitmentPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, name')
    .eq('id', projectId)
    .single();

  if (!project) {
    return <div className="text-sm text-muted-foreground">Project not found.</div>;
  }

  const { data: kit } = await supabase
    .from('bf_recruitment_kits')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <RecruitmentKitEditor
      projectId={projectId}
      recruitmentKit={kit as unknown as BFRecruitmentKit | null}
    />
  );
}
