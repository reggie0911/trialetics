import { createClient } from '@/lib/server';
import { ColorPaletteEditor } from '@/components/brand-forge/colors/color-palette-editor';
import type { BFBrandKit, BFBrandDirection } from '@/lib/types/brand-forge';

interface ColorsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ColorsPage({ params }: ColorsPageProps) {
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

  const { data: direction } = await supabase
    .from('bf_brand_directions')
    .select('color_palette')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <ColorPaletteEditor
      projectId={projectId}
      brandKit={kit as unknown as BFBrandKit | null}
      suggestedPalette={(direction as unknown as BFBrandDirection | null)?.color_palette ?? []}
    />
  );
}
