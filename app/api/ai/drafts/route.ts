import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { createDraft, listDrafts, type DraftKind, type DraftStatus } from '@/lib/copilot/drafts';

/**
 * GET  /api/ai/drafts?status=draft,in_review
 * POST /api/ai/drafts        body: { kind, title, body, scopeKind?, scopeId?, agentId?, metadata? }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200));

    const drafts = await listDrafts(supabase, user.id, {
      status: statusParam ? (statusParam.split(',') as DraftStatus[]) : undefined,
      limit,
    });
    return json({ drafts }, 200);
  } catch (err) {
    console.error('GET /api/ai/drafts failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      kind?: DraftKind;
      title?: string;
      body?: string;
      scopeKind?: string;
      scopeId?: string;
      agentId?: string;
      metadata?: Record<string, unknown>;
    } | null;

    if (!body?.kind || !body.title || !body.body) {
      return json({ error: 'kind, title, and body are required' }, 400);
    }

    const draft = await createDraft(supabase, {
      companyId: profile.company_id,
      userId: user.id,
      kind: body.kind,
      title: body.title.slice(0, 200),
      body: body.body,
      scopeKind: body.scopeKind ?? null,
      scopeId: body.scopeId ?? null,
      metadata: body.metadata ?? {},
      agentId: body.agentId ?? 'draft-author',
    });

    if (!draft) return json({ error: 'Failed to create draft' }, 500);
    return json({ draft }, 201);
  } catch (err) {
    console.error('POST /api/ai/drafts failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
