import { z } from 'zod';

import { getValueAtPath, setValueAtPath } from './apply-fill';
import { listRequiredPaths, describeSchema } from './schema-introspector';
import type { FieldDescriptor } from './schema-introspector';
import type { FormFieldProposal } from '@/lib/ai/types';

/**
 * Validation for proposed fills before they reach the form.
 *
 * Three concerns:
 *   1. Type-coercion against the descriptor (e.g., enum membership).
 *   2. Required-field tracking — what would still be empty after the fill?
 *   3. Cross-field rules (registered per-form: "required if X equals Y").
 *
 * Type-coercion is intentionally permissive: when a proposed value parses
 * cleanly we keep it; when it doesn't we drop the proposal rather than
 * refuse the whole fill. The agent is steered toward types via the system
 * prompt, but real-world inputs are messy and we'd rather degrade than fail.
 */

export interface ValidationResult {
  /** Proposals that passed type-coercion. */
  acceptedProposals: FormFieldProposal[];
  /** Proposals dropped because they didn't match the field's expected shape. */
  rejectedProposals: { proposal: FormFieldProposal; reason: string }[];
  /** Required field paths that would still be empty after applying the fill. */
  missingRequired: string[];
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function findDescriptor(root: FieldDescriptor, path: string): FieldDescriptor | undefined {
  if (root.path === path) return root;
  if (root.kind === 'object' && root.children) {
    for (const child of root.children) {
      const found = findDescriptor(child, path);
      if (found) return found;
    }
  }
  if (root.kind === 'array' && root.itemSchema) {
    // Array items are addressed via numeric segment in the path; we drop the
    // index and resolve the item schema for type checks.
    const stripped = path.replace(/\.\d+(?=\.|$)/, '');
    if (stripped === root.path) return root.itemSchema;
    const found = findDescriptor(root.itemSchema, path.slice(root.path.length + 1).replace(/^\d+\.?/, ''));
    if (found) return found;
  }
  return undefined;
}

function coerceForKind(value: unknown, descriptor: FieldDescriptor): { ok: true; value: unknown } | { ok: false; reason: string } {
  switch (descriptor.kind) {
    case 'string':
      if (value == null) return { ok: true, value: '' };
      if (typeof value === 'string' || typeof value === 'number') {
        return { ok: true, value: String(value) };
      }
      return { ok: false, reason: 'expected string' };
    case 'number': {
      if (value == null || value === '') return { ok: true, value: undefined };
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(num)) return { ok: true, value: num };
      return { ok: false, reason: 'expected number' };
    }
    case 'boolean':
      if (typeof value === 'boolean') return { ok: true, value };
      if (value === 'true') return { ok: true, value: true };
      if (value === 'false') return { ok: true, value: false };
      return { ok: false, reason: 'expected boolean' };
    case 'date':
      // The app stores ISO date strings — accept anything Date can parse.
      if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
        return { ok: true, value };
      }
      if (value instanceof Date) return { ok: true, value: value.toISOString() };
      return { ok: false, reason: 'expected ISO date string' };
    case 'enum': {
      const allowed = descriptor.enumValues ?? [];
      const stringValue = typeof value === 'string' ? value : String(value ?? '');
      if (allowed.length === 0) return { ok: true, value: stringValue };
      if (allowed.includes(stringValue)) return { ok: true, value: stringValue };
      return { ok: false, reason: `expected one of: ${allowed.join(', ')}` };
    }
    case 'array':
    case 'object':
    case 'unknown':
      return { ok: true, value };
    default:
      return { ok: true, value };
  }
}

/**
 * Validate a list of proposals against the form's Zod schema. Returns the
 * cleaned proposals plus the required-field gap.
 */
export function validateProposals<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  currentValues: unknown,
  proposals: FormFieldProposal[]
): ValidationResult {
  const descriptor = describeSchema(schema);
  const accepted: FormFieldProposal[] = [];
  const rejected: { proposal: FormFieldProposal; reason: string }[] = [];

  for (const proposal of proposals) {
    const fieldDescriptor = findDescriptor(descriptor, proposal.path);
    if (!fieldDescriptor) {
      // Unknown path — keep but flag low-confidence; the form will simply
      // ignore it on submit if RHF doesn't know about it.
      accepted.push(proposal);
      continue;
    }
    const coerced = coerceForKind(proposal.value, fieldDescriptor);
    if (!coerced.ok) {
      rejected.push({ proposal, reason: coerced.reason });
      continue;
    }
    accepted.push({ ...proposal, value: coerced.value });
  }

  // Compute "what would still be empty" after applying the accepted set.
  let projected = currentValues;
  for (const proposal of accepted) {
    projected = setValueAtPath(projected, proposal.path, proposal.value);
  }

  const requiredPaths = listRequiredPaths(descriptor);
  const missingRequired = requiredPaths.filter(path => isEmpty(getValueAtPath(projected, path)));

  return { acceptedProposals: accepted, rejectedProposals: rejected, missingRequired };
}

/**
 * Cross-field rule helper. Each rule is a predicate on the projected values
 * that returns an error message string or `null` if it passes.
 */
export type CrossFieldRule = (values: unknown) => string | null;

export function runCrossFieldRules(values: unknown, rules: CrossFieldRule[]): string[] {
  const messages: string[] = [];
  for (const rule of rules) {
    const result = rule(values);
    if (result) messages.push(result);
  }
  return messages;
}
