import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { randomUUID } from 'crypto';

import { createClient } from '@/lib/server';
import { processGeneratedAsset } from '@/lib/brand-forge/svg-pipeline';
import { buildPrompt } from '@/lib/brand-forge/prompt-builder';
import { GENERATION_MODELS, type BFBrandInputs, type GenerationModelId } from '@/lib/types/brand-forge';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODEL_CONFIGS: Record<string, { replicate: string; nativeSvg?: boolean; maxBatch: number; delayMs: number }> = {
  'ideogram-v3-turbo': { replicate: 'ideogram-ai/ideogram-v3-turbo', maxBatch: 4, delayMs: 12000 },
  'recraft-v4-svg': { replicate: 'recraft-ai/recraft-v4-svg', nativeSvg: true, maxBatch: 4, delayMs: 5000 },
  'recraft-v4-pro-svg': { replicate: 'recraft-ai/recraft-v4-pro-svg', nativeSvg: true, maxBatch: 2, delayMs: 8000 },
  'recraft-v4': { replicate: 'recraft-ai/recraft-v4', maxBatch: 4, delayMs: 5000 },
  'flux-kontext-pro': { replicate: 'black-forest-labs/flux-kontext-pro', maxBatch: 3, delayMs: 8000 },
  'dreamina-3.1': { replicate: 'bytedance/dreamina-3.1', maxBatch: 4, delayMs: 5000 },
  /** Low credit accounts: ~6 predictions/min, burst 1 — keep batch 1 and ≥11s between calls. */
  'flux-schnell': { replicate: 'black-forest-labs/flux-1-schnell', maxBatch: 1, delayMs: 11000 },
};

function extractRetryAfterSeconds(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/"retry_after"\s*:\s*(\d+)/i);
  if (m) return Math.min(120, Math.max(1, parseInt(m[1], 10)));
  return null;
}

function isReplicateRateLimited(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429')
    || msg.includes('too many requests')
    || msg.includes('throttled')
    || msg.includes('rate limit')
  );
}

async function runReplicateWithThrottleRetry(
  replicate: InstanceType<typeof Replicate>,
  ref: `${string}/${string}`,
  input: Record<string, unknown>,
  opts: { maxRetries: number },
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await replicate.run(ref, { input });
    } catch (e) {
      lastErr = e;
      if (!isReplicateRateLimited(e) || attempt === opts.maxRetries) throw e;
      const wait = extractRetryAfterSeconds(e) ?? 12;
      console.warn(`[brand-forge/generate] Replicate rate limited, waiting ${wait + 1}s before retry ${attempt + 1}/${opts.maxRetries}`);
      await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
    }
  }
  throw lastErr;
}

function urlLikeToString(u: unknown): string | null {
  if (typeof u === 'string') {
    if (u.startsWith('http') || u.startsWith('data:')) return u;
    return null;
  }
  if (u instanceof URL) return u.href;
  return null;
}

