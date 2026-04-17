import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { advancePlaybookStep } from '@/lib/copilot/playbook-runner';

/**
 * POST /api/ai/playbooks/:runId
 *   body: { stepIndex, outcome: 'completed' | 'skipped' | 'blocked', note?, reason? }
 *   Advances a single step in a playbook run. Each call writes an audit entry.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
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
      stepIndex?: number;
      outcome?: 'completed' | 'skipped' | 'blocked';
      note?: string;
      reason?: string;
    };

    if (typeof body.stepIndex !== 'number' || !body.outcome) {
      return json({ error: 'stepIndex and outcome required' }, 400);
    }

    const run = await advancePlaybookStep(supabase, {
      companyId: profile.company_id,
      userId: user.id,
      runId,
      stepIndex: body.stepIndex,
      outcome: body.outcome,
      note: body.note,
      reason: body.reason,
    });
    if (!run) return json({ error: 'Could not advance step' }, 500);

    return json({ run }, 200);
  } catch (err) {
    console.error('POST /api/ai/playbooks/[runId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
