import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 400 });
    }

    const { conceptId } = (await request.json().catch(() => ({}))) as { conceptId?: string };

    if (!conceptId) {
      return Response.json({ error: 'conceptId is required' }, { status: 400 });
    }

    const { data: concept } = await supabase
      .from('bf_logo_concepts')
      .select('*, bf_projects!inner(company_id)')
      .eq('id', conceptId)
      .single();

    if (
      !concept ||
      (concept as Record<string, unknown> & { bf_projects: { company_id: string } }).bf_projects.company_id !==
        profile.company_id
    ) {
      return Response.json({ error: 'Concept not found' }, { status: 404 });
    }

    const projectId = concept.project_id as string;
    const companyId = profile.company_id;

    const copyFile = async (
      originalPath: string | null,
      ext: 'png' | 'svg',
    ): Promise<string | null> => {
      if (!originalPath) return null;

      const { data: signedData, error: signErr } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(originalPath, 300);

      if (signErr || !signedData?.signedUrl) {
        console.error('[clone-concept] signed URL failed:', originalPath, signErr?.message);
        return null;
      }

      const fileResponse = await fetch(signedData.signedUrl);
      if (!fileResponse.ok) {
        console.error('[clone-concept] download failed:', originalPath, fileResponse.status);
        return null;
      }

      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      const newPath = `${companyId}/${projectId}/concepts/${randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('brandforge-assets')
        .upload(newPath, buffer, {
          contentType: ext === 'svg' ? 'image/svg+xml' : 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('[clone-concept] upload failed:', newPath, uploadError.message);
        return null;
      }
      return newPath;
    };

    const [newPngPath, newSvgPath] = await Promise.all([
      copyFile(concept.png_storage_path as string | null, 'png'),
      copyFile(concept.svg_storage_path as string | null, 'svg'),
    ]);

    if (!newPngPath && !newSvgPath) {
      return Response.json(
        {
          error:
            "Could not copy this concept's image files. Check storage permissions or try again.",
        },
        { status: 400 },
      );
    }

    let thumbnailUrl: string | null = null;
    if (newPngPath) {
      const { data: signed } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(newPngPath, 60 * 60 * 24);
      thumbnailUrl = signed?.signedUrl ?? null;
    } else if (newSvgPath) {
      const { data: signed } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(newSvgPath, 60 * 60 * 24);
      thumbnailUrl = signed?.signedUrl ?? null;
    }

    const existingMetadata = (concept.generation_metadata as Record<string, unknown>) ?? {};
    const newMetadata = {
      ...existingMetadata,
      parent_concept_id: conceptId,
      postProcessing: [],
    };

    const { data: inserted, error: insertError } = await supabase
      .from('bf_logo_concepts')
      .insert({
        project_id: projectId,
        prompt: concept.prompt,
        svg_storage_path: newSvgPath,
        png_storage_path: newPngPath,
        thumbnail_url: thumbnailUrl,
        is_favorite: false,
        is_selected: false,
        generation_metadata: newMetadata,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error('[clone-concept] insert error:', insertError?.message);
      return Response.json({ error: 'Failed to create clone' }, { status: 500 });
    }

    return Response.json({ concept: { ...inserted, thumbnail_url: thumbnailUrl } });
  } catch (err) {
    console.error('[clone-concept] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
