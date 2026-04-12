import { NextRequest } from 'next/server';

import { aspectRatioLabel, resolveMockupPromptContext } from '@/lib/brand-forge/mockup-prompt';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

function parsePreviewInput(searchParams: URLSearchParams | null, json: Record<string, unknown> | null) {
  const from = (key: string) => {
    const j = json?.[key];
    if (typeof j === 'string') return j;
    return searchParams?.get(key) ?? undefined;
  };
  return {
    projectId: from('projectId'),
    mockupType: from('mockupType'),
    customHint: from('customHint'),
    referenceConceptId: from('referenceConceptId'),
  };
}

async function handlePreview(request: NextRequest, json: Record<string, unknown> | null) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
  if (!profile?.company_id) return Response.json({ error: 'No company found' }, { status: 400 });

  const sp = request.nextUrl.searchParams;
  const { projectId, mockupType, customHint, referenceConceptId } = parsePreviewInput(sp, json);

  if (!projectId || !mockupType) {
    return Response.json({ error: 'projectId and mockupType are required' }, { status: 400 });
  }

  const resolved = await resolveMockupPromptContext(supabase, {
    companyId: profile.company_id,
    projectId,
    mockupType,
    customHint,
    referenceConceptId: referenceConceptId?.trim() || null,
  });

  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }

  return Response.json({
    prompt: resolved.prompt,
    mockupLabel: resolved.mockupLabel,
    aspectRatio: resolved.aspectRatio,
    aspectRatioLabel: aspectRatioLabel(resolved.aspectRatio),
    usesPrimaryLogo: resolved.usesPrimaryLogo,
    categoryLabel: resolved.categoryLabel,
  });
}

export async function GET(request: NextRequest) {
  return handlePreview(request, null);
}

export async function POST(request: NextRequest) {
  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return handlePreview(request, json);
}
