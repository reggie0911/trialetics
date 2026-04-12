import { createClient } from '@/lib/server';
import { LogoGallery } from '@/components/brand-forge/logo-gallery';
import { withFreshConceptThumbnails } from '@/lib/brand-forge/concept-thumbnails';
import type { BFLogoConcept, BFBrandInputs } from '@/lib/types/brand-forge';

interface LogosPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LogosPage({ params }: LogosPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, name, status')
    .eq('id', projectId)
    .single();

  if (!project) {
    return <div className="text-sm text-muted-foreground">Project not found.</div>;
  }

  const { data: concepts } = await supabase
    .from('bf_logo_concepts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const { data: inputs } = await supabase
    .from('bf_brand_inputs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  const { data: brandKitRow } = await supabase
    .from('bf_brand_kits')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  const rawConcepts = (concepts as unknown as BFLogoConcept[]) ?? [];
  const conceptsWithThumbnails = await withFreshConceptThumbnails(supabase, rawConcepts);

  return (
    <LogoGallery
      projectId={projectId}
      projectName={project.name}
      concepts={conceptsWithThumbnails}
      brandInputs={inputs as unknown as BFBrandInputs | null}
      hasBrandKit={Boolean(brandKitRow?.id)}
    />
  );
}
