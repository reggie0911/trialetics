import { randomUUID } from 'crypto';

import { getCopilotForm } from '@/lib/copilot/form-registry';
import { describeSchema, flattenFields, listRequiredPaths } from './schema-introspector';
import {
  buildSourceSignature,
  mapHeaders,
  scoreToConfidence,
  type MapperTarget,
} from './field-mapper';
import { validateProposals } from './validators';
import type { CardConfidence, FormFillPayload, FormFieldProposal } from '@/lib/ai/types';

/**
 * Deterministic form-fill builder.
 *
 * Same idea as `table-builder.ts` but for single-record fills. Inputs are
 * either:
 *   - a parsed source row (from a spreadsheet) — heuristic header mapping;
 *   - a key-value extraction (from a document or LLM call).
 *
 * The builder validates each proposal against the registered Zod schema,
 * coerces types where it can, and returns the pruned `FormFillPayload`.
 */

export interface BuildFormFillOptions {
  schemaId: string;
  agentId: string;
  agentVersion?: string;
  scope?: FormFillPayload['scope'];
  /** Current form values to compute `missingRequired` against. */
  currentValues?: unknown;
  sourceDocumentIds?: string[];
}

interface ProposalSource {
  /** sourceColumnOrField → value */
  values: Record<string, unknown>;
  /** Optional rationale per source field. */
  rationales?: Record<string, string>;
  /** Optional confidence overrides (0..1). */
  confidences?: Record<string, number>;
}

function targetsForForm(schemaId: string): MapperTarget[] {
  const registration = getCopilotForm(schemaId);
  if (!registration) return [];
  const descriptor = describeSchema(registration.schema);
  const leaves = flattenFields(descriptor);
  const hintsByPath = new Map<string, { label?: string; synonyms?: string[] }>();
  for (const hint of registration.hints ?? []) {
    hintsByPath.set(hint.path, { label: hint.label, synonyms: hint.synonyms });
  }
  return leaves.map<MapperTarget>(leaf => {
    const hint = hintsByPath.get(leaf.path);
    return { field: leaf, label: hint?.label ?? leaf.path, hints: hint?.synonyms };
  });
}

/**
 * Map a parsed source row → form proposals via the heuristic mapper.
 * Used when the AI agent passes through a CSV row or extracted record.
 */
export function buildFormFillFromRow(
  row: ProposalSource,
  options: BuildFormFillOptions
): FormFillPayload | null {
  const registration = getCopilotForm(options.schemaId);
  if (!registration) return null;

  const targets = targetsForForm(options.schemaId);
  const sourceColumns = Object.keys(row.values);
  const mapping = mapHeaders(sourceColumns, targets);

  const proposals: FormFieldProposal[] = [];
  for (const [column, candidate] of Object.entries(mapping.mapping)) {
    if (!candidate) continue;
    const rawValue = row.values[column];
    if (rawValue == null || rawValue === '') continue;
    const confidence: CardConfidence =
      row.confidences?.[column] != null
        ? scoreToConfidence(row.confidences[column])
        : scoreToConfidence(candidate.score);

    proposals.push({
      path: candidate.fieldPath,
      label: candidate.fieldLabel,
      value: rawValue,
      rationale: row.rationales?.[column] ?? `Mapped from "${column}" (${candidate.reason}).`,
      confidence,
      requiresConfirmation: confidence === 'low' || registration.requiresESignature === true,
    });
  }

  const validation = validateProposals(registration.schema, options.currentValues ?? {}, proposals);

  return {
    id: randomUUID(),
    schemaId: options.schemaId,
    schemaLabel: registration.label,
    agentId: options.agentId,
    agentVersion: options.agentVersion,
    fields: validation.acceptedProposals,
    missingRequired: validation.missingRequired,
    scope: options.scope,
    sourceDocumentIds: options.sourceDocumentIds,
    requiresESignature: registration.requiresESignature,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build a form-fill from arbitrary key-value extractions where the keys
 * already match field paths (no mapping needed). Used by `template-completer`
 * and document-extraction pipelines.
 */
export function buildFormFillFromExtraction(
  extraction: Record<string, { value: unknown; confidence?: number; rationale?: string; sources?: FormFieldProposal['sources'] }>,
  options: BuildFormFillOptions
): FormFillPayload | null {
  const registration = getCopilotForm(options.schemaId);
  if (!registration) return null;

  const proposals: FormFieldProposal[] = Object.entries(extraction).map(([path, entry]) => {
    const confidence: CardConfidence = entry.confidence != null ? scoreToConfidence(entry.confidence) : 'medium';
    return {
      path,
      value: entry.value,
      rationale: entry.rationale,
      confidence,
      sources: entry.sources,
      requiresConfirmation: confidence === 'low' || registration.requiresESignature === true,
    };
  });

  const validation = validateProposals(registration.schema, options.currentValues ?? {}, proposals);

  return {
    id: randomUUID(),
    schemaId: options.schemaId,
    schemaLabel: registration.label,
    agentId: options.agentId,
    agentVersion: options.agentVersion,
    fields: validation.acceptedProposals,
    missingRequired: validation.missingRequired,
    scope: options.scope,
    sourceDocumentIds: options.sourceDocumentIds,
    requiresESignature: registration.requiresESignature,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Compute the set of required paths for a form id — used by the
 * field-suggester so it knows which fields to prioritize when surfacing
 * inline suggestions.
 */
export function requiredPathsForForm(schemaId: string): string[] {
  const registration = getCopilotForm(schemaId);
  if (!registration) return [];
  return listRequiredPaths(describeSchema(registration.schema));
}

export { buildSourceSignature };
