import type {
  SubjectTrackingSummary,
  SubjectWithSite,
} from '@/lib/types/ctms';

export type SubjectLockState = 'locked' | 'open' | 'not_started';

export const LOCK_STATE_LABEL: Record<SubjectLockState, string> = {
  locked: 'Locked',
  open: 'Open',
  not_started: 'Not started',
};

export interface EnrichedSubjectRow extends SubjectWithSite {
  /** Composite signal — DE done, SDV outstanding (per the Data Review Pending KPI rule). */
  isDataReviewPending: boolean;
  /** Tri-state lock pill rendered in the Data Quality column. */
  lockState: SubjectLockState;
  /** Most recent of the subject's `updated_at` (single source today). */
  lastActivityAt: string;
}

/**
 * Derive the lock pill state for a subject row from its tracking summary.
 *
 * Rules:
 * - `locked`        — every expected data point is locked (`lockTotal === dataExpectedTotal`).
 * - `open`          — at least one DE row exists but lock is incomplete.
 * - `not_started`   — no expected rows yet OR no data entered.
 */
export function getSubjectLockState(
  summary: SubjectTrackingSummary | null | undefined,
): SubjectLockState {
  if (!summary || summary.dataExpectedTotal === 0) return 'not_started';
  if (summary.lockTotal >= summary.dataExpectedTotal) return 'locked';
  if (summary.dataEntryTotal > 0) return 'open';
  return 'not_started';
}

/**
 * `Data Review Pending` rule (per product decision):
 *   `dataEntryTotal > 0 AND sdvTotal < dataExpectedTotal AND dataExpectedTotal > 0`
 *
 * i.e. DE has started, but SDV is not complete.
 */
export function isSubjectDataReviewPending(
  summary: SubjectTrackingSummary | null | undefined,
): boolean {
  if (!summary) return false;
  if (summary.dataExpectedTotal === 0) return false;
  if (summary.dataEntryTotal === 0) return false;
  return summary.sdvTotal < summary.dataExpectedTotal;
}

/** Wrap a subject row with the derived signals consumed by the redesigned table + KPIs. */
export function enrichSubjectRow(subject: SubjectWithSite): EnrichedSubjectRow {
  return {
    ...subject,
    isDataReviewPending: isSubjectDataReviewPending(subject.tracking_summary),
    lockState: getSubjectLockState(subject.tracking_summary),
    lastActivityAt: subject.updated_at,
  };
}

/** Convenience: `Data Review Pending` count for the KPI tile. */
export function getDataReviewPendingCount(subjects: SubjectWithSite[]): number {
  let count = 0;
  for (const s of subjects) {
    if (isSubjectDataReviewPending(s.tracking_summary)) count += 1;
  }
  return count;
}