function resolveOutputUrl(output: unknown): string | null {
  if (output == null) return null;
  const direct = urlLikeToString(output);
  if (direct) return direct;
  if (Array.isArray(output) && output.length > 0) {
    for (const item of output) {
      const u = resolveOutputUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof output === 'object') {
    const o = output as Record<string, unknown>;
    if (typeof o.url === 'function') {
      try {
        const u = (o.url as () => unknown)();
        const href = urlLikeToString(u);
        if (href) return href;
      } catch {
        /* ignore */
      }
    }
    if (typeof o.toString === 'function' && o.toString !== Object.prototype.toString) {
      try {
        const s = urlLikeToString((o as { toString: () => unknown }).toString());
        if (s) return s;
      } catch {
        /* ignore */
      }
    }
    if (typeof o.url === 'string') return urlLikeToString(o.url);
    if (typeof o.href === 'string') return urlLikeToString(o.href);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN?.trim()) {
      return Response.json(
        {
          error:
            'Image generation is not configured. Add REPLICATE_API_TOKEN to your server environment (see Replicate dashboard).',
        },
        { status: 503 },
      );
    }

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

    const body = await request.json();
    const {
      projectId,
      generationStyle,
      model: modelId = 'ideogram-v3-turbo',
      batchSize: requestedBatch,
      referenceImageUrl,
      styleDescription: rawStyleDescription,
      customPrompt: rawCustomPrompt,
      fullPromptOverride: rawFullPromptOverride,
    } = body as {
      projectId: string;
      generationStyle: string;
      model?: GenerationModelId;
      batchSize?: number;
      referenceImageUrl?: string;
      styleDescription?: string;
      customPrompt?: string;
      /** When set, replaces server-built prompt entirely (same trimming cap as combined extras). */
      fullPromptOverride?: string;
    };

    if (!projectId || !generationStyle) {
      return Response.json({ error: 'Missing projectId or generationStyle' }, { status: 400 });
    }

    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      return Response.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
    }

    const MAX_CUSTOM = 2000;
    const MAX_FULL_PROMPT = 12000;
    const styleDescription = typeof rawStyleDescription === 'string' ? rawStyleDescription.trim().slice(0, MAX_CUSTOM) : undefined;
    const customPrompt = typeof rawCustomPrompt === 'string' ? rawCustomPrompt.trim().slice(0, MAX_CUSTOM) : undefined;
    const fullPromptOverride =
      typeof rawFullPromptOverride === 'string' && rawFullPromptOverride.trim().length > 0
        ? rawFullPromptOverride.trim().slice(0, MAX_FULL_PROMPT)
        : undefined;

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: inputs } = await supabase
      .from('bf_brand_inputs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (!inputs) {
      return Response.json({ error: 'Brand inputs not found' }, { status: 404 });
    }

    const brandInputs = inputs as unknown as BFBrandInputs;
    const prompt = fullPromptOverride ?? buildPrompt(brandInputs, generationStyle, { styleDescription, customPrompt });

    /** Prefer plain URL strings from `run()`; easier to `fetch()` than FileOutput streams. */
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });
    const BATCH_SIZE = Math.min(requestedBatch ?? modelConfig.maxBatch, modelConfig.maxBatch);
    const concepts = [];
    let lastFailure = 'No failure detail recorded.';

    for (let i = 0; i < BATCH_SIZE; i++) {
      try {
        if (i > 0) await new Promise((r) => setTimeout(r, modelConfig.delayMs));

        const modelInput: Record<string, unknown> = {
          prompt: `${prompt} (variation ${i + 1})`,
          aspect_ratio: '1:1',
        };

        if (modelId === 'flux-kontext-pro' && referenceImageUrl) {
          modelInput.image_url = referenceImageUrl;
        }

        const output = await runReplicateWithThrottleRetry(
          replicate,
          modelConfig.replicate as `${string}/${string}`,
          modelInput,
          { maxRetries: 3 },
        );

        const outputUrl = resolveOutputUrl(output);
        if (!outputUrl) {
          lastFailure =
            'The model did not return a usable image URL. Try another model or check Replicate model output format.';
          console.error(`Generation ${i + 1}: unparseable output`, typeof output, output);
          continue;
        }

        const conceptId = randomUUID();

        if (modelConfig.nativeSvg) {
          const response = await fetch(outputUrl);
          if (!response.ok) {
            lastFailure = `Could not download generated SVG (${response.status}).`;
            continue;
          }
          const svgString = await response.text();
          const svgPath = `${profile.company_id}/${projectId}/concepts/${conceptId}.svg`;

          await supabase.storage.from('brandforge-assets').upload(svgPath, Buffer.from(svgString), {
            contentType: 'image/svg+xml',
            upsert: true,
          });

          const { data: svgThumb } = await supabase.storage
            .from('brandforge-assets')
            .createSignedUrl(svgPath, 60 * 60 * 24);

          const { data: concept, error: insertError } = await supabase
            .from('bf_logo_concepts')
            .insert({
              id: conceptId,
              project_id: projectId,
              prompt,
              svg_storage_path: svgPath,
              png_storage_path: null,
              thumbnail_url: svgThumb?.signedUrl ?? null,
              generation_metadata: {
                source: 'native-svg' as const,
                model: modelConfig.replicate,
                prompt,
                style_preset: generationStyle,
                ...(styleDescription ? { styleDescription } : {}),
                ...(customPrompt ? { customPrompt } : {}),
              },
            })
            .select('*')
            .single();

          if (insertError) {
            lastFailure = insertError.message;
            console.error('bf_logo_concepts insert (svg):', insertError);
          } else if (concept) {
            concepts.push(concept);
          }
        } else {
          const response = await fetch(outputUrl);
          if (!response.ok) {
            lastFailure = `Could not download generated image (${response.status}). The file URL may have expired.`;
            continue;
          }
          const rawBuffer = Buffer.from(await response.arrayBuffer());
          const { svgString, pngThumbnail, source } = await processGeneratedAsset(rawBuffer);

          const svgPath = `${profile.company_id}/${projectId}/concepts/${conceptId}.svg`;
          const pngPath = `${profile.company_id}/${projectId}/concepts/${conceptId}.png`;

          await supabase.storage.from('brandforge-assets').upload(svgPath, Buffer.from(svgString), {
            contentType: 'image/svg+xml',
            upsert: true,
          });

          await supabase.storage.from('brandforge-assets').upload(pngPath, pngThumbnail, {
            contentType: 'image/png',
            upsert: true,
          });

          const { data: signedUrl } = await supabase.storage
            .from('brandforge-assets')
            .createSignedUrl(pngPath, 60 * 60 * 24);

          const { data: concept, error: insertError } = await supabase
            .from('bf_logo_concepts')
            .insert({
              id: conceptId,
              project_id: projectId,
              prompt,
              svg_storage_path: svgPath,
              png_storage_path: pngPath,
              thumbnail_url: signedUrl?.signedUrl ?? null,
              generation_metadata: {
                source,
                model: modelConfig.replicate,
                prompt,
                style_preset: generationStyle,
                ...(styleDescription ? { styleDescription } : {}),
                ...(customPrompt ? { customPrompt } : {}),
              },
            })
            .select('*')
            .single();

          if (insertError) {
            lastFailure = insertError.message;
            console.error('bf_logo_concepts insert (raster):', insertError);
          } else if (concept) {
            concepts.push(concept);
          }
        }
      } catch (genError: unknown) {
        console.error(`Generation ${i + 1} (${modelConfig.replicate}) failed:`, genError);
        const msg = genError instanceof Error ? genError.message : String(genError);
        lastFailure = msg;
        if (msg.includes('402') || msg.includes('Insufficient credit')) {
          return Response.json(
            { error: 'Replicate account has insufficient credit. Add a payment method at replicate.com/account/billing.' },
            { status: 402 },
          );
        }
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid token')) {
          return Response.json(
            { error: 'Replicate API rejected the request. Check that REPLICATE_API_TOKEN is valid.' },
            { status: 401 },
          );
        }
        /* Rate limits: keep lastFailure and continue batch so partial successes still return 200. */
      }
    }

    if (concepts.length === 0) {
      if (isReplicateRateLimited({ message: lastFailure })) {
        return Response.json(
          {
            error:
              'Logo generation hit Replicate rate limits before any concept could be saved. Wait a minute, increase billing credit, or try a different model.',
            details: lastFailure,
            retryAfter: extractRetryAfterSeconds({ message: lastFailure } as Error) ?? undefined,
          },
          { status: 429 },
        );
      }
      return Response.json(
        {
          error: 'Logo generation did not produce any saved concepts.',
          details: lastFailure,
        },
        { status: 500 },
      );
    }

    return Response.json({ concepts });
  } catch (err) {
    console.error('Generate route error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
