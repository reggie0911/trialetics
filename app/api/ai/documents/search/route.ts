import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { searchChunks } from '@/lib/copilot/documents';
import { embedTexts } from '@/lib/copilot/ingest/embeddings';

export const runtime = 'nodejs';

/**
 * POST /api/ai/documents/search
 *   { query: string, documentIds?: string[], matchCount?: number }
 *
 * Returns the most relevant chunks across the company's documents,
 * embedding the query on the fly and using `match_copilot_chunks`
 * (pgvector cosine distance) under the hood.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      query?: string;
      documentIds?: string[];
      matchCount?: number;
    } | null;

    if (!body?.query || body.query.trim().length === 0) {
      return json({ error: 'query is required' }, 400);
    }

    const [embedding] = await embedTexts([body.query.slice(0, 4000)]);
    if (!embedding) return json({ error: 'Embed failed' }, 500);

    const matches = await searchChunks(supabase, {
      companyId: profile.company_id,
      queryEmbedding: embedding,
      matchCount: Math.max(1, Math.min(body.matchCount ?? 8, 25)),
      documentIds: body.documentIds && body.documentIds.length > 0 ? body.documentIds : null,
    });

    return json({ matches }, 200);
  } catch (err) {
    console.error('POST /api/ai/documents/search failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
