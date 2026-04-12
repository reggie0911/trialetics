import { createClient } from '@/lib/server';
import { MOCKUP_TYPES, MOCKUP_CATEGORIES } from '@/lib/types/brand-forge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SharedBrandKitPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedBrandKitPage({ params }: SharedBrandKitPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: shareLink } = await supabase
    .from('bf_share_links')
    .select('id, project_id, expires_at, revoked')
    .eq('token', token)
    .maybeSingle();

  if (!shareLink) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Share link not found or invalid.</p>
      </div>
    );
  }

  if (shareLink.revoked || new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">This share link has expired.</p>
      </div>
    );
  }

  const projectId = shareLink.project_id;

  const [
    { data: project },
    { data: brandKit },
    { data: direction },
    { data: mockupRows },
  ] = await Promise.all([
    supabase.from('bf_projects').select('id, name').eq('id', projectId).single(),
    supabase.from('bf_brand_kits').select('color_palette, font_pairing, brand_voice_summary').eq('project_id', projectId).maybeSingle(),
    supabase.from('bf_brand_directions').select('mood, visual_direction, color_palette, tagline_options').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('bf_mockups').select('*').eq('project_id', projectId).eq('is_favorite', true).order('created_at', { ascending: false }),
  ]);

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const mockups = mockupRows ?? [];
  let signedUrlMap: Record<string, string> = {};
  if (mockups.length > 0) {
    const paths = mockups.map((m) => m.storage_path as string).filter(Boolean);
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrls(paths, 60 * 60 * 24);
      if (signed) {
        signedUrlMap = Object.fromEntries(
          signed.filter((s) => s.signedUrl).map((s) => [s.path ?? '', s.signedUrl]),
        );
      }
    }
  }

  const colorPalette = (direction?.color_palette ?? []) as Array<{ hex: string; name: string }>;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        <div className="text-center space-y-2 py-8">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">Brand Kit Preview</p>
        </div>

        {direction && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Brand Direction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {direction.mood && (
                <p className="text-xs text-muted-foreground leading-relaxed">{direction.mood as string}</p>
              )}
              {direction.visual_direction && (
                <p className="text-xs text-muted-foreground leading-relaxed">{direction.visual_direction as string}</p>
              )}
              {colorPalette.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {colorPalette.map((swatch) => (
                    <div key={swatch.hex} className="text-center">
                      <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: swatch.hex }} />
                      <span className="text-[10px] text-muted-foreground block mt-1">{swatch.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {((direction.tagline_options as string[] | null)?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Taglines</p>
                  <ul className="space-y-1">
                    {(direction.tagline_options as string[]).map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground italic">&ldquo;{t}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {brandKit?.brand_voice_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Brand Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {brandKit.brand_voice_summary as string}
              </p>
            </CardContent>
          </Card>
        )}

        {mockups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mockups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {mockups.map((m) => {
                  const url = signedUrlMap[m.storage_path as string];
                  const cfg = MOCKUP_TYPES.find((t) => t.id === m.mockup_type);
                  const catLabel = MOCKUP_CATEGORIES.find((c) => c.id === cfg?.category)?.label;
                  return (
                    <div key={m.id as string} className="rounded-md border overflow-hidden">
                      {url && (
                        <img
                          src={url}
                          alt={cfg?.label ?? (m.mockup_type as string)}
                          className="w-full object-contain bg-muted"
                          style={{
                            aspectRatio:
                              cfg?.aspectRatio === '1:1' ? '1/1'
                                : cfg?.aspectRatio === '16:9' ? '16/9'
                                : cfg?.aspectRatio === '9:16' ? '9/16'
                                : '3/4',
                          }}
                        />
                      )}
                      <div className="p-2 flex items-center gap-1.5">
                        <span className="text-xs font-medium">{cfg?.label ?? (m.mockup_type as string)}</span>
                        {catLabel && (
                          <Badge variant="secondary" className="text-[9px]">{catLabel}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[10px] text-muted-foreground py-4">
          Shared via BrandForge &middot; This link expires {new Date(shareLink.expires_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
