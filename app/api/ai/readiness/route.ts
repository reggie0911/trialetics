import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { buildReadiness, persistReadiness, type ReadinessScopeKind } from '@/lib/copilot/readiness-builder';
import { recordAudit } from '@/lib/copilot/audit';

/**
 * GET  /api/ai/readiness?scope=portfolio[&id=]
 *      Returns the most recent readiness snapshot, regenerating if older than 1h
 *      or when `?refresh=1` is set.
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
    const scope = (url.searchParams.get('scope') ?? 'portfolio') as ReadinessScopeKind;
    const id = url.searchParams.get('id');
    const refresh = url.searchParams.get('refresh') === '1';

    if (!['study', 'site', 'portfolio'].includes(scope)) {
      return json({ error: 'Invalid scope' }, 400);
    }

    if (!refresh) {
      const { data: existing } = await supabase
        .from('copilot_readiness_snapshots')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('scope_kind', scope)
        .filter('scope_id', id ? 'eq' : 'is', id ?? null)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const ageMs = Date.now() - new Date(existing.generated_at).getTime();
        if (ageMs < 60 * 60 * 1000) {
          return json({ snapshot: rowToSnapshot(existing), generated: false }, 200);
        }
      }
    }

    const snapshot = await buildReadiness(supabase, {
      scopeKind: scope,
      scopeId: id ?? null,
      companyId: profile.company_id,
    });

    const persisted = await persistReadiness(supabase, profile.company_id, snapshot, user.id);

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'inspection-readiness',
      agentVersion: '1.0.0',
      action: 'readiness_generated',
      resourceKind: 'copilot_readiness_snapshot',
      resourceId: persisted.id ?? undefined,
      details: { scope, id, score: snapshot.score, grade: snapshot.grade, refresh },
    });

    return json({ snapshot, generated: true, snapshotId: persisted.id }, 200);
  } catch (err) {
    console.error('GET /api/ai/readiness failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function rowToSnapshot(row: Record<string, unknown>): unknown {
  return {
    scopeKind: row.scope_kind,
    scopeId: row.scope_id ?? null,
    score: row.score,
    grade: row.grade,
    factors: row.breakdown ?? [],
    recommendations: row.recommendations ?? [],
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    generatedAt: row.generated_at,
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
