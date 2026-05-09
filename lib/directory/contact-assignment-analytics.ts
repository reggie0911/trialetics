/**
 * Lightweight client analytics for directory assignment flows (rec 12).
 * Dispatch a CustomEvent so hosts / Posthog / etc. can subscribe without coupling here.
 */
export type DirectoryAssignmentOpenEntry = 'attention' | 'completeness';

export function emitDirectoryAssignmentAnalytics(
  kind: 'opened' | 'submitted',
  detail: Record<string, unknown> & { entry?: DirectoryAssignmentOpenEntry },
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('trialetics:directory-assignment', {
      detail: { kind, ts: Date.now(), ...detail },
    }),
  );
}
