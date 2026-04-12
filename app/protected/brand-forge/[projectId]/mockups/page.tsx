import { createClient } from '@/lib/server';
import { MockupGallery } from '@/components/brand-forge/mockups/mockup-gallery';
import { conceptLogoReferenceStoragePath } from '@/lib/brand-forge/mockup-prompt';
import type { BFMockup } from '@/lib/types/brand-forge';

interface MockupsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MockupsPage({ params }: MockupsPageProps) {
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

  const [{ data: mockupRows }, { data: brandKit }] = await Promise.all([
    supabase
      .from('bf_mockups')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('bf_brand_kits')
      .select('primary_logo_concept_id')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);

  const mockups = (mockupRows ?? []) as unknown as BFMockup[];

  const storagePaths = mockups.map((m) => m.storage_path).filter(Boolean);
  let signedUrlMap: Record<string, string> = {};
  if (storagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('brandforge-assets')
      .createSignedUrls(storagePaths, 60 * 60 * 24);
    if (signed) {
      signedUrlMap = Object.fromEntries(
        signed
          .filter((s) => s.signedUrl)
          .map((s) => [s.path ?? '', s.signedUrl]),
      );
    }
  }

  let hasLogo = false;
  let primaryLogoPreviewUrl: string | null = null;
  const primaryLogoConceptId = brandKit?.primary_logo_concept_id ?? null;
  if (primaryLogoConceptId) {
    const { data: logoConcept } = await supabase
      .from('bf_logo_concepts')
      .select('id, png_storage_path, svg_storage_path')
      .eq('id', primaryLogoConceptId)
      .maybeSingle();
    const path = logoConcept ? conceptLogoReferenceStoragePath(logoConcept) : null;
    hasLogo = !!path;
    if (path) {
      const { data: signedPrimary } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(path, 3600);
      primaryLogoPreviewUrl = signedPrimary?.signedUrl ?? null;
    }
  }

  const { data: conceptRows } = await supabase
    .from('bf_logo_concepts')
    .select('id, created_at, png_storage_path, svg_storage_path')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const logoReferenceOptions =
    conceptRows
      ?.filter((c) =>
        conceptLogoReferenceStoragePath({
          png_storage_path: c.png_storage_path as string | null,
          svg_storage_path: c.svg_storage_path as string | null,
        }),
      )
      .map((c) => {
        const d = c.created_at ? new Date(c.created_at).toLocaleDateString() : '';
        return {
          id: c.id as string,
          label: d ? `Saved artwork — ${d}` : 'Saved artwork',
        };
      }) ?? [];

  return (
    <MockupGallery
      projectId={projectId}
      mockups={mockups}
      signedUrlMap={signedUrlMap}
      hasLogo={hasLogo}
      primaryLogoConceptId={primaryLogoConceptId}
      primaryLogoPreviewUrl={primaryLogoPreviewUrl}
      logoReferenceOptions={logoReferenceOptions}
    />
  );
}
