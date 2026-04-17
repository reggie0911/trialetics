import 'server-only';

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';
import type { ClassificationResult, DocType } from './ingest/classifier';
import { classifyDocument } from './ingest/classifier';
import type { DocumentChunk } from './ingest/chunker';
import { chunkDocument } from './ingest/chunker';
import { embedTexts } from './ingest/embeddings';
import type { ExtractInput } from './ingest/extractors';
import { extractDocument } from './ingest/extractors';

/**
 * High-level Copilot Document service.
 *
 * `ingestDocument` runs the full Phase 6 pipeline:
 *
 *   1. Hash the buffer (sha256) — used for dedupe + tamper evidence
 *   2. Insert a `copilot_documents` row with status='extracting'
 *   3. Extract sections + plain text
 *   4. Classify (heuristic)
 *   5. Chunk (paragraph-aware)
 *   6. Embed each chunk via OpenAI
 *   7. Insert `copilot_document_chunks` (with embeddings)
 *   8. Update doc status='ready'
 *   9. Audit log
 *
 * Failures at any step transition the document to status='failed' so the
 * UI can surface a retry button.
 */

export type DocumentStatus = 'pending' | 'extracting' | 'ready' | 'failed';

export interface CopilotDocumentRecord {
  id: string;
  companyId: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string | null;
  studyId: string | null;
  siteId: string | null;
  subjectId: string | null;
  docType: DocType;
  docTypeConfidence: number;
  classifierSignals: Record<string, unknown>;
  status: DocumentStatus;
  statusMessage: string | null;
  metadata: Record<string, unknown>;
  warnings: string[];
  agentId: string;
  agentVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface CopilotDocumentChunkRecord {
  id: string;
  documentId: string;
  ordinal: number;
  kind: string;
  content: string;
  structured: Record<string, unknown> | null;
  pageOrSlide: number | null;
  sheetName: string | null;
  tokenEstimate: number;
}

function rowToDocument(row: Record<string, unknown>): CopilotDocumentRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    filename: row.filename as string,
    mimeType: (row.mime_type as string) ?? '',
    sizeBytes: (row.size_bytes as number) ?? 0,
    sha256: (row.sha256 as string) ?? '',
    storagePath: (row.storage_path as string | null) ?? null,
    studyId: (row.study_id as string | null) ?? null,
    siteId: (row.site_id as string | null) ?? null,
    subjectId: (row.subject_id as string | null) ?? null,
    docType: (row.doc_type as DocType) ?? 'unknown',
    docTypeConfidence: Number(row.doc_type_confidence ?? 0),
    classifierSignals: ((row.classifier_signals as Record<string, unknown> | null) ?? {}),
    status: (row.status as DocumentStatus) ?? 'pending',
    statusMessage: (row.status_message as string | null) ?? null,
    metadata: ((row.metadata as Record<string, unknown> | null) ?? {}),
    warnings: ((row.warnings as string[] | null) ?? []),
    agentId: (row.agent_id as string) ?? 'document-router',
    agentVersion: (row.agent_version as string) ?? '1.0.0',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToChunk(row: Record<string, unknown>): CopilotDocumentChunkRecord {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    ordinal: row.ordinal as number,
    kind: (row.kind as string) ?? 'text',
    content: row.content as string,
    structured: ((row.structured as Record<string, unknown> | null) ?? null),
    pageOrSlide: (row.page_or_slide as number | null) ?? null,
    sheetName: (row.sheet_name as string | null) ?? null,
    tokenEstimate: (row.token_estimate as number) ?? 0,
  };
}

export interface IngestDocumentParams extends ExtractInput {
  companyId: string;
  userId: string;
  studyId?: string | null;
  siteId?: string | null;
  subjectId?: string | null;
  storagePath?: string | null;
  agentId?: string;
  agentVersion?: string;
  /** Skip embedding step (e.g., for offline/test runs). */
  skipEmbeddings?: boolean;
}

