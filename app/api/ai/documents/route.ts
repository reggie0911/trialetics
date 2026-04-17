import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { ingestDocument, listDocuments } from '@/lib/copilot/documents';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * GET  /api/ai/documents?studyId=...&limit=...
 *   Lists Phase 6 ingested documents visible to the current user.
 *
 * POST /api/ai/documents
 *   multipart/form-data with one or more `files` plus optional
 *   `studyId`, `siteId`, `subjectId`. Each file is fully ingested
 *   (extract → classify → chunk → embed → persist) before responding.
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const studyId = url.searchParams.get('studyId');
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200));

    const documents = await listDocuments(supabase, {
      companyId: profile.company_id,
      userId: user.id,
      studyId,
      limit,
    });
    return json({ documents }, 200);
  } catch (err) {
    console.error('GET /api/ai/documents failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (files.length === 0) return json({ error: 'No files provided' }, 400);

    const studyId = (formData.get('studyId') as string | null) || null;
    const siteId = (formData.get('siteId') as string | null) || null;
    const subjectId = (formData.get('subjectId') as string | null) || null;

    const results: Array<{
      filename: string;
      ok: boolean;
      documentId?: string;
      docType?: string;
      docTypeConfidence?: number;
      chunks?: number;
      error?: string;
    }> = [];

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        results.push({ filename: file.name, ok: false, error: `File exceeds ${MAX_FILE_BYTES} bytes` });
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());

      const result = await ingestDocument(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        buffer,
        studyId,
        siteId,
        subjectId,
      });

      if (!result) {
        results.push({ filename: file.name, ok: false, error: 'Ingestion failed' });
        continue;
      }

      results.push({
        filename: file.name,
        ok: true,
        documentId: result.document.id,
        docType: result.classification.docType,
        docTypeConfidence: result.classification.confidence,
        chunks: result.chunks.length,
      });
    }

    return json({ results }, 201);
  } catch (err) {
    console.error('POST /api/ai/documents failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
