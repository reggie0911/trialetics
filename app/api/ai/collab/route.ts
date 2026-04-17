import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { createCollabSession, listCollabSessions } from '@/lib/copilot/collab';

/**
 * GET  /api/ai/collab                                   → list sessions
 * POST /api/ai/collab  { title, topic?, agentRoster, scopeKind?, scopeId? }
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const sessions = await listCollabSessions(supabase, user.id, { limit: 50 });
    return json({ sessions }, 200);
  } catch (err) {
    console.error('GET /api/ai/collab failed', err);
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
      title?: string;
      topic?: string;
      scopeKind?: string;
      scopeId?: string;
      coordinatorAgentId?: string;
      agentRoster?: Array<{ id: string; version?: string }>;
    } | null;

    if (!body?.title || !body?.agentRoster?.length) {
      return json({ error: 'title and agentRoster are required' }, 400);
    }

    const session = await createCollabSession(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      title: body.title.slice(0, 200),
      topic: body.topic,
      scopeKind: body.scopeKind,
      scopeId: body.scopeId,
      coordinatorAgentId: body.coordinatorAgentId ?? 'copilot-coordinator',
      agentRoster: body.agentRoster.map(a => ({ id: a.id, version: a.version ?? '1.0.0' })),
    });
    if (!session) return json({ error: 'Failed to create session' }, 500);
    return json({ session }, 201);
  } catch (err) {
    console.error('POST /api/ai/collab failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
