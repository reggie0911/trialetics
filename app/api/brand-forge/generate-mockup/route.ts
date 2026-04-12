import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { randomUUID } from 'crypto';

import {
  MOCKUP_LOGO_CONDITIONED_MODEL,
  MOCKUP_TEXT_TO_IMAGE_MODEL,
  resolveMockupPromptContext,
} from '@/lib/brand-forge/mockup-prompt';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
  const asString = urlLikeToString(output);
  if (asString) return asString;
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

function extractRetryAfterSeconds(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/"retry_after"\s*:\s*(\d+)/i);
  if (m) return Math.min(120, Math.max(1, parseInt(m[1], 10)));
  return null;
}

function isReplicateRateLimited(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('429') || msg.includes('too many requests') || msg.includes('throttled') || msg.includes('rate limit');
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
      console.warn(`[brand-forge/generate-mockup] Rate limited, waiting ${wait + 1}s (retry ${attempt + 1}/${opts.maxRetries})`);
      await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
    }
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN?.trim()) {
      return Response.json(
        { error: 'Image generation is not configured. Add REPLICATE_API_TOKEN to your server environment.' },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
    if (!profile?.company_id) return Response.json({ error: 'No company found' }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string;
      mockupType?: string;
      customHint?: string;
      promptOverride?: string;
      referenceConceptId?: string;
    };
    const { projectId, mockupType, customHint, promptOverride, referenceConceptId } = body;

    if (!projectId || !mockupType) {
      return Response.json({ error: 'projectId and mockupType are required' }, { status: 400 });
    }

    const resolved = await resolveMockupPromptContext(supabase, {
      companyId: profile.company_id,
      projectId,
      mockupType,
      customHint,
      promptOverride: promptOverride?.trim() ? promptOverride : undefined,
      referenceConceptId: referenceConceptId?.trim() || null,
    });

    if (!resolved.ok) {
      return Response.json({ error: resolved.error }, { status: resolved.status });
    }

    const {
      prompt,
      hintTrimmed,
      usesPrimaryLogo,
      primaryLogoImageUrl,
      aspectRatio,
    } = resolved;

    const promptOverrideUsed = !!(promptOverride && promptOverride.trim());

    console.info(
      JSON.stringify({
        scope: 'brand-forge/generate-mockup',
        mockupType,
        usesPrimaryLogo,
        promptOverrideUsed,
        referenceConceptId: referenceConceptId?.trim() || null,
        promptLength: prompt.length,
      }),
    );

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });

    const modelRef = (usesPrimaryLogo ? MOCKUP_LOGO_CONDITIONED_MODEL : MOCKUP_TEXT_TO_IMAGE_MODEL) as `${string}/${string}`;
    const modelInput: Record<string, unknown> = usesPrimaryLogo
      ? {
          input_image: primaryLogoImageUrl,
          prompt,
          aspect_ratio: aspectRatio,
        }
      : {
          prompt,
          aspect_ratio: aspectRatio,
        };

    const output = await runReplicateWithThrottleRetry(replicate, modelRef, modelInput, { maxRetries: 2 });

    const outputUrl = resolveOutputUrl(output);
    if (!outputUrl) return Response.json({ error: 'Mockup generation returned no output' }, { status: 500 });

    const response = await fetch(outputUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const fileId = randomUUID();
    const storagePath = `${profile.company_id}/${projectId}/mockups/${fileId}.png`;

    await supabase.storage.from('brandforge-assets').upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('bf_mockups')
      .insert({
        project_id: projectId,
        mockup_type: mockupType,
        storage_path: storagePath,
        prompt,
        custom_hint: hintTrimmed,
      })
      .select()
      .single();

    if (insertError || !inserted?.id) {
      console.error('[brand-forge/generate-mockup] DB insert error:', insertError?.message ?? 'no row returned');
      await supabase.storage.from('brandforge-assets').remove([storagePath]).catch(() => undefined);
      return Response.json(
        {
          error:
            insertError?.message
            ?? 'Could not save the mockup to the database. Check that the bf_mockups migration is applied and RLS allows insert.',
        },
        { status: 500 },
      );
    }

    const { data: signedUrl } = await supabase.storage
      .from('brandforge-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24);

    return Response.json({
      id: inserted.id,
      mockupType,
      storagePath,
      url: signedUrl?.signedUrl ?? null,
      prompt,
      customHint: hintTrimmed,
    });
  } catch (err) {
    console.error('Mockup generation error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
