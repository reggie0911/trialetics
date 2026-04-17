import type { FieldDescriptor } from './schema-introspector';
import type { CardConfidence } from '@/lib/ai/types';

/**
 * Source-column → target-field mapping for table imports and form fills.
 *
 * Three-tier strategy:
 *   1. Exact / fuzzy header match against field labels and registered hints.
 *   2. Cached pattern from `copilot_field_mappings` keyed by (company, sourceSignature, target).
 *   3. LLM fallback handed off to `table-mapper` agent.
 *
 * This module owns tiers 1 and 2 (deterministic, cheap). Tier 3 lives in the
 * `table-mapper` agent and only runs when the deterministic match drops
 * below a confidence threshold.
 */

export interface MappingCandidate {
  fieldPath: string;
  fieldLabel?: string;
  /** A score in [0, 1]. */
  score: number;
  reason: 'exact' | 'normalized' | 'hint' | 'token' | 'cached';
}

export interface MappingResult {
  /** sourceColumn → best mapping (may be undefined when nothing matched). */
  mapping: Record<string, MappingCandidate | undefined>;
  /** Coverage = mapped sources / total sources. */
  coverage: number;
}

/** Normalize a header / label for comparison: lowercase, alphanumeric only. */
export function normalizeHeader(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tokenSet(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(token => token.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MapperTarget {
  /** Field descriptor (path, kind, etc.). */
  field: FieldDescriptor;
  /** Optional human label for the field. */
  label?: string;
  /** Free-text hints registered for this field. */
  hints?: string[];
}

/**
 * Match a single source header against the available targets.
 *
 * Returns the best candidate or undefined when no plausible match.
 */
export function matchHeader(source: string, targets: MapperTarget[]): MappingCandidate | undefined {
  const sourceNormalized = normalizeHeader(source);
  if (!sourceNormalized) return undefined;
  const sourceTokens = tokenSet(source);

  let best: MappingCandidate | undefined;

  for (const target of targets) {
    const targetLabel = target.label ?? target.field.path;
    const labelNormalized = normalizeHeader(targetLabel);
    const pathNormalized = normalizeHeader(target.field.path);

    // 1. Exact or normalized match on the label or the path.
    if (labelNormalized && labelNormalized === sourceNormalized) {
      return { fieldPath: target.field.path, fieldLabel: target.label, score: 0.99, reason: 'exact' };
    }
    if (pathNormalized && pathNormalized === sourceNormalized) {
      return { fieldPath: target.field.path, fieldLabel: target.label, score: 0.95, reason: 'exact' };
    }

    // 2. Hint-driven match (registry hints are domain-specific synonyms).
    for (const hint of target.hints ?? []) {
      if (normalizeHeader(hint) === sourceNormalized) {
        const candidate = {
          fieldPath: target.field.path,
          fieldLabel: target.label,
          score: 0.92,
          reason: 'hint' as const,
        };
        if (!best || candidate.score > best.score) best = candidate;
      }
    }

    // 3. Substring on the label.
    if (
      labelNormalized &&
      (labelNormalized.includes(sourceNormalized) || sourceNormalized.includes(labelNormalized))
    ) {
      const candidate = {
        fieldPath: target.field.path,
        fieldLabel: target.label,
        score: 0.78,
        reason: 'normalized' as const,
      };
      if (!best || candidate.score > best.score) best = candidate;
    }

    // 4. Token Jaccard similarity for multi-word headers / labels.
    const targetTokens = tokenSet(targetLabel);
    const j = jaccard(sourceTokens, targetTokens);
    if (j >= 0.5) {
      const candidate = {
        fieldPath: target.field.path,
        fieldLabel: target.label,
        score: 0.55 + j * 0.4, // 0.75–0.95 band
        reason: 'token' as const,
      };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

/**
 * Map every source column against the available targets.
 *
 * `existingMapping` lets callers pre-seed cached mappings (tier 2) — exact
 * matches in the cache always win over heuristic matches.
 */
export function mapHeaders(
  sourceColumns: string[],
  targets: MapperTarget[],
  existingMapping?: Record<string, { fieldPath: string }>
): MappingResult {
  const mapping: Record<string, MappingCandidate | undefined> = {};
  let mapped = 0;

  for (const column of sourceColumns) {
    const cached = existingMapping?.[column];
    if (cached) {
      const targetField = targets.find(t => t.field.path === cached.fieldPath);
      if (targetField) {
        mapping[column] = {
          fieldPath: cached.fieldPath,
          fieldLabel: targetField.label,
          score: 0.97,
          reason: 'cached',
        };
        mapped += 1;
        continue;
      }
    }

    const candidate = matchHeader(column, targets);
    mapping[column] = candidate;
    if (candidate) mapped += 1;
  }

  return { mapping, coverage: sourceColumns.length === 0 ? 0 : mapped / sourceColumns.length };
}

/**
 * Convert a numeric mapping score to the user-facing confidence pill used
 * everywhere else in the Copilot.
 */
export function scoreToConfidence(score: number): CardConfidence {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}

/**
 * Build the deterministic source signature for the cache lookup. Stable
 * regardless of column order so the user can re-export their roster with
 * the columns shuffled and we still hit the cache.
 */
export function buildSourceSignature(columns: string[], docType?: string): string {
  const normalized = columns.map(normalizeHeader).filter(Boolean).sort();
  return `${docType ?? 'any'}::${normalized.join(',')}`;
}
