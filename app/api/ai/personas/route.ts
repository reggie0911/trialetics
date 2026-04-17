import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  activatePersona,
  listPersonas,
  upsertPersona,
  type CopilotTone,
  type CopilotUnits,
} from '@/lib/copilot/personas';

/**
 * GET   /api/ai/personas                         → list personas (materializes default)
 * POST  /api/ai/personas  { ...persona }         → upsert
 * PATCH /api/ai/personas  { activate: '<id>' }   → switch active persona
 */
export async function GET() {
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

    const personas = await listPersonas(supabase, user.id, profile.company_id);
    return json({ personas }, 200);
  } catch (err) {
    console.error('GET /api/ai/personas failed', err);
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
      id?: string;
      name?: string;
      isActive?: boolean;
      role?: string | null;
      tone?: CopilotTone;
      timezone?: string | null;
      units?: CopilotUnits;
      guardrails?: string[];
      preferredAgents?: string[];
      metadata?: Record<string, unknown>;
    } | null;
    if (!body?.name) return json({ error: 'name is required' }, 400);

    const persona = await upsertPersona(supabase, {
      id: body.id,
      userId: user.id,
      companyId: profile.company_id,
      name: body.name.slice(0, 100),
      isActive: body.isActive,
      role: body.role,
      tone: body.tone,
      timezone: body.timezone,
      units: body.units,
      guardrails: body.guardrails,
      preferredAgents: body.preferredAgents,
      metadata: body.metadata,
    });
    if (!persona) return json({ error: 'Failed to save persona' }, 500);
    return json({ persona }, 200);
  } catch (err) {
    console.error('POST /api/ai/personas failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = (await request.json().catch(() => null)) as { activate?: string } | null;
    if (!body?.activate) return json({ error: 'activate is required' }, 400);

    const persona = await activatePersona(supabase, body.activate, user.id, profile.company_id);
    if (!persona) return json({ error: 'Activation failed' }, 404);
    return json({ persona }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/personas failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
