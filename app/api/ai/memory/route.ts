import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { getMemory, setMemory, deleteMemory } from '@/lib/copilot/memory';

/**
 * GET /api/ai/memory?scope=...&key=...
 *   Returns the user's memory entries.
 *
 * POST /api/ai/memory  body: { scope?, key, value, source?, agentId?, reason? }
 *   Upserts a memory entry. `source` defaults to 'user' when invoked via this
 *   route (it's user-initiated). Agents that need to write memory go through
 *   the `setCopilotMemory` tool, which already records audit + sets
 *   `source='agent'`.
 *
 * DELETE /api/ai/memory?id=...
 *   Deletes a memory entry by id.
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') ?? undefined;
  const key = url.searchParams.get('key') ?? undefined;

  const entries = await getMemory(supabase, { userId: user.id, scope, key });
  return jsonResponse({ entries }, 200);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return jsonResponse({ error: 'No company context' }, 400);

  const body = (await request.json().catch(() => ({}))) as {
    scope?: string;
    key?: string;
    value?: unknown;
    source?: 'agent' | 'user';
    agentId?: string;
    reason?: string;
  };

  if (!body.key || body.value === undefined) {
    return jsonResponse({ error: 'key and value are required' }, 400);
  }

  const result = await setMemory(supabase, {
    userId: user.id,
    companyId: profile.company_id,
    scope: body.scope,
    key: body.key,
    value: body.value,
    source: body.source ?? 'user',
    agentId: body.agentId,
    reason: body.reason,
  });

  if (!result.ok) return jsonResponse({ error: result.error ?? 'Failed' }, 500);
  return jsonResponse({ entry: result.entry }, 200);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return jsonResponse({ error: 'No company context' }, 400);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const reason = url.searchParams.get('reason') ?? undefined;
  if (!id) return jsonResponse({ error: 'id is required' }, 400);

  const result = await deleteMemory(supabase, {
    userId: user.id,
    companyId: profile.company_id,
    id,
    reason,
  });

  if (!result.ok) return jsonResponse({ error: result.error ?? 'Failed' }, 500);
  return jsonResponse({ ok: true }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
