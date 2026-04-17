import type { FormFieldProposal } from '@/lib/ai/types';

/**
 * Safe value setter for `react-hook-form` integration.
 *
 * The form-bridge UI accepts a partial proposal (subset of fields the user
 * approved) and walks the existing form values + the chosen proposals,
 * computing a structured diff. The actual `setValue` calls happen in the
 * client component (`<FormFillCard />`) — this module owns the deterministic
 * pieces (path resolution, diff calculation, dirty-field tracking).
 */

/** Read a dot-path value from a nested object, supporting numeric indices. */
export function getValueAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cursor: unknown = obj;
  for (const segment of path.split('.')) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      const idx = Number(segment);
      cursor = Number.isInteger(idx) ? cursor[idx] : undefined;
    } else if (typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return cursor;
}

/** Immutably set a dot-path value on a nested object — returns a new copy. */
export function setValueAtPath<T>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const segments = path.split('.');
  const root: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? [...(obj as unknown[])]
    : { ...((obj as Record<string, unknown>) ?? {}) };

  let cursor: Record<string, unknown> | unknown[] = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const isArrayIndex = Number.isInteger(Number(segment));
    const next = (cursor as Record<string, unknown>)[segment];
    let nextNode: Record<string, unknown> | unknown[];
    if (Array.isArray(next)) {
      nextNode = [...next];
    } else if (next && typeof next === 'object') {
      nextNode = { ...(next as Record<string, unknown>) };
    } else {
      nextNode = isArrayIndex && Number.isInteger(Number(segments[i + 1])) ? [] : {};
    }
    (cursor as Record<string, unknown>)[segment] = nextNode;
    cursor = nextNode;
  }
  (cursor as Record<string, unknown>)[segments[segments.length - 1]] = value;
  return root as T;
}

export interface FillDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
  /** True when the existing value differs from the proposed value. */
  changed: boolean;
  /** True when the existing value is empty (null / undefined / ''). */
  wasEmpty: boolean;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * Diff a set of proposals against the current form values. Used by
 * `<FormFillCard />` to render the side-by-side comparison and by the audit
 * writer to record per-field before/after values.
 */
export function diffProposals<T>(
  current: T,
  proposals: FormFieldProposal[]
): FillDiffEntry[] {
  return proposals.map(proposal => {
    const before = getValueAtPath(current, proposal.path);
    return {
      path: proposal.path,
      before,
      after: proposal.value,
      changed: !valuesEqual(before, proposal.value),
      wasEmpty: isEmpty(before),
    };
  });
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Build the next form-values object given an "accept set" of field paths.
 * Unselected paths are skipped, preserving any user edits.
 */
export function applyAccepted<T>(
  current: T,
  proposals: FormFieldProposal[],
  acceptedPaths: ReadonlySet<string>
): T {
  let next = current;
  for (const proposal of proposals) {
    if (!acceptedPaths.has(proposal.path)) continue;
    next = setValueAtPath(next, proposal.path, proposal.value);
  }
  return next;
}

/**
 * Compute the list of dot-paths that were AI-touched and not yet saved —
 * used to render the `--copilot-accent` left-border highlight on the form.
 */
export function dirtyAiPaths<T>(
  current: T,
  proposals: FormFieldProposal[],
  acceptedPaths: ReadonlySet<string>
): string[] {
  const out: string[] = [];
  for (const proposal of proposals) {
    if (!acceptedPaths.has(proposal.path)) continue;
    const before = getValueAtPath(current, proposal.path);
    if (!valuesEqual(before, proposal.value)) {
      out.push(proposal.path);
    }
  }
  return out;
}
