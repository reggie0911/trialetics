import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { getDocument, linkDocumentTo } from '@/lib/copilot/documents';

export const runtime = 'nodejs';

/**
 * GET    /api/ai/documents/[documentId]
 *   Returns the document + chunks (paginated by ordinal). Used by the
 *   document detail page.
 *
 * POST   /api/ai/documents/[documentId]
 *   { action: 'link', linkKind, linkId, metadata? }   — attach a CTMS reference
 *
 * DELETE /api/ai/documents/[documentId]
 *   Soft-delete (sets deleted_at).
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ documentId: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { documentId } = await ctx.params;
    const result = await getDocument(supabase, documentId);
    if (!result) return json({ error: 'Not found' }, 404);

    return json(result, 200);
  } catch (err) {
    console.error('GET /api/ai/documents/[id] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ documentId: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { documentId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      linkKind?: string;
      linkId?: string;
      metadata?: Record<string, unknown>;
    } | null;

    if (body?.action !== 'link' || !body.linkKind || !body.linkId) {
      return json({ error: 'Expected { action: "link", linkKind, linkId }' }, 400);
    }

    const ok = await linkDocumentTo(supabase, {
      documentId,
      linkKind: body.linkKind,
      linkId: body.linkId,
      metadata: body.metadata ?? {},
    });
    if (!ok) return json({ error: 'Link failed' }, 500);

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('POST /api/ai/documents/[id] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ documentId: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { documentId } = await ctx.params;
    const { error } = await supabase
      .from('copilot_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('DELETE /api/ai/documents/[id] failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
