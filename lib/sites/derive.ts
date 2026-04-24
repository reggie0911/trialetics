import type {
  MonitoringVisitWithRelations,
  StudySite,
  SubjectWithSite,
  SubjectStatus,
} from '@/lib/types/ctms';
import {
  formatRelativeUpdated as sharedFormatRelativeUpdated,
  parseTimestampMs as sharedParseTimestampMs,
} from '@/lib/utils/relative-time';

/** Subject statuses that count toward a site's enrolled total. */
const ENROLLED_SUBJECT_STATUSES: ReadonlySet<SubjectStatus> = new Set([
  'randomized',
  'active',
  'completed',
]);

/**
 * Reasons a site can be flagged at-risk. The orchestrator + KPI tile + table
 * row dot all share the same vocabulary so tooltips line up across surfaces.
 */
export type AtRiskReason = 'enrollment_pace' | 'stale_activity' | 'monitoring_overdue';

export const AT_RISK_REASON_LABEL: Record<AtRiskReason, string> = {
  enrollment_pace: 'Enrollment pace below 50% of target',
  stale_activity: 'No subject or monitoring activity in 30+ days',
  monitoring_overdue: 'Monitoring visit overdue',
};

export interface EnrichedSiteRow extends StudySite {
  /** Live count of subjects on this site whose status is randomized/active/completed. */
  enrolled: number;
  /** Most recent of `site.updated_at`, related subjects' updated_at, related monitoring visits' updated_at. */
  lastActivityAt: string;
  /** Composite at-risk signal — true when one or more reasons fire. */
  isAtRisk: boolean;
  /** Subset of `AtRiskReason` that fired for this site. */
  atRiskReasons: AtRiskReason[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 30;
const ENROLLMENT_PACE_THRESHOLD = 0.5;

interface EnrichOptions {
  /** Reference instant — defaults to `new Date()`. Tests can pin this to a fixed clock. */
  now?: Date;
}

/**
 * Build per-site derived metrics for the Sites tab from already-loaded data.
 * Pure function so the orchestrator can call it inside a `useMemo` and tests
 * can drive deterministic outputs without any network IO.
 */
export function enrichSitesWithMetrics(
  sites: StudySite[],
  subjects: Pick<SubjectWithSite, 'site_id' | 'status' | 'updated_at'>[],
  monitoringVisits: Pick<
    MonitoringVisitWithRelations,
    'site_id' | 'status' | 'planned_date' | 'updated_at'
  >[],
  options: EnrichOptions = {},
): EnrichedSiteRow[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const staleCutoffMs = nowMs - STALE_DAYS * DAY_MS;

  const subjectsBySite = new Map<string, typeof subjects>();
  for (const subject of subjects) {
    if (!subject.site_id) continue;
    const bucket = subjectsBySite.get(subject.site_id) ?? [];
    bucket.push(subject);
    subjectsBySite.set(subject.site_id, bucket);
  }

  const visitsBySite = new Map<string, typeof monitoringVisits>();
  for (const visit of monitoringVisits) {
    if (!visit.site_id) continue;
    const bucket = visitsBySite.get(visit.site_id) ?? [];
    bucket.push(visit);
    visitsBySite.set(visit.site_id, bucket);
  }

  return sites.map((site) => {
    const siteSubjects = subjectsBySite.get(site.id) ?? [];
    const siteVisits = visitsBySite.get(site.id) ?? [];

    const enrolled = siteSubjects.filter((s) =>
      ENROLLED_SUBJECT_STATUSES.has(s.status),
    ).length;

    const subjectActivityMs = siteSubjects.reduce(
      (max, s) => Math.max(max, parseTimestampMs(s.updated_at)),
      0,
    );
    const visitActivityMs = siteVisits.reduce(
      (max, v) => Math.max(max, parseTimestampMs(v.updated_at)),
      0,
    );
    const lastActivityMs = Math.max(
      parseTimestampMs(site.updated_at),
      subjectActivityMs,
      visitActivityMs,
    );
    const lastActivityAt = lastActivityMs
      ? new Date(lastActivityMs).toISOString()
      : site.updated_at;

    const reasons: AtRiskReason[] = [];

    const activationMs = parseTimestampMs(site.activation_date);
    const target = Number(site.target_enrollment) || 0;
    if (
      activationMs > 0 &&
      activationMs <= nowMs &&
      target > 0 &&
      enrolled < target * ENROLLMENT_PACE_THRESHOLD
    ) {
      reasons.push('enrollment_pace');
    }

    if (site.status === 'enrolling') {
      const mostRecentTouchMs = Math.max(subjectActivityMs, visitActivityMs);
      if (mostRecentTouchMs === 0 || mostRecentTouchMs < staleCutoffMs) {
        reasons.push('stale_activity');
      }
    }

    const hasOverdueVisit = siteVisits.some((visit) => {
      if (!visit.planned_date) return false;
      const plannedMs = parseTimestampMs(visit.planned_date);
      if (!plannedMs || plannedMs >= nowMs) return false;
      return visit.status !== 'completed' && visit.status !== 'cancelled';
    });
    if (hasOverdueVisit) {
      reasons.push('monitoring_overdue');
    }

    return {
      ...site,
      enrolled,
      lastActivityAt,
      isAtRisk: reasons.length > 0,
      atRiskReasons: reasons,
    };
  });
}

const parseTimestampMs = sharedParseTimestampMs;

/**
 * Re-export so existing call sites that import `formatRelativeUpdated` from
 * `@/lib/sites/derive` keep working after the helper moved to a shared module.
 */
export const formatRelativeUpdated = sharedFormatRelativeUpdated;
