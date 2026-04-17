import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { cacheKey, cached } from '@/lib/copilot/cache';
import { buildContextInsights } from '@/lib/copilot/insight-builder';

/**
 * GET /api/ai/insights?page=...&studyId=...&siteId=...
 *
 * Returns Phase 2 structured insight + recommendation cards for the supplied
 * context. See `lib/copilot/insight-builder.ts` for why this is heuristic
 * rather than LLM-driven in this phase.
 *
 * Cached server-side for 5 minutes per `(page, studyId, siteId, subjectId,
 * userId, role)` so navigating around a study doesn't re-fan-out work.
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

    const url = new URL(request.url);
    const page = url.searchParams.get('page') ?? '/protected';
    const studyId = url.searchParams.get('studyId');
    const siteId = url.searchParams.get('siteId');
    const subjectId = url.searchParams.get('subjectId');

    const ctx = {
      module: deriveModule(page),
      pathname: page,
      userId: user.id,
      userRole: profile?.role ?? 'user',
      companyId: profile?.company_id ?? null,
      studyId,
      siteId,
      subjectId,
    };

    const { value, cached: wasCached, generatedAt } = await cached(
      cacheKey('insights', {
        page,
        studyId,
        siteId,
        subjectId,
        userId: user.id,
        role: ctx.userRole,
      }),
      () => buildContextInsights(ctx)
    );

    return jsonResponse(
      {
        insights: value.insights,
        recommendations: value.recommendations,
        agentIds: value.agentIds,
        cached: wasCached,
        generatedAt,
      },
      200
    );
  } catch (err) {
    console.error('GET /api/ai/insights failed', err);
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
