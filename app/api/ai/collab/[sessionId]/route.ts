import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  appendCollabMessage,
  closeCollabSession,
  getCollabSession,
  type CollabRole,
} from '@/lib/copilot/collab';

/**
 * GET   /api/ai/collab/[sessionId]                          → session + messages
 * POST  /api/ai/collab/[sessionId]  { role, content, agentId?, payload? }
 * DELETE /api/ai/collab/[sessionId]                          → close session
 */
interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const result = await getCollabSession(supabase, sessionId, user.id);
    if (!result) return json({ error: 'Not found' }, 404);
    return json(result, 200);
  } catch (err) {
    console.error('GET /api/ai/collab/[sessionId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
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
      role?: CollabRole;
      content?: string;
      agentId?: string;
      agentVersion?: string;
      payload?: Record<string, unknown>;
    } | null;
    if (!body?.role || !body.content) {
      return json({ error: 'role and content are required' }, 400);
    }

    const message = await appendCollabMessage(supabase, {
      sessionId,
      userId: user.id,
      companyId: profile.company_id,
      role: body.role,
      content: body.content,
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      payload: body.payload,
    });
    if (!message) return json({ error: 'Failed to append message' }, 500);
    return json({ message }, 201);
  } catch (err) {
    console.error('POST /api/ai/collab/[sessionId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const closed = await closeCollabSession(supabase, sessionId, user.id, profile.company_id);
    if (!closed) return json({ error: 'Failed to close session' }, 404);
    return json({ session: closed }, 200);
  } catch (err) {
    console.error('DELETE /api/ai/collab/[sessionId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
