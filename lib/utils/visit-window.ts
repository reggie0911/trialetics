import type {
  NextAction,
  SubjectRiskLevel,
  SubjectVisit,
  VisitPriority,
  VisitScheduleBucketCounts,
  WindowStatus,
  WindowStatusMeta,
} from '@/lib/types/ctms';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Format an ISO `YYYY-MM-DD` (or full ISO timestamp) date as `dd-MMM-yyyy`
 * (e.g. `2026-04-19` -> `19-Apr-2026`). The function is timezone-safe: it
 * parses the YYYY-MM-DD parts directly and never goes through `new Date()`,
 * so a viewer west of UTC won't see a day shift.
 *
 * Returns `'--'` for null / empty / unparseable input so callers can render
 * the result directly into a table cell.
 */
export function formatPlanDate(value: string | null | undefined): string {
  if (!value) return '--';
  const trimmed = value.trim();
  if (trimmed.length === 0) return '--';

  // Accept either bare 'YYYY-MM-DD' or an ISO timestamp; we only ever need the
  // first 10 chars and we never localise.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return '--';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 || month > 12 ||
    day < 1 || day > 31
  ) {
    return '--';
  }
  const monthLabel = MONTHS[month - 1];
  const dayPadded = day < 10 ? `0${day}` : String(day);
  return `${dayPadded}-${monthLabel}-${year}`;
}

/** Parse `'YYYY-MM-DD'` into `{ y, m, d }` without using `new Date()`. */
function parseIsoDate(
  value: string | null | undefined,
): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

/** Compare two ISO date strings; returns -1 / 0 / 1. */
function compareIsoDates(a: string, b: string): number {
  const pa = parseIsoDate(a);
  const pb = parseIsoDate(b);
  if (!pa || !pb) return 0;
  if (pa.y !== pb.y) return pa.y < pb.y ? -1 : 1;
  if (pa.m !== pb.m) return pa.m < pb.m ? -1 : 1;
  if (pa.d !== pb.d) return pa.d < pb.d ? -1 : 1;
  return 0;
}

/**
 * Today's date in the viewer's local timezone, formatted as `'YYYY-MM-DD'`
 * (no time component) so it can be compared cleanly against `planned_date`
 * etc. Pulled into a helper so tests can stub it via the second arg of
 * `computeVisitWindowStatus`.
 */
export function localTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Derive the "where is this visit in its window?" pill that the Visits panel
 * renders next to every row. Never persisted; pure function of the row plus
 * an injectable `today` (defaults to local today).
 *
 * Rules (first match wins):
 *   1. Lifecycle takeover: status of `completed`/`missed`/`skipped`           -> done
 *   2. No planned_date or no window pair                                      -> pending
 *   3. actual_date present:
 *        - inside [window_start, window_end]                                  -> in_window
 *        - outside                                                            -> out_of_window
 *   4. status === 'scheduled' (no actual yet):
 *        - today < window_start                                               -> upcoming
 *        - today in [window_start, window_end]                                -> due_now
 *        - today > window_end                                                 -> overdue
 */
export function computeVisitWindowStatus(
  visit: Pick<
    SubjectVisit,
    'planned_date' | 'actual_date' | 'window_start' | 'window_end' | 'status'
  >,
  today: string = localTodayIso(),
): WindowStatusMeta {
  if (visit.status === 'completed' || visit.status === 'missed' || visit.status === 'skipped') {
    return {
      kind: 'done',
      label: visit.status === 'completed'
        ? 'Done'
        : visit.status === 'missed'
        ? 'Missed'
        : 'Skipped',
      variant: visit.status === 'completed' ? 'success' : 'secondary',
    };
  }

  if (!visit.planned_date || !visit.window_start || !visit.window_end) {
    return { kind: 'pending', label: 'Pending', variant: 'secondary' };
  }

  if (visit.actual_date) {
    const afterStart = compareIsoDates(visit.actual_date, visit.window_start) >= 0;
    const beforeEnd  = compareIsoDates(visit.actual_date, visit.window_end)   <= 0;
    if (afterStart && beforeEnd) {
      return { kind: 'in_window', label: 'In window', variant: 'success' };
    }
    return { kind: 'out_of_window', label: 'Out of window', variant: 'warning' };
  }

  // No actual + no lifecycle override => bucket on today.
  if (compareIsoDates(today, visit.window_start) < 0) {
    return { kind: 'upcoming', label: 'Upcoming', variant: 'secondary' };
  }
  if (compareIsoDates(today, visit.window_end) > 0) {
    return { kind: 'overdue', label: 'Overdue', variant: 'destructive' };
  }
  return { kind: 'due_now', label: 'Due now', variant: 'default' };
}

/**
 * Convenience: how many calendar days the actual_date is outside the window.
 * Negative -> early (before window_start), positive -> late (after window_end).
 * Returns 0 when the actual is inside the window or any input is missing.
 *
 * Used to pre-fill the deviation note ("Visit X days out of window: ...").
 */
