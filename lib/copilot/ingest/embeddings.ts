import 'server-only';

import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

/**
 * Embedding helper used by the Phase 6 ingest pipeline.
 *
 * Defaults to `text-embedding-3-small` (1536 dimensions) to match the
 * `vector(1536)` column in `copilot_document_chunks`. Override with
 * `OPENAI_EMBED_MODEL` if you need to swap to `-large` (3072) — but that
 * requires a coordinated migration.
 */

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';

const BATCH_SIZE = 64;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBED_MODEL),
      values: batch,
    });
    out.push(...embeddings);
  }
  return out;
}
