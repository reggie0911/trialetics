import { createClient } from '@/lib/server';
import { BrandKitEditor } from '@/components/brand-forge/brand-kit-editor';
import { BrandKitVersionHistory } from '@/components/brand-forge/brand-kit-version-history';
import type { BFLogoConcept, BFBrandKit, BFBrandInputs, BFColorSwatch } from '@/lib/types/brand-forge';

interface BrandKitPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function BrandKitPage({ params }: BrandKitPageProps) {
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

  const { data: concepts } = await supabase
    .from('bf_logo_concepts')
    .select('*')
    .eq('project_id', projectId)
    .order('is_favorite', { ascending: false });

  const { data: kit } = await supabase
    .from('bf_brand_kits')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  const { data: inputs } = await supabase
    .from('bf_brand_inputs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  const defaultColors: BFColorSwatch[] = ((inputs?.preferred_colors as string[]) ?? []).map((hex, i) => ({
    name: `Color ${i + 1}`,
    hex,
    usage: i === 0 ? 'primary' : i === 1 ? 'secondary' : i === 2 ? 'accent' : 'neutral',
  }));

  return (
    <div className="space-y-6 pb-24">
      {kit ? (
        <p className="text-sm text-muted-foreground max-w-3xl">
          Update your kit — adjust logos, colors, typography, and voice.
        </p>
      ) : null}
      <BrandKitEditor
        projectId={projectId}
        concepts={(concepts as unknown as BFLogoConcept[]) ?? []}
        brandKit={kit as unknown as BFBrandKit | null}
        brandInputs={inputs as unknown as BFBrandInputs | null}
        defaultColors={defaultColors}
      />
      <BrandKitVersionHistory projectId={projectId} />
    </div>
  );
}
