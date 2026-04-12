import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

import { createClient } from '@/lib/server';
import type { BFGenerationMetadata, BFLogoConcept } from '@/lib/types/brand-forge';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ACTION_MODELS: Record<string, string> = {
  /**
   * Pinned versions required for community models — SDK sends to /v1/predictions (not /v1/models/.../predictions).
   * Fetch latest hash from https://replicate.com/<owner>/<model>/versions
   */
  'remove-bg': 'recraft-ai/recraft-remove-background',
  'vectorize': 'recraft-ai/recraft-vectorize',
  'upscale': 'recraft-ai/recraft-creative-upscale',
  'print-render': 'recraft-ai/recraft-v4-pro',
};

const KNOWN_ACTIONS = new Set([...Object.keys(ACTION_MODELS), 'convert-bw']);

function resolveOutputUrl(output: unknown): string | null {
  if (typeof output === 'object' && output !== null && 'url' in output && typeof (output as { url: () => unknown }).url === 'function') {
    try {
      const u = (output as { url: () => unknown }).url();
      if (u instanceof URL) return u.href;
      if (typeof u === 'string' && (u.startsWith('http') || u.startsWith('data:'))) return u;
    } catch {
      /* ignore */
    }
  }
  if (typeof output === 'string' && (output.startsWith('http') || output.startsWith('data:'))) return output;
  if (Array.isArray(output) && output.length > 0) return resolveOutputUrl(output[0]);
  return null;
}

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

    const { conceptId, action } = await request.json() as { conceptId: string; action: string };

    if (!conceptId || !action) {
      return Response.json({ error: 'Missing conceptId or action' }, { status: 400 });
    }

    if (!KNOWN_ACTIONS.has(action)) {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { data: concept } = await supabase
      .from('bf_logo_concepts')
      .select('*, bf_projects!inner(company_id)')
      .eq('id', conceptId)
      .single();

    if (!concept || (concept as Record<string, unknown> & { bf_projects: { company_id: string } }).bf_projects.company_id !== profile.company_id) {
      return Response.json({ error: 'Concept not found' }, { status: 404 });
    }

    const pngPath = concept.png_storage_path as string | null;
    if (!pngPath && action !== 'print-render') {
      return Response.json({ error: 'No PNG available for this concept' }, { status: 400 });
    }

    let sourceUrl: string;
    if (pngPath) {
      const { data: signedUrl } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(pngPath, 600);
      if (!signedUrl?.signedUrl) {
        return Response.json({ error: 'Could not access concept image' }, { status: 500 });
      }
      sourceUrl = signedUrl.signedUrl;
    } else {
      return Response.json({ error: 'No image source available' }, { status: 400 });
    }

    // ---------- B&W conversion (Sharp, no Replicate) ----------
    if (action === 'convert-bw') {
      const sourceResponse = await fetch(sourceUrl);
      if (!sourceResponse.ok) {
        return Response.json({ error: 'Could not read source image' }, { status: 500 });
      }
      const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer());
      const bwBuffer = await sharp(sourceBuffer).greyscale().png().toBuffer();

      const projectId = concept.project_id as string;
      const bwPath = `${profile.company_id}/${projectId}/concepts/${randomUUID()}.png`;

      await supabase.storage.from('brandforge-assets').upload(bwPath, bwBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

      const { data: signedBw } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(bwPath, 60 * 60 * 24);

      const existingMeta = (concept.generation_metadata as Record<string, unknown>) ?? {};
      const postProcessing = Array.isArray(existingMeta.postProcessing)
        ? [...existingMeta.postProcessing, action]
        : [action];

      const nextMeta = { ...existingMeta, postProcessing } as BFGenerationMetadata;

      await supabase
        .from('bf_logo_concepts')
        .update({
          png_storage_path: bwPath,
          thumbnail_url: signedBw?.signedUrl ?? null,
          generation_metadata: nextMeta,
        })
        .eq('id', conceptId);

      const conceptPatch: Partial<BFLogoConcept> = {
        png_storage_path: bwPath,
        thumbnail_url: signedBw?.signedUrl ?? null,
        generation_metadata: nextMeta,
      };

      return Response.json({ success: true, path: bwPath, action, concept: conceptPatch });
    }
    // ----------------------------------------------------------

    if (!process.env.REPLICATE_API_TOKEN?.trim()) {
      return Response.json(
        { error: 'Image processing is not configured. Add REPLICATE_API_TOKEN to your server environment.' },
        { status: 503 },
      );
    }

    const replicateModel = ACTION_MODELS[action];
    if (!replicateModel) {
      return Response.json({ error: 'No Replicate model mapped for this action' }, { status: 400 });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const modelInput: Record<string, unknown> = { image: sourceUrl };

    if (action === 'print-render') {
      const metadata = concept.generation_metadata as Record<string, unknown> | null;
      modelInput.prompt = (metadata?.prompt as string) ?? 'professional clinical study logo';
    }

    let output: unknown;
    try {
      output = await replicate.run(replicateModel as `${string}/${string}`, { input: modelInput });
    } catch (repErr) {
      const msg = repErr instanceof Error ? repErr.message : String(repErr);
      console.error('[brand-forge/post-process] Replicate error:', action, msg);
      return Response.json(
        {
          error:
            msg.length > 280
              ? `${msg.slice(0, 280)}…`
              : msg || 'Replicate request failed. Check credits and model availability.',
        },
        { status: 502 },
      );
    }
    const outputUrl = resolveOutputUrl(output);
    if (!outputUrl) {
      return Response.json({ error: 'Post-processing returned no output' }, { status: 500 });
    }

    const response = await fetch(outputUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'image/png';
    const isSvg = contentType.includes('svg') || action === 'vectorize';

    const projectId = concept.project_id as string;
    const fileId = randomUUID();
    const ext = isSvg ? 'svg' : 'png';
    const storagePath = `${profile.company_id}/${projectId}/concepts/${fileId}.${ext}`;

    await supabase.storage.from('brandforge-assets').upload(storagePath, buffer, {
      contentType: isSvg ? 'image/svg+xml' : 'image/png',
      upsert: true,
    });

    const existingMetadata = (concept.generation_metadata as Record<string, unknown>) ?? {};
    const postProcessing = Array.isArray(existingMetadata.postProcessing)
      ? [...existingMetadata.postProcessing, action]
      : [action];

    const nextMeta = { ...existingMetadata, postProcessing } as BFGenerationMetadata;

    const updateData: Record<string, unknown> = {
      generation_metadata: nextMeta,
    };

    let thumbSigned: string | null = null;

    if (isSvg) {
      updateData.svg_storage_path = storagePath;
      const { data: signedSvg } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(storagePath, 60 * 60 * 24);
      thumbSigned = signedSvg?.signedUrl ?? null;
      updateData.thumbnail_url = thumbSigned;
    } else {
      updateData.png_storage_path = storagePath;
      const { data: signedUrl } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(storagePath, 60 * 60 * 24);
      thumbSigned = signedUrl?.signedUrl ?? null;
      updateData.thumbnail_url = thumbSigned;
    }

    await supabase
      .from('bf_logo_concepts')
      .update(updateData)
      .eq('id', conceptId);

    const conceptPatch: Partial<BFLogoConcept> = {
      generation_metadata: nextMeta,
      thumbnail_url: thumbSigned,
    };
    if (isSvg) {
      conceptPatch.svg_storage_path = storagePath;
    } else {
      conceptPatch.png_storage_path = storagePath;
    }

    return Response.json({ success: true, path: storagePath, action, concept: conceptPatch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Post-process error:', err);
    return Response.json(
      { error: msg.length > 280 ? `${msg.slice(0, 280)}…` : msg || 'Internal server error' },
      { status: 500 },
    );
  }
}
