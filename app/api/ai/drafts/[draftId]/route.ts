import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import {
  getDraft,
  updateDraftBody,
  signDraft,
  setDraftStatus,
  type DraftStatus,
} from '@/lib/copilot/drafts';

/**
 * GET    /api/ai/drafts/[draftId]                      → draft + version history
 * PATCH  /api/ai/drafts/[draftId]   { body, reason }   → push new version
 * POST   /api/ai/drafts/[draftId]   { action: 'sign' | 'approve' | 'reject' | 'discard' | 'in_review', reason?, method? }
 */

interface RouteContext {
  params: Promise<{ draftId: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { draftId } = await ctx.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const result = await getDraft(supabase, draftId, user.id);
    if (!result) return json({ error: 'Not found' }, 404);
    return json(result, 200);
  } catch (err) {
    console.error('GET /api/ai/drafts/[draftId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const { draftId } = await ctx.params;
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
      body?: string;
      reason?: string;
      agentId?: string;
      agentVersion?: string;
    } | null;
    if (!body?.body) return json({ error: 'body is required' }, 400);

    const version = await updateDraftBody(supabase, {
      draftId,
      userId: user.id,
      companyId: profile.company_id,
      body: body.body,
      reason: body.reason,
      agentId: body.agentId,
      agentVersion: body.agentVersion,
    });
    if (!version) return json({ error: 'Cannot update (draft is signed or not yours)' }, 409);
    return json({ version }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/drafts/[draftId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { draftId } = await ctx.params;
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
      action?: 'sign' | 'approve' | 'reject' | 'discard' | 'in_review' | 'draft';
      reason?: string;
      method?: 'password' | 'sso' | 'webauthn';
    } | null;
    if (!body?.action) return json({ error: 'action is required' }, 400);

    if (body.action === 'sign') {
      if (!body.reason?.trim()) return json({ error: 'reason is required to sign' }, 400);
      try {
        const signed = await signDraft(supabase, {
          draftId,
          userId: user.id,
          companyId: profile.company_id,
          reason: body.reason,
          method: body.method,
        });
        if (!signed) return json({ error: 'Sign failed' }, 409);
        return json({ draft: signed }, 200);
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Sign failed' }, 400);
      }
    }

    const next = body.action as Exclude<DraftStatus, 'signed'>;
    const updated = await setDraftStatus(supabase, {
      draftId,
      userId: user.id,
      companyId: profile.company_id,
      status: next,
      reason: body.reason,
    });
    if (!updated) return json({ error: 'Status change failed' }, 409);
    return json({ draft: updated }, 200);
  } catch (err) {
    console.error('POST /api/ai/drafts/[draftId] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
