import 'server-only';

import type { ExtractedDocument, ExtractedSection } from './extractors';

/**
 * Smart chunker for extracted documents.
 *
 * Goals:
 *   - keep sections (page / slide / sheet) intact whenever possible
 *   - split long sections by paragraph boundary, fall back to ~target tokens
 *   - never produce a chunk smaller than ~50 tokens unless the whole section is small
 *
 * Token estimate is char-count / 4 — close enough for OpenAI tokenization
 * for the chunk-sizing decisions we need to make here.
 */

export interface DocumentChunk {
  ordinal: number;
  kind: ExtractedSection['kind'];
  content: string;
  structured?: Record<string, unknown>;
  pageOrSlide?: number;
  sheetName?: string;
  tokenEstimate: number;
}

const TARGET_TOKENS = 1500;
const MAX_TOKENS = 2000;
const MIN_TOKENS = 50;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitByParagraph(content: string): string[] {
  return content
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean);
}

function packParagraphs(paragraphs: string[]): string[] {
  const out: string[] = [];
  let current = '';
  let currentTokens = 0;

  for (const p of paragraphs) {
    const pTokens = estimateTokens(p);
    if (pTokens >= MAX_TOKENS) {
      // Single paragraph too big — hard-split.
      if (current) {
        out.push(current);
        current = '';
        currentTokens = 0;
      }
      const hardChunks = hardSplit(p, MAX_TOKENS * 4);
      out.push(...hardChunks);
      continue;
    }
    if (currentTokens + pTokens > TARGET_TOKENS && currentTokens >= MIN_TOKENS) {
      out.push(current);
      current = p;
      currentTokens = pTokens;
    } else {
      current = current ? `${current}\n\n${p}` : p;
      currentTokens += pTokens;
    }
  }
  if (current) out.push(current);
  return out;
}

function hardSplit(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    out.push(text.slice(i, i + maxChars));
  }
  return out;
}

export function chunkDocument(doc: ExtractedDocument): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let ordinal = 0;

  for (const section of doc.sections) {
    const sectionTokens = estimateTokens(section.content);

    if (sectionTokens <= TARGET_TOKENS) {
      chunks.push({
        ordinal: ordinal++,
        kind: section.kind,
        content: section.content,
        structured: section.structured,
        pageOrSlide: section.pageOrSlide,
        sheetName: section.sheetName,
        tokenEstimate: sectionTokens,
      });
      continue;
    }

    const packed = packParagraphs(splitByParagraph(section.content));
    for (let i = 0; i < packed.length; i++) {
      chunks.push({
        ordinal: ordinal++,
        kind: section.kind,
        content: packed[i],
        // Only attach structured payload to the first chunk to avoid duplicating large objects.
        structured: i === 0 ? section.structured : undefined,
        pageOrSlide: section.pageOrSlide,
        sheetName: section.sheetName,
        tokenEstimate: estimateTokens(packed[i]),
      });
    }
  }

  return chunks;
}
