import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { updateItemStatus, type WorkQueueItemStatus } from '@/lib/copilot/work-queues';

/**
 * PATCH /api/ai/queues/items/[itemId]
 *   { status: 'open' | 'snoozed' | 'done' | 'dismissed', snoozeUntil?, reason? }
 */
interface RouteContext {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const { itemId } = await ctx.params;
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
      status?: WorkQueueItemStatus;
      snoozeUntil?: string;
      reason?: string;
    } | null;
    if (!body?.status) return json({ error: 'status is required' }, 400);

    const updated = await updateItemStatus(supabase, {
      itemId,
      userId: user.id,
      companyId: profile.company_id,
      status: body.status,
      snoozeUntil: body.snoozeUntil,
      reason: body.reason,
    });
    if (!updated) return json({ error: 'Update failed' }, 409);
    return json({ item: updated }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/queues/items/[itemId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
