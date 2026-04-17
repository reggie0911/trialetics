import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { buildReportSpec } from '@/lib/copilot/nl-report-builder';
import { recordAudit } from '@/lib/copilot/audit';

/**
 * GET  /api/ai/reports                  -> list saved NL report definitions
 * POST /api/ai/reports body: { prompt, save?: boolean, name? }
 *      -> parse a NL prompt into a structured spec; optionally persist
 * DELETE /api/ai/reports?id=...         -> delete a saved definition
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data, error } = await supabase
      .from('copilot_report_definitions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(40);

    if (error) return json({ error: error.message }, 500);
    return json({ definitions: data ?? [] }, 200);
  } catch (err) {
    console.error('GET /api/ai/reports failed', err);
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
      save?: boolean;
      name?: string;
    };
    if (!body.prompt?.trim()) return json({ error: 'prompt required' }, 400);

    const spec = buildReportSpec(body.prompt);

    let savedId: string | null = null;
    if (body.save) {
      const { data: inserted, error: insErr } = await supabase
        .from('copilot_report_definitions')
        .insert({
          company_id: profile.company_id,
          user_id: user.id,
          name: body.name?.trim() || spec.headline.slice(0, 80),
          prompt: body.prompt,
          spec: spec as unknown as object,
        })
        .select('id')
        .single();
      if (!insErr && inserted) {
        savedId = inserted.id as string;
        await recordAudit(supabase, {
          userId: user.id,
          companyId: profile.company_id,
          agentId: 'nl-report-builder',
          agentVersion: '1.0.0',
          action: 'report_definition_saved',
          resourceKind: 'copilot_report_definition',
          resourceId: savedId,
          details: { entity: spec.entity, chart: spec.chart },
        });
      }
    }

    return json({ spec, savedId }, 200);
  } catch (err) {
    console.error('POST /api/ai/reports failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);

    const { error } = await supabase
      .from('copilot_report_definitions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('DELETE /api/ai/reports failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
