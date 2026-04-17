import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  listPlaybooks,
  listPlaybookRuns,
  startPlaybookRun,
} from '@/lib/copilot/playbook-runner';

/**
 * GET  /api/ai/playbooks                -> list available playbook definitions + recent runs
 * POST /api/ai/playbooks  body: { playbookId, studyId?, siteId? }
 *      -> start a new run
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

    const [playbooks, runs] = await Promise.all([
      listPlaybooks(supabase, profile.company_id),
      listPlaybookRuns(supabase, profile.company_id, 10),
    ]);

    return json({ playbooks, runs }, 200);
  } catch (err) {
    console.error('GET /api/ai/playbooks failed', err);
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
      playbookId?: string;
      studyId?: string | null;
      siteId?: string | null;
    };
    if (!body.playbookId) return json({ error: 'playbookId required' }, 400);

    const run = await startPlaybookRun(supabase, {
      companyId: profile.company_id,
      userId: user.id,
      playbookId: body.playbookId,
      studyId: body.studyId ?? null,
      siteId: body.siteId ?? null,
    });
    if (!run) return json({ error: 'Could not start playbook run' }, 500);

    return json({ run }, 200);
  } catch (err) {
    console.error('POST /api/ai/playbooks failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
