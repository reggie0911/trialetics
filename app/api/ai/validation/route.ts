import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  GOLDEN_CASES,
  listValidationRuns,
  persistValidation,
  runValidation,
} from '@/lib/copilot/validation-runner';

/**
 * GET  /api/ai/validation[?agentId=...]
 *      Returns recent validation runs (optionally filtered by agent), plus the
 *      golden case catalogue so the UI can render expectation rows even before
 *      a run has been persisted.
 *
 * POST /api/ai/validation body: { agentId, agentVersion, cachedOutputs? }
 *      Runs validation for one agent + version. Returns the summary and the
 *      persisted row ID.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const agentId = new URL(request.url).searchParams.get('agentId') ?? undefined;
    const runs = await listValidationRuns(supabase, agentId);

    const stripEvaluator = (cases: typeof GOLDEN_CASES[string]) =>
      cases.map((c) => ({ id: c.id, description: c.description, expectation: c.expectation, prompt: c.prompt }));

    const cases = agentId
      ? { [agentId]: stripEvaluator(GOLDEN_CASES[agentId] ?? []) }
      : Object.fromEntries(
          Object.entries(GOLDEN_CASES).map(([k, v]) => [k, stripEvaluator(v)])
        );

    return json({ runs, cases }, 200);
  } catch (err) {
    console.error('GET /api/ai/validation failed', err);
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

    const body = (await request.json().catch(() => ({}))) as {
      agentId?: string;
      agentVersion?: string;
      cachedOutputs?: Record<string, string>;
    };
    if (!body.agentId || !body.agentVersion) {
      return json({ error: 'agentId and agentVersion required' }, 400);
    }

    const summary = runValidation({
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      cachedOutputs: body.cachedOutputs,
    });

    const persisted = await persistValidation(
      supabase,
      profile?.company_id ?? null,
      summary,
      user.id
    );

    return json({ summary, runId: persisted.id }, 200);
  } catch (err) {
    console.error('POST /api/ai/validation failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
