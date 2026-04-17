import { randomUUID } from 'crypto';

import {
  buildSourceSignature,
  mapHeaders,
  scoreToConfidence,
  type MapperTarget,
  normalizeHeader,
} from './field-mapper';
import type { FieldDescriptor } from './schema-introspector';
import { describeSchema, flattenFields } from './schema-introspector';
import { compileDynamicSchema, describeDynamicFields, type DynamicFieldDefinition } from './dynamic-schema';
import { getCopilotForm } from '@/lib/copilot/form-registry';
import type { TableUpdatePayload, TableRowProposal, CardConfidence } from '@/lib/ai/types';

/**
 * Deterministic builder for `table_update` payloads.
 *
 * Inputs: a parsed table (headers + rows), a target schema (form id or
 * dynamic field list), and an optional cached mapping. Output: a fully
 * formed `TableUpdatePayload` ready to ship through the orchestrator stream
 * or to render directly in `<TableUpdateGrid />`.
 *
 * The builder is *deterministic* — it does no LLM calls. The `table-mapper`
 * agent uses this to assemble the final payload after it (optionally) calls
 * the LLM for ambiguous mappings.
 */

export interface ParsedTable {
  headers: string[];
  rows: Record<string, unknown>[];
  /** Original document the table came from, if any. */
  sourceDocumentId?: string;
  /** doc_type label feeding the cache signature. */
  docType?: string;
}

export interface BuildTableUpdateOptions {
  tableId: string;
  tableLabel?: string;
  agentId: string;
  agentVersion?: string;
  scope?: TableUpdatePayload['scope'];

  /** Either a registered form id or an explicit dynamic field list. */
  targetFormId?: string;
  dynamicFields?: DynamicFieldDefinition[];

  /** Pre-existing rows in the destination — used to detect duplicates. */
  existingRows?: { id: string; values: Record<string, unknown> }[];
  /** Field path used as the natural key for dedup (e.g., `email`, `site_number`). */
  duplicateKey?: string;

  /** Optional cached mapping from `copilot_field_mappings`. */
  cachedMapping?: Record<string, { fieldPath: string }>;

  /** Cap on how many rows to include in the proposal. */
  maxRows?: number;
}

function targetsFromForm(formId: string): MapperTarget[] {
  const registration = getCopilotForm(formId);
  if (!registration) return [];
  const descriptor = describeSchema(registration.schema);
  const leaves = flattenFields(descriptor);
  const hintsByPath = new Map<string, { label?: string; synonyms?: string[] }>();
  for (const hint of registration.hints ?? []) {
    hintsByPath.set(hint.path, { label: hint.label, synonyms: hint.synonyms });
  }
  return leaves.map<MapperTarget>(leaf => {
    const hint = hintsByPath.get(leaf.path);
    return {
      field: leaf,
      label: hint?.label ?? leaf.path,
      hints: hint?.synonyms,
    };
  });
}

function targetsFromDynamic(fields: DynamicFieldDefinition[]): MapperTarget[] {
  const descriptors = describeDynamicFields(fields);
  return descriptors.map<MapperTarget>((d: FieldDescriptor) => {
    const original = fields.find(f => f.key === d.path);
    return { field: d, label: original?.label, hints: original?.hints };
  });
}

/**
 * Build a `table_update` payload from a parsed source table.
 */
