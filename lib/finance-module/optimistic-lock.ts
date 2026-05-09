/**
 * Optimistic concurrency for Finance Module updates.
 * Compare client-supplied `updated_at` to the row loaded before edit.
 */

/** Postgres / ISO timestamps may differ in fractional digits; compare by ms. */
export function fmOptimisticLockMismatch(rowUpdatedAt: string, payloadUpdatedAt: string): boolean {
  const a = Date.parse(rowUpdatedAt);
  const b = Date.parse(payloadUpdatedAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return a !== b;
}

export const FM_STALE_RECORD_MESSAGE =
  'This record was updated elsewhere. Refresh and try again.';
