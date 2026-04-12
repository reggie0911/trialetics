import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

import { processGeneratedAsset } from '@/lib/brand-forge/svg-pipeline';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return Response.json({ error: 'No company found' }, { status: 400 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Expected multipart/form-data body' }, { status: 400 });
    }

    const projectId = formData.get('projectId');
    const file = formData.get('file');

    if (typeof projectId !== 'string' || !projectId.trim()) {
      return Response.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'file is required' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
      return Response.json(
        { error: `Unsupported file type "${mimeType}". Accepted: PNG, JPEG, WebP, GIF, SVG.` },
        { status: 400 },
      );
    }

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id')
      .eq('id', projectId.trim())
      .eq('company_id', profile.company_id)
      .single();
    if (!project) {
      return Response.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { svgString, pngThumbnail } = await processGeneratedAsset(rawBuffer);

    const conceptId = randomUUID();
    const svgPath = `${profile.company_id}/${projectId}/concepts/${conceptId}.svg`;
    const pngPath = `${profile.company_id}/${projectId}/concepts/${conceptId}.png`;

    await supabase.storage
      .from('brandforge-assets')
      .upload(svgPath, Buffer.from(svgString, 'utf-8'), { contentType: 'image/svg+xml', upsert: true });

    await supabase.storage
      .from('brandforge-assets')
      .upload(pngPath, pngThumbnail, { contentType: 'image/png', upsert: true });

    const { data: signedPng } = await supabase.storage
      .from('brandforge-assets')
      .createSignedUrl(pngPath, 3600);

    const { data: concept, error: insertError } = await supabase
      .from('bf_logo_concepts')
      .insert({
        id: conceptId,
        project_id: projectId.trim(),
        prompt: null,
        svg_storage_path: svgPath,
        png_storage_path: pngPath,
        thumbnail_url: signedPng?.signedUrl ?? null,
        generation_metadata: {
          source: 'uploaded',
          style_preset: 'uploaded',
        },
      })
      .select('*')
      .single();

    if (insertError || !concept) {
      await supabase.storage.from('brandforge-assets').remove([svgPath, pngPath]).catch(() => undefined);
      return Response.json(
        { error: insertError?.message ?? 'Failed to save concept to database' },
        { status: 500 },
      );
    }

    return Response.json({ concept });
  } catch (err) {
    console.error('[brand-forge/upload-concept] Error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