export function buildTableUpdate(
  parsed: ParsedTable,
  options: BuildTableUpdateOptions
): TableUpdatePayload {
  const targets: MapperTarget[] = options.targetFormId
    ? targetsFromForm(options.targetFormId)
    : options.dynamicFields
      ? targetsFromDynamic(options.dynamicFields)
      : [];

  const mapping = mapHeaders(parsed.headers, targets, options.cachedMapping);

  // Build per-source-column → target field for assembling row values.
  const columnToField: Record<string, { fieldPath: string; confidence: CardConfidence }> = {};
  for (const [column, candidate] of Object.entries(mapping.mapping)) {
    if (!candidate) continue;
    columnToField[column] = {
      fieldPath: candidate.fieldPath,
      confidence: scoreToConfidence(candidate.score),
    };
  }

  const limit = Math.min(parsed.rows.length, options.maxRows ?? 200);
  const ops: TableRowProposal[] = [];
  let conflictCount = 0;

  // For duplicate detection, build a lookup over existing rows on the
  // duplicate key (normalized for resilience).
  const existingByKey = new Map<string, { id: string; values: Record<string, unknown> }>();
  if (options.duplicateKey && options.existingRows) {
    for (const row of options.existingRows) {
      const key = row.values?.[options.duplicateKey];
      if (key != null) existingByKey.set(normalizeHeader(String(key)), row);
    }
  }

  for (let i = 0; i < limit; i += 1) {
    const sourceRow = parsed.rows[i];
    const values: Record<string, unknown> = {};
    const fieldConfidence: Record<string, CardConfidence> = {};

    for (const [column, value] of Object.entries(sourceRow)) {
      const target = columnToField[column];
      if (!target) continue;
      values[target.fieldPath] = value;
      fieldConfidence[target.fieldPath] = target.confidence;
    }

    let conflictWith: TableRowProposal['conflictWith'] | undefined;
    let op: TableRowProposal['op'] = 'insert';

    if (options.duplicateKey) {
      const keyValue = values[options.duplicateKey];
      if (keyValue != null) {
        const match = existingByKey.get(normalizeHeader(String(keyValue)));
        if (match) {
          op = 'update';
          conflictWith = { id: match.id, preview: match.values };
          conflictCount += 1;
        }
      }
    }

    // Row-level confidence is the median of field confidences (low-leaning
    // when we lost coverage).
    const confidenceLevels = Object.values(fieldConfidence);
    const rowConfidence: CardConfidence = computeRowConfidence(confidenceLevels, parsed.headers.length, Object.keys(values).length);

    ops.push({
      op,
      match: op === 'update' && conflictWith ? { [options.duplicateKey!]: values[options.duplicateKey!] as string } : undefined,
      values,
      confidence: rowConfidence,
      fieldConfidence,
      conflictWith,
      sources: parsed.sourceDocumentId
        ? [
            {
              id: parsed.sourceDocumentId,
              label: `Row ${i + 2}`, // +2 to account for 1-indexed + header row
              kind: 'document',
            },
          ]
        : undefined,
    });
  }

  const payload: TableUpdatePayload = {
    id: randomUUID(),
    tableId: options.tableId,
    tableLabel: options.tableLabel,
    agentId: options.agentId,
    agentVersion: options.agentVersion,
    ops,
    mapping: Object.fromEntries(
      Object.entries(columnToField).map(([k, v]) => [k, { fieldPath: v.fieldPath, confidence: v.confidence }])
    ),
    conflictCount: conflictCount === 0 ? undefined : conflictCount,
    scope: options.scope,
    sourceDocumentIds: parsed.sourceDocumentId ? [parsed.sourceDocumentId] : undefined,
    generatedAt: new Date().toISOString(),
  };

  return payload;
}

function computeRowConfidence(
  fieldLevels: CardConfidence[],
  totalSourceColumns: number,
  mappedFieldCount: number
): CardConfidence {
  if (fieldLevels.length === 0) return 'low';
  const coverage = totalSourceColumns === 0 ? 0 : mappedFieldCount / totalSourceColumns;
  // Median field confidence
  const score = scoreFromLevels(fieldLevels);
  const adjusted = score * (0.6 + coverage * 0.4);
  if (adjusted >= 0.85) return 'high';
  if (adjusted >= 0.6) return 'medium';
  return 'low';
}

function scoreFromLevels(levels: CardConfidence[]): number {
  const map: Record<CardConfidence, number> = { high: 0.95, medium: 0.75, low: 0.5 };
  const sum = levels.reduce((acc, l) => acc + map[l], 0);
  return sum / levels.length;
}

export { buildSourceSignature };
