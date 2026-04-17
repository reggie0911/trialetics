import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { addItem, listItems, listQueues, type WorkQueueItemKind, type WorkQueueItemStatus } from '@/lib/copilot/work-queues';

/**
 * GET  /api/ai/queues                                 → all queues + items
 * GET  /api/ai/queues?queueId=...                     → items in a queue
 * POST /api/ai/queues  { queueId, kind, title, body?, payload?, dueAt? }   → add an item
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const queueId = url.searchParams.get('queueId');
    const statusParam = url.searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as WorkQueueItemStatus[]) : undefined;

    const queues = await listQueues(supabase, user.id, profile.company_id);
    if (queueId) {
      const items = await listItems(supabase, user.id, { queueId, status, limit: 200 });
      return json({ queues, items, queueId }, 200);
    }
    const items = await listItems(supabase, user.id, { status, limit: 200 });
    return json({ queues, items }, 200);
  } catch (err) {
    console.error('GET /api/ai/queues failed', err);
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
      queueId?: string;
      kind?: WorkQueueItemKind;
      title?: string;
      body?: string;
      payload?: Record<string, unknown>;
      agentId?: string;
      agentVersion?: string;
      dueAt?: string;
    } | null;
    if (!body?.queueId || !body?.kind || !body?.title) {
      return json({ error: 'queueId, kind, and title are required' }, 400);
    }

    const item = await addItem(supabase, {
      queueId: body.queueId,
      userId: user.id,
      companyId: profile.company_id,
      kind: body.kind,
      title: body.title.slice(0, 200),
      body: body.body,
      payload: body.payload,
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      dueAt: body.dueAt,
    });

    if (!item) return json({ error: 'Failed to add item' }, 500);
    return json({ item }, 201);
  } catch (err) {
    console.error('POST /api/ai/queues failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
