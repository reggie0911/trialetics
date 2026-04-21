import type { SubjectCrf, SubjectCrfPercentages } from '@/lib/types/ctms';

/**
 * Pure helper that aggregates DE / SDV / Lock totals and percentages across an
 * arbitrary set of subject_crfs rows.
 *
 * Same function is reused at three scopes:
 *   - one row    -> per-CRF table cell chips
 *   - one visit  -> visit summary chips
 *   - all rows   -> overall header strip on the eCRF Tracking tab
 *
 * Rules (locked):
 *   DE%    = sum(data_entry)            / sum(data_expected)   (null when divisor 0)
 *   SDV%   = sum(source_data_verified)  / sum(data_entry)      (null when divisor 0)
 *   Lock%  = sum(data_management_lock)  / sum(data_entry)      (null when divisor 0)
 *
 *   - All percentages use Math.floor (199/200 -> 99, never 100).
 *   - Query cap: if any row in the bucket has query_status === 'open' or
 *     'answered', SDV% and Lock% are capped at 99. DE% is unaffected.
 */
export function computeSubjectCrfPercentages(
  rows: Pick<
    SubjectCrf,
    | 'data_expected'
    | 'data_entry'
    | 'source_data_verified'
    | 'data_management_lock'
    | 'query_status'
  >[],
): SubjectCrfPercentages {
  let expected = 0;
  let de = 0;
  let sdv = 0;
  let lock = 0;
  let openQ = 0;
  let answeredQ = 0;

  for (const row of rows) {
    expected += row.data_expected;
    if (row.data_entry) de += 1;
    if (row.source_data_verified) sdv += 1;
    if (row.data_management_lock) lock += 1;
    if (row.query_status === 'open') openQ += 1;
    else if (row.query_status === 'answered') answeredQ += 1;
  }

  const hasUnresolvedQuery = openQ > 0 || answeredQ > 0;

  const pct = (num: number, den: number): number | null =>
    den > 0 ? Math.floor((num / den) * 100) : null;

  const cap = (p: number | null): number | null =>
    p === null ? null : hasUnresolvedQuery ? Math.min(p, 99) : p;

  return {
    dataExpectedTotal: expected,
    dataEntryTotal: de,
    sdvTotal: sdv,
    lockTotal: lock,
    openQueryCount: openQ,
    answeredQueryCount: answeredQ,
    hasUnresolvedQuery,
    dataEntryPct: pct(de, expected),
    sdvPct: cap(pct(sdv, de)),
    lockPct: cap(pct(lock, de)),
  };
}
