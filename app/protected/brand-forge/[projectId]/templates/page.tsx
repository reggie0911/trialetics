import { createClient } from '@/lib/server';
import { MaterialsThemeEditor } from '@/components/brand-forge/templates/materials-theme-editor';
import type { BFMaterialTheme } from '@/lib/types/brand-forge';

interface TemplatesPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TemplatesPage({ params }: TemplatesPageProps) {
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

  const { data: theme } = await supabase
    .from('bf_material_themes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <MaterialsThemeEditor
      projectId={projectId}
      materialTheme={theme as unknown as BFMaterialTheme | null}
    />
  );
}
