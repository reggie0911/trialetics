/**
 * Pure helpers shared by Trip Report list/tracker server actions and the
 * matching unit tests. This module intentionally contains no Supabase, no
 * Next.js, and no React imports so it is cheap to load in test environments
 * and impossible to accidentally invoke from server-only code paths.
 */

export const TRIP_REPORT_DEFAULT_PAGE_SIZE = 50;
export const TRIP_REPORT_MAX_PAGE_SIZE = 500;

export type TripReportSortDirection = 'asc' | 'desc';

export interface TripReportSortOption {
  column: string;
  direction: TripReportSortDirection;
}

export interface TripReportPaginationOptions {
  /** 1-indexed page number. */
  page?: number;
  /** Page size; clamped to TRIP_REPORT_MAX_PAGE_SIZE. */
  pageSize?: number;
  /** Optional sort applied before pagination. Unknown columns are ignored. */
  sort?: TripReportSortOption | null;
}

export function normalizeTripReportPagination(options?: TripReportPaginationOptions): {
  page: number;
  pageSize: number;
} {
  const rawPage = options?.page ?? 1;
  const rawPageSize = options?.pageSize ?? TRIP_REPORT_DEFAULT_PAGE_SIZE;
  // URL params commonly produce NaN via `parseInt('')` etc. — coerce those
  // (and any other non-finite garbage) to safe defaults instead of leaking
  // NaN into Postgres `range()` calls.
  const safePage = Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;
  const safePageSize = Number.isFinite(rawPageSize)
    ? Math.floor(rawPageSize)
    : TRIP_REPORT_DEFAULT_PAGE_SIZE;
  const page = Math.max(1, safePage);
  const pageSize = Math.min(TRIP_REPORT_MAX_PAGE_SIZE, Math.max(1, safePageSize));
  return { page, pageSize };
}

/**
 * Locale-aware sort comparator with stable null handling: nulls always sort
 * last, regardless of direction. Numbers are compared numerically; everything
 * else is compared as a case-insensitive string with numeric segment awareness
 * (so `Visit -2` sorts before `Visit -10`).
 */
export function compareForSort(
  a: unknown,
  b: unknown,
  direction: TripReportSortDirection
): number {
  const dir = direction === 'desc' ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return dir * (a - b);
  return dir * String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/** Aging buckets used by the Tracker compliance widget. */
export interface TrackerAgingBuckets {
  /** Reports overdue by 1–7 days. */
  '1to7': number;
  /** Reports overdue by 8–14 days. */
  '8to14': number;
  /** Reports overdue by 15–30 days. */
  '15to30': number;
  /** Reports overdue by more than 30 days. */
  '31plus': number;
}

export function emptyAgingBuckets(): TrackerAgingBuckets {
  return { '1to7': 0, '8to14': 0, '15to30': 0, '31plus': 0 };
}

/**
 * Map an overdue-day count (always positive) to the matching aging bucket.
 * Same thresholds used in `getTripReportTrackerList` so the dashboard cards
 * and tests cannot drift apart.
 */
export function bucketizeOverdueDays(overdueDays: number): keyof TrackerAgingBuckets {
  if (overdueDays <= 7) return '1to7';
  if (overdueDays <= 14) return '8to14';
  if (overdueDays <= 30) return '15to30';
  return '31plus';
}

/**
 * Whitelist of trip-report status transitions that are valid in the UI and
 * server actions. Roles authorised to perform each transition are encoded
 * separately in `lib/visit-report-permissions.ts`. This map is the single
 * source of truth used by both the workflow guards and their tests, so a
 * mistake in either place will fail the suite.
 */
export const TRIP_REPORT_STATUS_TRANSITIONS: Record<string, ReadonlyArray<string>> = {
  report_pending: ['submitted'],
  authoring: ['submitted'],
  returned: ['submitted'],
  submitted: ['under_review', 'authoring'],
  under_review: ['returned', 'approved_and_signed'],
  approved_and_signed: ['returned'],
};

/** Returns true when `to` is a permitted next status from `from`. */
export function isValidTripReportStatusTransition(from: string, to: string): boolean {
  const allowed = TRIP_REPORT_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
