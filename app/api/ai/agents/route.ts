import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { findAgentIdForPage, getAllAgents } from '@/lib/ai/agents';
import { cacheKey, cached } from '@/lib/copilot/cache';
import type { AgentCardPayload } from '@/lib/ai/types';

/**
 * GET /api/ai/agents?page=/protected/studies/{id}
 *
 * Returns the full registry decorated with Phase 2 metadata so the Agents
 * tab and Insights surfaces can render `AgentCardPayload` cards directly.
 *
 * - `recommended: true` is set on whichever agent `findAgentIdForPage`
 *   selects for the supplied `page` (when present).
 * - `recommendationReason` is a short string used by the "Why this?" popover.
 *
 * Cached server-side for 5 minutes per `(page)` key — the registry is
 * effectively static within a process so this is overwhelmingly a memoization
 * layer that lets `/api/ai/insights` and `/api/ai/actions` reuse the result
 * without rebuilding agent metadata on every fan-out.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(request.url);
    const page = url.searchParams.get('page') ?? '/protected';

    const { value, cached: wasCached, generatedAt } = await cached(
      cacheKey('agents', { page }),
      async () => {
        const agents = await getAllAgents();
        const recommendedId = findAgentIdForPage(page);
        const items: AgentCardPayload[] = agents.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          recommended: a.id === recommendedId,
          recommendationReason:
            a.id === recommendedId
              ? `Best fit for the current page based on the URL prefix and the agent's declared module context.`
              : undefined,
          moduleContext: a.moduleContext,
          agentVersion: a.version ?? '1.0.0',
        }));
        items.sort((x, y) => {
          if (x.recommended !== y.recommended) return x.recommended ? -1 : 1;
          return x.name.localeCompare(y.name);
        });
        return { items, recommendedId };
      }
    );

    return jsonResponse(
      {
        agents: value.items,
        recommendedId: value.recommendedId,
        cached: wasCached,
        generatedAt,
      },
      200
    );
  } catch (err) {
    console.error('GET /api/ai/agents failed', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
