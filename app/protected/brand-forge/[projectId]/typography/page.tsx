import { createClient } from '@/lib/server';
import { TypographyEditor } from '@/components/brand-forge/typography/typography-editor';
import type { BFBrandKit } from '@/lib/types/brand-forge';

interface TypographyPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TypographyPage({ params }: TypographyPageProps) {
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
    .select('typography_recommendations')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <TypographyEditor
      projectId={projectId}
      brandKit={kit as unknown as BFBrandKit | null}
      aiRecommendations={(direction?.typography_recommendations as Record<string, unknown>) ?? null}
    />
  );
}
