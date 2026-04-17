import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  generateBriefing,
  loadTodayBriefing,
  markBriefingRead,
  persistBriefing,
} from '@/lib/copilot/briefing-builder';
import { recordAudit } from '@/lib/copilot/audit';

/**
 * GET /api/ai/briefing
 *   Returns today's Morning Briefing for the current user. Generates and
 *   persists if missing. Pass `?refresh=1` to force regeneration.
 *
 * POST /api/ai/briefing  body: { action: 'mark_read' }
 *   Marks today's briefing as read (sets `read_at`).
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.company_id) return jsonResponse({ error: 'No company context' }, 400);

    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === '1';

    const existing = refresh ? null : await loadTodayBriefing(supabase, user.id);
    if (existing) {
      return jsonResponse({ briefing: existing, generated: false }, 200);
    }

    const fresh = await generateBriefing({
      userId: user.id,
      userRole: profile.role ?? 'user',
      companyId: profile.company_id,
    });

    const persisted = await persistBriefing(supabase, fresh, { refresh });
    if (!persisted) {
      return jsonResponse({ error: 'Failed to persist briefing' }, 500);
    }

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'briefing-curator',
      agentVersion: '1.0.0',
      action: 'briefing_generated',
      resourceKind: 'copilot_briefing',
      resourceId: persisted.id ?? undefined,
      details: { itemCount: persisted.items.length, refresh },
    });

    return jsonResponse({ briefing: persisted, generated: true }, 200);
  } catch (err) {
    console.error('GET /api/ai/briefing failed', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== 'mark_read') {
      return jsonResponse({ error: 'Unknown action' }, 400);
    }

    const briefing = await loadTodayBriefing(supabase, user.id);
    if (!briefing?.id) return jsonResponse({ ok: true, noop: true }, 200);

    await markBriefingRead(supabase, briefing.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile?.company_id ?? null,
      agentId: 'briefing-curator',
      agentVersion: '1.0.0',
      action: 'briefing_read',
      resourceKind: 'copilot_briefing',
      resourceId: briefing.id,
    });

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('POST /api/ai/briefing failed', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
