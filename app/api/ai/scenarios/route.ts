import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  parseScenarioPrompt,
  runScenario,
  type ScenarioInputs,
} from '@/lib/copilot/scenario-builder';
import { recordAudit } from '@/lib/copilot/audit';

/**
 * GET  /api/ai/scenarios               -> list saved scenarios for current user
 * POST /api/ai/scenarios body: { prompt?, inputs?, save?: boolean, name?, studyId? }
 *      -> run a scenario; optionally persist
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data, error } = await supabase
      .from('copilot_scenarios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return json({ error: error.message }, 500);
    return json({ scenarios: data ?? [] }, 200);
  } catch (err) {
    console.error('GET /api/ai/scenarios failed', err);
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

    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      inputs?: ScenarioInputs;
      save?: boolean;
      name?: string;
      studyId?: string | null;
    };

    if (!body.prompt && !body.inputs) {
      return json({ error: 'Provide prompt or inputs' }, 400);
    }

    const inputs: ScenarioInputs = body.inputs ?? parseScenarioPrompt(body.prompt!);
    const projection = runScenario(inputs);

    let savedId: string | null = null;
    if (body.save) {
      const { data: inserted, error: insErr } = await supabase
        .from('copilot_scenarios')
        .insert({
          company_id: profile.company_id,
          user_id: user.id,
          study_id: body.studyId ?? null,
          name: body.name?.trim() || `Scenario · ${new Date().toLocaleString()}`,
          prompt: body.prompt ?? inputs.prompt,
          inputs: inputs as unknown as object,
          projection: projection as unknown as object,
        })
        .select('id')
        .single();
      if (!insErr && inserted) {
        savedId = inserted.id as string;
        await recordAudit(supabase, {
          userId: user.id,
          companyId: profile.company_id,
          agentId: 'scenario-modeler',
          agentVersion: '1.0.0',
          action: 'scenario_saved',
          resourceKind: 'copilot_scenario',
          resourceId: savedId,
          details: { kind: inputs.kind, magnitude: inputs.magnitude ?? null },
        });
      }
    }

    return json({ projection, savedId }, 200);
  } catch (err) {
    console.error('POST /api/ai/scenarios failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
