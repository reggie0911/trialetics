import type {
  EcrfDataEntryByStatus,
  EcrfDataStatus,
  SiteEcrfRollup,
  SubjectEcrfRollupRow,
  SubjectTrackingSummary,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

/**
 * Derive the coarse lifecycle bucket for a (subject | site | visit) row from
 * its DE / SDV / Lock / Expected totals. Single-sourced so the table pill, the
 * "Next Action" CTA, and the right-rail donut all agree.
 *
 * Order matters — the first matching rule wins:
 *   1. expected = 0                            -> not_started
 *   2. lock == expected (and > 0)              -> locked
 *   3. sdv == de == expected                   -> ready_for_lock
 *   4. sdv > 0 && sdv < de                     -> sdv_in_progress
 *   5. de == expected                          -> ready_for_sdv
 *   6. de > 0                                  -> partial_data
 *   7. otherwise                               -> no_data
 */
export function deriveDataStatus(
  totals: Pick<
    SubjectTrackingSummary,
    'dataExpectedTotal' | 'dataEntryTotal' | 'sdvTotal' | 'lockTotal'
  >,
): EcrfDataStatus {
  const { dataExpectedTotal: exp, dataEntryTotal: de, sdvTotal: sdv, lockTotal: lock } = totals;

  if (exp <= 0) return 'not_started';
  if (lock > 0 && lock >= exp) return 'locked';
  if (sdv > 0 && sdv >= de && de >= exp) return 'ready_for_lock';
  if (sdv > 0 && sdv < de) return 'sdv_in_progress';
  if (de >= exp) return 'ready_for_sdv';
  if (de > 0) return 'partial_data';
  return 'no_data';
}

/**
 * Recommended Next Action chip label for a given lifecycle bucket. Kept in
 * one place so subject / site / visit rows render the same wording.
 */
export function nextActionForStatus(status: EcrfDataStatus): {
  label: string;
  tone: 'critical' | 'warn' | 'info' | 'success' | 'muted';
} {
  switch (status) {
    case 'no_data':
    case 'not_started':
      return { label: 'Start Data Entry', tone: 'critical' };
    case 'partial_data':
      return { label: 'Continue Data Entry', tone: 'warn' };
    case 'ready_for_sdv':
      return { label: 'Begin SDV', tone: 'warn' };
    case 'sdv_in_progress':
      return { label: 'Complete SDV', tone: 'info' };
    case 'ready_for_lock':
      return { label: 'Lock CRFs', tone: 'info' };
    case 'locked':
      return { label: 'Locked', tone: 'success' };
  }
}

/**
 * Human label for a `EcrfDataStatus` pill. Centralised so the legend and the
 * column cells never drift apart.
 */
export const ECRF_DATA_STATUS_LABELS: Record<EcrfDataStatus, string> = {
  not_started: 'Not Started',
  no_data: 'No Data',
  partial_data: 'Partial Data',
  ready_for_sdv: 'Ready for SDV',
  sdv_in_progress: 'SDV in Progress',
  ready_for_lock: 'Ready for Lock',
  locked: 'Locked',
};

/**
 * Visit "Due Status" pill kinds and their display labels. Mirrors the bucket
 * keys returned by `v_visit_schedule_summary` plus a "due_soon" alias for
 * `due_now` that reads better in the dashboard.
 */
export type EcrfVisitDueStatus =
  | 'overdue'
  | 'due_soon'
  | 'upcoming'
  | 'completed'
  | 'not_started';

export const ECRF_VISIT_DUE_STATUS_LABELS: Record<EcrfVisitDueStatus, string> =
  {
    overdue: 'Overdue',
    due_soon: 'Due Soon',
    upcoming: 'Upcoming',
    completed: 'Completed',
    not_started: 'Not Started',
  };

/**
 * Pick the dominant due-status for a visit row by walking the bucket counts
 * in priority order (overdue beats due_soon beats upcoming, etc.). Used by
 * the Visit table's pill and the right-rail donut totals.
 */
export function deriveVisitDueStatus(
  row: Pick<
    VisitEcrfRollup,
    'subjectsOverdue' | 'subjectsDueNow' | 'subjectsUpcoming' | 'subjectsCompleted' | 'subjectCount'
  >,
): EcrfVisitDueStatus {
  if ((row.subjectsOverdue ?? 0) > 0) return 'overdue';
  if ((row.subjectsDueNow ?? 0) > 0) return 'due_soon';
  if ((row.subjectsUpcoming ?? 0) > 0) return 'upcoming';
  if ((row.subjectsCompleted ?? 0) > 0 && row.subjectsCompleted === row.subjectCount) {
    return 'completed';
  }
  return 'not_started';
}

/** Human-friendly action chip for a visit row. */
export function nextActionForVisit(row: VisitEcrfRollup): {
  label: string;
  tone: 'critical' | 'warn' | 'info' | 'success' | 'muted';
} {
  const due = deriveVisitDueStatus(row);
  if (due === 'overdue') return { label: 'Resolve Overdue', tone: 'critical' };
  if (due === 'due_soon') return { label: 'Enter CRFs', tone: 'warn' };
  if ((row.dataExpectedTotal ?? 0) === 0) {
    return { label: 'Not Due Yet', tone: 'muted' };
  }
  if ((row.dataEntryTotal ?? 0) === 0) {
    return { label: 'Start Data Entry', tone: 'critical' };
  }
  if (row.dataEntryTotal < row.dataExpectedTotal) {
    return { label: 'Enter CRFs', tone: 'warn' };
  }
  if ((row.sdvTotal ?? 0) < row.dataEntryTotal) {
    return { label: 'Complete SDV', tone: 'info' };
  }
  if ((row.lockTotal ?? 0) < row.dataEntryTotal) {
    return { label: 'Lock CRFs', tone: 'info' };
  }
  return { label: 'Locked', tone: 'success' };
}

/**
 * Compute the "Data Entry by Status" donut buckets from per-subject rollup
 * rows. We work at the CRF level (each `data_expected` unit is one slice) so
 * the donut total matches the "(N/M CRFs entered)" header exactly.
 */
export function deriveDataEntryByStatus(
  rows: ReadonlyArray<
    Pick<SubjectEcrfRollupRow | SiteEcrfRollup, 'dataExpectedTotal' | 'dataEntryTotal'>
  >,
): EcrfDataEntryByStatus {
  let notEntered = 0;
  let inProgress = 0;
  let complete = 0;
  for (const row of rows) {
    const exp = row.dataExpectedTotal ?? 0;
    const de = row.dataEntryTotal ?? 0;
    if (exp <= 0) continue;
    const remaining = Math.max(0, exp - de);
    if (de === 0) {
      notEntered += exp;
    } else if (de >= exp) {
      complete += exp;
    } else {
      complete += de;
      inProgress += remaining;
    }
  }
  return { not_entered: notEntered, in_progress: inProgress, complete };
}

/**
 * Sum the missing-CRF count for a row (Expected - Entered, never negative).
 */
export function missingCrfsFor(
  totals: Pick<SubjectTrackingSummary, 'dataExpectedTotal' | 'dataEntryTotal'>,
): number {
  return Math.max(0, (totals.dataExpectedTotal ?? 0) - (totals.dataEntryTotal ?? 0));
}
