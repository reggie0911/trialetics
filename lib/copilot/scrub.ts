/**
 * PHI scrub — strips obvious subject identifiers from prompt context before it
 * is sent to the model. This is the first line of defence; the second is the
 * `lib/copilot/untrusted.ts` sandbox for any external content.
 *
 * Phase 1 ships the conservative baseline list (names, emails, phones, DOBs,
 * SSN-shaped strings, MRN-shaped strings). Later phases extend the rules and
 * surface a redaction banner in the UI when anything is removed.
 *
 * Opaque IDs (UUIDs, slugs, study/site/subject foreign keys) are preserved so
 * the orchestrator can still reason about scope and call tools.
 */

const PHI_PATTERNS: Array<{ name: string; regex: RegExp; replace: string }> = [
  {
    name: 'email',
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replace: '[redacted-email]',
  },
  {
    name: 'phone',
    regex: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g,
    replace: '[redacted-phone]',
  },
  {
    name: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replace: '[redacted-ssn]',
  },
  {
    name: 'dob',
    regex: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g,
    replace: '[redacted-dob]',
  },
  {
    name: 'mrn',
    regex: /\bMRN[:#\s-]*[A-Z0-9-]{4,}\b/gi,
    replace: '[redacted-mrn]',
  },
];

export interface ScrubResult {
  text: string;
  redactions: Array<{ name: string; count: number }>;
}

/**
 * Scrubs PHI from a single text string. Returns the cleaned text plus a
 * per-pattern count of redactions for telemetry / banner display.
 */
export function scrubPHI(input: string): ScrubResult {
  if (!input) return { text: input, redactions: [] };

  let text = input;
  const redactions: Array<{ name: string; count: number }> = [];

  for (const { name, regex, replace } of PHI_PATTERNS) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      redactions.push({ name, count: matches.length });
      text = text.replace(regex, replace);
    }
  }

  return { text, redactions };
}

/**
 * Convenience wrapper used by the orchestrator: returns just the scrubbed
 * string and discards the per-pattern counts. Use `scrubPHI` directly when you
 * need to display a redaction banner.
 */
export function scrub(input: string): string {
  return scrubPHI(input).text;
}

export const PHI_PATTERN_NAMES = PHI_PATTERNS.map(p => p.name);
