import { createClient } from '@/lib/server';
import { ImageryGuide } from '@/components/brand-forge/imagery/imagery-guide';
import type { BFBrandDirection } from '@/lib/types/brand-forge';

interface ImageryPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ImageryPage({ params }: ImageryPageProps) {
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

  const [{ data: direction }, { data: briefRow }] = await Promise.all([
    supabase
      .from('bf_brand_directions')
      .select('icon_style, imagery_direction')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('bf_brand_inputs')
      .select('additional_imagery_guidelines')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);

  return (
    <ImageryGuide
      projectId={projectId}
      brandDirection={direction as unknown as Pick<BFBrandDirection, 'icon_style' | 'imagery_direction'> | null}
      initialAdditionalImageryGuidelines={briefRow?.additional_imagery_guidelines ?? null}
    />
  );
}
