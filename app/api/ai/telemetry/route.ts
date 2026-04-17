import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { recordTelemetry, type CopilotTelemetryEvent } from '@/lib/copilot/telemetry';

/**
 * POST /api/ai/telemetry  body: { event, agentId?, agentVersion?, module?,
 *                                 pathname?, cardId?, durationMs?, metadata? }
 *
 * Records a Copilot usage event for the current user. Telemetry must never
 * break the user flow; failures are swallowed and the route returns 200.
 *
 * The route accepts a single event or an array of events for batched
 * client-side flushing.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const body = await request.json().catch(() => null);
  if (!body) return jsonResponse({ error: 'Invalid JSON' }, 400);

  const events = Array.isArray(body) ? body : [body];
  let accepted = 0;

  for (const ev of events) {
    if (!ev || typeof ev !== 'object' || typeof ev.event !== 'string') continue;
    const result = await recordTelemetry(supabase, {
      userId: user.id,
      companyId: profile?.company_id ?? null,
      eventName: ev.event as CopilotTelemetryEvent,
      agentId: ev.agentId,
      agentVersion: ev.agentVersion,
      module: ev.module,
      pathname: ev.pathname,
      cardId: ev.cardId,
      durationMs: ev.durationMs,
      metadata: ev.metadata,
    });
    if (result.ok) accepted += 1;
  }

  return jsonResponse({ accepted, total: events.length }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