export function daysOutOfWindow(
  visit: Pick<SubjectVisit, 'actual_date' | 'window_start' | 'window_end'>,
): number {
  if (!visit.actual_date || !visit.window_start || !visit.window_end) return 0;
  const actual = parseIsoDate(visit.actual_date);
  const start  = parseIsoDate(visit.window_start);
  const end    = parseIsoDate(visit.window_end);
  if (!actual || !start || !end) return 0;

  const actualUtc = Date.UTC(actual.y, actual.m - 1, actual.d);
  const startUtc  = Date.UTC(start.y,  start.m - 1,  start.d);
  const endUtc    = Date.UTC(end.y,    end.m - 1,    end.d);
  const dayMs = 24 * 60 * 60 * 1000;

  if (actualUtc < startUtc) return Math.round((actualUtc - startUtc) / dayMs);
  if (actualUtc > endUtc)   return Math.round((actualUtc - endUtc)   / dayMs);
  return 0;
}

// ─── Visit Window Compliance — priority / risk / next-action ──────────────────

/**
 * Internal: open visits that haven't been resolved into the `done` bucket.
 * Used as the denominator for the priority / risk thresholds so a row that
 * only has completed visits doesn't get flagged as "at risk" when its tiny
 * residual overdue count happens to exceed a threshold.
 */
function openCount(buckets: VisitScheduleBucketCounts): number {
  return Math.max(0, buckets.total - buckets.done);
}

/**
 * Derive a per-row priority from its bucket counts. The thresholds are
 * deliberately conservative so a single overdue visit doesn't tip a 100-visit
 * site into "critical".
 *
 *   overdue / open >= 0.5 -> critical
 *   overdue / open >= 0.2 -> at_risk
 *   else                  -> on_track
 */
export function derivePriority(buckets: VisitScheduleBucketCounts): VisitPriority {
  const open = openCount(buckets);
  if (open <= 0) return 'on_track';
  const ratio = buckets.overdue / open;
  if (ratio >= 0.5) return 'critical';
  if (ratio >= 0.2) return 'at_risk';
  return 'on_track';
}

/**
 * Subject-level risk mirrors the visit-level priority thresholds with the
 * names the UI surfaces — `high` / `medium` / `low` — so a recruiter can scan
 * the By Subject table and instantly find the participants who need a call.
 */
export function deriveSubjectRisk(buckets: VisitScheduleBucketCounts): SubjectRiskLevel {
  const open = openCount(buckets);
  if (open <= 0) return 'low';
  const ratio = buckets.overdue / open;
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.2) return 'medium';
  return 'low';
}

/**
 * Suggested next action for the row, used in the dense rollup table cells.
 * Selection rules (first match wins) — overdue is always the loudest signal:
 *
 *   overdue > 0                                 -> 'resolve_overdue'
 *   out_of_window > 0                           -> 'enter_missing_data' (data quality)
 *   due_now > 0                                 -> 'review_overdue' (action today)
 *   upcoming > 0 + (open ratio big)             -> 'prepare_upcoming'
 *   upcoming > 0                                -> 'monitor_upcoming'
 *   pending > 0                                 -> 'plan_visit'
 *   open > 0                                    -> 'complete_remaining'
 *   else                                        -> 'all_clear'
 */
export function deriveNextAction(buckets: VisitScheduleBucketCounts): NextAction {
  if (buckets.overdue > 0) {
    return { kind: 'resolve_overdue', label: 'Resolve overdue visits' };
  }
  if (buckets.out_of_window > 0) {
    return { kind: 'enter_missing_data', label: 'Document deviation' };
  }
  if (buckets.due_now > 0) {
    return { kind: 'review_overdue', label: 'Action today' };
  }
  const open = openCount(buckets);
  if (buckets.upcoming > 0) {
    const ratio = open > 0 ? buckets.upcoming / open : 0;
    return ratio >= 0.5
      ? { kind: 'prepare_upcoming', label: 'Prepare upcoming visits' }
      : { kind: 'monitor_upcoming', label: 'Monitor upcoming visits' };
  }
  if (buckets.pending > 0) {
    return { kind: 'plan_visit', label: 'Plan visit windows' };
  }
  if (open > 0) {
    return { kind: 'complete_remaining', label: 'Complete remaining visits' };
  }
  return { kind: 'all_clear', label: 'All clear' };
}

/**
 * Bucket every visit into its window status using the same `today` so a list
 * filter can be applied client-side without re-deriving per row.
 */
export function bucketVisitsByWindowStatus<
  V extends Pick<
    SubjectVisit,
    'planned_date' | 'actual_date' | 'window_start' | 'window_end' | 'status'
  >,
>(visits: V[], today: string = localTodayIso()): Map<WindowStatus, V[]> {
  const buckets = new Map<WindowStatus, V[]>();
  for (const v of visits) {
    const kind = computeVisitWindowStatus(v, today).kind;
    const bucket = buckets.get(kind);
    if (bucket) {
      bucket.push(v);
    } else {
      buckets.set(kind, [v]);
    }
  }
  return buckets;
}
