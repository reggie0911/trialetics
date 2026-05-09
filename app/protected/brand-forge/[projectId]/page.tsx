import { asResolved } from '@/lib/next/as-resolved';
import { createClient } from '@/lib/server';
import { StudyOverview } from '@/components/brand-forge/overview/study-overview';
import type { BFBrandInputs, BFBrandDirection, BFWorkspaceStatus } from '@/lib/types/brand-forge';

function workspaceStatusFromData(args: {
  direction: BFBrandDirection | null;
  logoRow: { id: string } | null;
  brandKit: { color_palette: unknown; font_pairing: unknown } | null;
  recruitmentRow: { id: string } | null;
  themeRow: { id: string } | null;
  mockupRow: { id: string } | null;
}): BFWorkspaceStatus {
  const { direction, logoRow, brandKit, recruitmentRow, themeRow, mockupRow } = args;
  const fp = brandKit?.font_pairing;
  const pairingId =
    fp && typeof fp === 'object' && 'pairing_id' in fp
      ? (fp as { pairing_id?: unknown }).pairing_id
      : undefined;
  const typographyDone = typeof pairingId === 'string' && pairingId.trim().length > 0;

  return {
    logos: !!logoRow,
    colors: Array.isArray(brandKit?.color_palette) && brandKit.color_palette.length > 0,
    typography: typographyDone,
    imagery: !!(direction?.icon_style?.trim() || direction?.imagery_direction?.trim()),
    mockups: !!mockupRow,
    recruitment: !!recruitmentRow,
    templates: !!themeRow,
  };
}

interface OverviewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function OverviewPage({ params }: OverviewPageProps) {
  const { projectId } = await asResolved(params);
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id, name, status')
    .eq('id', projectId)
    .single();

  if (!project) {
    return <div className="text-sm text-muted-foreground">Project not found.</div>;
  }

  const [
    { data: inputs },
    { data: direction },
    { data: logoRow },
    { data: brandKit },
    { data: recruitmentRow },
    { data: themeRow },
    { data: mockupRow },
  ] = await Promise.all([
    supabase.from('bf_brand_inputs').select('*').eq('project_id', projectId).single(),
    supabase
      .from('bf_brand_directions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('bf_logo_concepts').select('id').eq('project_id', projectId).limit(1).maybeSingle(),
    supabase
      .from('bf_brand_kits')
      .select('color_palette, font_pairing')
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('bf_recruitment_kits')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('bf_material_themes')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('bf_mockups').select('id').eq('project_id', projectId).limit(1).maybeSingle(),
  ]);

  const directionTyped = direction as unknown as BFBrandDirection | null;
  const workspaceStatus = workspaceStatusFromData({
    direction: directionTyped,
    logoRow,
    brandKit,
    recruitmentRow,
    themeRow,
    mockupRow,
  });

  return (
    <StudyOverview
      projectId={projectId}
      projectName={project.name}
      projectStatus={project.status}
      brandInputs={inputs as unknown as BFBrandInputs | null}
      brandDirection={directionTyped}
      workspaceStatus={workspaceStatus}
    />
  );
}