export interface IngestDocumentResult {
  document: CopilotDocumentRecord;
  classification: ClassificationResult;
  chunks: DocumentChunk[];
  chunkRowIds: string[];
}

export async function ingestDocument(
  supabase: SupabaseClient,
  params: IngestDocumentParams
): Promise<IngestDocumentResult | null> {
  const sha256 = createHash('sha256').update(params.buffer).digest('hex');
  const agentId = params.agentId ?? 'document-router';
  const agentVersion = params.agentVersion ?? '1.0.0';

  // 1. Insert pending row
  const { data: docRow, error: docErr } = await supabase
    .from('copilot_documents')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      filename: params.filename,
      mime_type: params.mimeType,
      size_bytes: params.buffer.byteLength,
      sha256,
      storage_path: params.storagePath ?? null,
      study_id: params.studyId ?? null,
      site_id: params.siteId ?? null,
      subject_id: params.subjectId ?? null,
      doc_type: 'unknown',
      doc_type_confidence: 0,
      classifier_signals: {},
      status: 'extracting',
      metadata: {},
      warnings: [],
      agent_id: agentId,
      agent_version: agentVersion,
    })
    .select('*')
    .single();

  if (docErr || !docRow) {
    console.warn('[copilot/documents] insert failed', docErr?.message);
    return null;
  }

  const documentId = docRow.id as string;

  try {
    // 2. Extract
    const extracted = await extractDocument(params);

    // 3. Classify
    const classification = classifyDocument(params.filename, extracted);

    // 4. Chunk
    const chunks = chunkDocument(extracted);

    // 5. Embed (best-effort — failures still allow text-only documents)
    let embeddings: number[][] = [];
    if (!params.skipEmbeddings && chunks.length > 0) {
      try {
        embeddings = await embedTexts(chunks.map(c => c.content));
      } catch (err) {
        extracted.warnings.push(
          `Embedding failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // 6. Insert chunks
    const chunkRowIds: string[] = [];
    if (chunks.length > 0) {
      const { data: chunkRows, error: chunkErr } = await supabase
        .from('copilot_document_chunks')
        .insert(
          chunks.map((c, i) => ({
            document_id: documentId,
            ordinal: c.ordinal,
            kind: c.kind,
            content: c.content,
            structured: c.structured ?? null,
            page_or_slide: c.pageOrSlide ?? null,
            sheet_name: c.sheetName ?? null,
            token_estimate: c.tokenEstimate,
            embedding: embeddings[i] ? `[${embeddings[i].join(',')}]` : null,
          }))
        )
        .select('id');
      if (chunkErr) {
        extracted.warnings.push(`Chunk persist failed: ${chunkErr.message}`);
      } else if (chunkRows) {
        for (const row of chunkRows) chunkRowIds.push((row as { id: string }).id);
      }
    }

    // 7. Mark ready
    const { data: readyRow, error: updErr } = await supabase
      .from('copilot_documents')
      .update({
        status: 'ready',
        status_message: null,
        doc_type: classification.docType,
        doc_type_confidence: classification.confidence,
        classifier_signals: classification.signals,
        metadata: extracted.metadata,
        warnings: extracted.warnings,
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (updErr || !readyRow) {
      console.warn('[copilot/documents] mark ready failed', updErr?.message);
    }

    await recordAudit(supabase, {
      userId: params.userId,
      companyId: params.companyId,
      agentId,
      agentVersion,
      action: 'document_ingested',
      resourceKind: 'copilot_document',
      resourceId: documentId,
      details: {
        filename: params.filename,
        sha256,
        docType: classification.docType,
        docTypeConfidence: classification.confidence,
        chunks: chunks.length,
        embeddings: embeddings.length,
        warnings: extracted.warnings,
      },
    });

    return {
      document: rowToDocument(readyRow ?? docRow),
      classification,
      chunks,
      chunkRowIds,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from('copilot_documents')
      .update({ status: 'failed', status_message: msg })
      .eq('id', documentId);
    await recordAudit(supabase, {
      userId: params.userId,
      companyId: params.companyId,
      agentId,
      agentVersion,
      action: 'document_ingest_failed',
      resourceKind: 'copilot_document',
      resourceId: documentId,
      details: { filename: params.filename, error: msg },
    });
    return null;
  }
}

export async function listDocuments(
  supabase: SupabaseClient,
  params: { companyId: string; userId: string; studyId?: string | null; limit?: number }
): Promise<CopilotDocumentRecord[]> {
  let query = supabase
    .from('copilot_documents')
    .select('*')
    .eq('company_id', params.companyId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);
  if (params.studyId) query = query.eq('study_id', params.studyId);

  const { data, error } = await query;
  if (error) {
    console.warn('[copilot/documents] listDocuments failed', error.message);
    return [];
  }
  return ((data as Record<string, unknown>[]) ?? []).map(rowToDocument);
}

export async function getDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<{ document: CopilotDocumentRecord; chunks: CopilotDocumentChunkRecord[] } | null> {
  const { data: docRow, error: docErr } = await supabase
    .from('copilot_documents')
    .select('*')
    .eq('id', documentId)
    .single();
  if (docErr || !docRow) return null;

  const { data: chunkRows } = await supabase
    .from('copilot_document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('ordinal', { ascending: true });

  return {
    document: rowToDocument(docRow as Record<string, unknown>),
    chunks: ((chunkRows as Record<string, unknown>[]) ?? []).map(rowToChunk),
  };
}

/**
 * Vector search across chunks for a given query, scoped by company.
 * Returns chunks ordered by cosine distance (smaller = closer).
 *
 * Falls back gracefully if pgvector / RPC isn't wired.
 */
export async function searchChunks(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    queryEmbedding: number[];
    matchCount?: number;
    documentIds?: string[] | null;
  }
): Promise<Array<CopilotDocumentChunkRecord & { distance?: number }>> {
  const matchCount = params.matchCount ?? 8;

  // Try the dedicated RPC first (defined in the migration as `match_copilot_chunks`).
  const { data, error } = await supabase.rpc('match_copilot_chunks', {
    p_company_id: params.companyId,
    p_query_embedding: `[${params.queryEmbedding.join(',')}]`,
    p_match_count: matchCount,
    p_document_ids: params.documentIds ?? null,
  });

  if (!error && Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map(row => ({
      ...rowToChunk(row),
      distance: typeof row.distance === 'number' ? row.distance : undefined,
    }));
  }

  // Fallback: just return most-recent chunks for visibility.
  const { data: chunks } = await supabase
    .from('copilot_document_chunks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(matchCount);
  return ((chunks as Record<string, unknown>[]) ?? []).map(rowToChunk);
}

export async function linkDocumentTo(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    linkKind: string;
    linkId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const { error } = await supabase.from('copilot_document_links').insert({
    document_id: params.documentId,
    link_kind: params.linkKind,
    link_id: params.linkId,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.warn('[copilot/documents] linkDocumentTo failed', error.message);
    return false;
  }
  return true;
}

export async function recordExtraction(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    fieldName: string;
    value: unknown;
    confidence: number;
    sourceChunkId?: string | null;
    extractor?: string;
  }
): Promise<boolean> {
  const { error } = await supabase.from('copilot_document_extractions').insert({
    document_id: params.documentId,
    field_name: params.fieldName,
    value: params.value as never,
    confidence: params.confidence,
    source_chunk_id: params.sourceChunkId ?? null,
    extractor: params.extractor ?? 'document-router',
    agent_version: '1.0.0',
  });
  if (error) {
    console.warn('[copilot/documents] recordExtraction failed', error.message);
    return false;
  }
  return true;
}
