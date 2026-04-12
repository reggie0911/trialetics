import { createClient } from '@/lib/server';
import { ExportPage } from '@/components/brand-forge/export-page';
import type { BFLogoConcept, BFBrandKit, BFExport } from '@/lib/types/brand-forge';

interface ExportPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function BrandForgeExportPage({ params }: ExportPageProps) {
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
    .from('bf_brand_kits')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  const conceptIds = [
    kit?.primary_logo_concept_id,
    kit?.secondary_logo_concept_id,
    kit?.icon_mark_concept_id,
  ].filter(Boolean) as string[];

  let concepts: BFLogoConcept[] = [];
  if (conceptIds.length > 0) {
    const { data } = await supabase
      .from('bf_logo_concepts')
      .select('*')
      .in('id', conceptIds);
    concepts = (data as unknown as BFLogoConcept[]) ?? [];
  }

  const { data: exports } = await supabase
    .from('bf_exports')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <ExportPage
      projectId={projectId}
      projectName={project.name}
      brandKit={kit as unknown as BFBrandKit | null}
      concepts={concepts}
      exportHistory={(exports as unknown as BFExport[]) ?? []}
    />
  );
}
