import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { findMapping, upsertMapping } from '@/lib/copilot/form-bridge/mapping-store';

/**
 * GET  /api/ai/field-mappings?sourceSignature=...&target=ctms.site-activation
 * POST /api/ai/field-mappings  body: { sourceSignature, targetFormId|targetTableId, mapping }
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
    const sourceSignature = url.searchParams.get('sourceSignature');
    const targetFormId = url.searchParams.get('targetFormId');
    const targetTableId = url.searchParams.get('targetTableId');
    if (!sourceSignature) return json({ error: 'sourceSignature is required' }, 400);

    const mapping = await findMapping(supabase, {
      companyId: profile.company_id,
      sourceSignature,
      targetFormId,
      targetTableId,
    });

    return json({ mapping }, 200);
  } catch (err) {
    console.error('GET /api/ai/field-mappings failed', err);
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
      sourceSignature?: string;
      targetFormId?: string;
      targetTableId?: string;
      mapping?: Record<string, { fieldPath: string; confidence?: number; transform?: string }>;
    } | null;

    if (!body?.sourceSignature || !body.mapping || (!body.targetFormId && !body.targetTableId)) {
      return json({ error: 'sourceSignature, mapping, and one of targetFormId/targetTableId are required' }, 400);
    }

    const mapping = await upsertMapping(supabase, {
      companyId: profile.company_id,
      userId: user.id,
      sourceSignature: body.sourceSignature,
      targetFormId: body.targetFormId,
      targetTableId: body.targetTableId,
      mapping: body.mapping,
    });

    if (!mapping) return json({ error: 'Failed to persist mapping' }, 500);
    return json({ mapping }, 200);
  } catch (err) {
    console.error('POST /api/ai/field-mappings failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
