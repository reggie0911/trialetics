import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { cacheKey, cached } from '@/lib/copilot/cache';
import { buildContextInsights } from '@/lib/copilot/insight-builder';
import { isToolAllowedForRole } from '@/lib/ai/role-allowlist';
import type { ActionChipPayload } from '@/lib/ai/types';

/**
 * GET /api/ai/actions?page=...&studyId=...
 *
 * Returns Phase 2 action chips scoped to the current page. Chips the user's
 * role can't run are filtered server-side (defense in depth — the UI hides
 * them too via `requiredRole`).
 *
 * Phase 2 reuses the same heuristic builder as `/api/ai/insights` for
 * locality; later phases can split if the action surface grows.
 *
 * POST is intentionally not implemented in Phase 2. Action execution still
 * goes through the existing `/api/ai/chat` orchestrator with the `agentId`
 * + tool name from the chip payload — that's the audit trail we want.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = profile?.role ?? 'user';
    const url = new URL(request.url);
    const page = url.searchParams.get('page') ?? '/protected';
    const studyId = url.searchParams.get('studyId');
    const siteId = url.searchParams.get('siteId');
    const subjectId = url.searchParams.get('subjectId');

    const ctx = {
      module: deriveModule(page),
      pathname: page,
      userId: user.id,
      userRole: role,
      companyId: profile?.company_id ?? null,
      studyId,
      siteId,
      subjectId,
    };

    const { value, cached: wasCached, generatedAt } = await cached(
      cacheKey('actions', {
        page,
        studyId,
        siteId,
        subjectId,
        userId: user.id,
        role,
      }),
      () => buildContextInsights(ctx)
    );

    const visible: ActionChipPayload[] = value.actions.filter(chip =>
      isToolAllowedForRole(role, chip.tool)
    );

    return jsonResponse(
      {
        actions: visible,
        agentIds: value.agentIds,
        cached: wasCached,
        generatedAt,
      },
      200
    );
  } catch (err) {
    console.error('GET /api/ai/actions failed', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function deriveModule(page: string): string {
  if (page.startsWith('/protected/studies/')) return 'study';
  if (page === '/protected' || page === '/protected/') return 'dashboard';
  const parts = page.split('/').filter(Boolean);
  return parts[1] ?? 'general';
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
