import type { SubjectVisit } from '@/lib/types/ctms';
import { computeVisitWindowStatus, formatPlanDate, localTodayIso } from '@/lib/utils/visit-window';

/**
 * Returns visits filtered to the live template when `liveTemplateVersionId` is set;
 * otherwise returns a shallow copy of all visits, sorted by sort_order then visit_number.
 */
export function selectLiveVisits(
  visits: SubjectVisit[] | null | undefined,
  liveTemplateVersionId: string | null | undefined,
): SubjectVisit[] {
  const all = visits ?? [];
  const list =
    liveTemplateVersionId
      ? all.filter((v) => v.template_version_id === liveTemplateVersionId)
      : [...all];
  return list.sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return (a.visit_number ?? 0) - (b.visit_number ?? 0);
  });
}

export type SubjectVisitOverview = {
  /** Most recent actual visit (by actual_date) among rows with a date. */
  lastVisit: { visitName: string; actualDate: string; display: string } | null;
  /** Count of open scheduled visits in the `overdue` window bucket. */
  overdueCount: number;
  /** Formatted next planned visit label for KPI + snapshot, or null if none scheduled. */
  nextPlanned: { visitName: string; plannedLabel: string; windowLine: string | null } | null;
  /**
   * True if there is a future/ongoing open visit (upcoming, due_now, pending with intent to schedule, overdue).
   * "Not scheduled" when this is false and `lastVisit` is null, or when no open windowed row exists.
   */
  hasOpenScheduledPipeline: boolean;
  /** `true` if there is any visit the UI should treat as "on the books" (next in pipeline). */
  hasNextVisitInPipeline: boolean;
};

function isUpcomingPipeline(visit: SubjectVisit, today: string) {
  const w = computeVisitWindowStatus(visit, today).kind;
  return w === 'pending' || w === 'upcoming' || w === 'due_now' || w === 'overdue';
}

/**
 * Next visit: first in-protocol-order row still in a window bucket (not done / not already captured).
 */
function pickNextOpenVisit(visits: SubjectVisit[], today: string): SubjectVisit | null {
  const open = visits.filter((v) => isUpcomingPipeline(v, today));
  if (open.length === 0) return null;

  const score = (v: SubjectVisit) => {
    const w = computeVisitWindowStatus(v, today).kind;
    if (w === 'overdue') return 0;
    if (w === 'due_now') return 1;
    if (w === 'upcoming') return 2;
    if (w === 'pending') return 3;
    return 4;
  };
  return [...open].sort((a, b) => {
    const s = score(a) - score(b);
    if (s !== 0) return s;
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return (a.visit_number ?? 0) - (b.visit_number ?? 0);
  })[0] ?? null;
}

export function deriveSubjectVisitOverview(
  visits: SubjectVisit[] | null | undefined,
  liveTemplateVersionId: string | null | undefined,
  today: string = localTodayIso(),
): SubjectVisitOverview {
  const list = selectLiveVisits(visits, liveTemplateVersionId);
  if (list.length === 0) {
    return {
      lastVisit: null,
      overdueCount: 0,
      nextPlanned: null,
      hasOpenScheduledPipeline: false,
      hasNextVisitInPipeline: false,
    };
  }

  const withActual = list
    .filter((v) => v.actual_date && String(v.actual_date).length > 0)
    .sort((a, b) => String(b.actual_date!).localeCompare(String(a.actual_date!)));

  const last = withActual[0];
  const lastVisit = last
    ? {
        visitName: last.visit_name,
        actualDate: String(last.actual_date!),
        display: formatPlanDate(last.actual_date),
      }
    : null;

  let overdueCount = 0;
  for (const v of list) {
    if (computeVisitWindowStatus(v, today).kind === 'overdue') overdueCount += 1;
  }

  const next = pickNextOpenVisit(list, today);
  let nextPlanned: SubjectVisitOverview['nextPlanned'] = null;
  if (next) {
    const planned = next.planned_date
      ? formatPlanDate(next.planned_date)
      : 'TBD';
    const windowLine =
      next.window_start && next.window_end
        ? `${formatPlanDate(next.window_start)} – ${formatPlanDate(next.window_end)}`
        : null;
    nextPlanned = { visitName: next.visit_name, plannedLabel: planned, windowLine };
  }

  const hasNextVisitInPipeline = next != null;
  const hasOpenScheduledPipeline = hasNextVisitInPipeline;

  return {
    lastVisit,
    overdueCount,
    nextPlanned,
    hasOpenScheduledPipeline,
    hasNextVisitInPipeline,
  };
}
