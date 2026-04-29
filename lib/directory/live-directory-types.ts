import type { ActivityEvent } from '@/lib/directory/activity-events';
import type { InstitutionOrganizationType } from '@/lib/types/directory';

export type OrgHealth = 'healthy' | 'at_risk' | 'critical' | 'not_tracked';
export type IrbApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_tracked';

export interface OrgEnrichment {
  studyInvolvement: string[];
  enrollmentCurrent: number;
  enrollmentTarget: number;
  lastVisitISO: string | null;
  health: OrgHealth;
  irbStatus?: IrbApprovalStatus;
  irbDateISO?: string | null;
  tatDays?: number | null;
}

export interface OrgKpiSnapshot {
  totalOrganizations: number;
  totalOrganizationsLabel: string;
  activeSites: { active: number; total: number };
  sitesAtRisk: number;
  irbsPending: number;
  labsActive: number;
  labsAcrossStudies: number;
}

export interface OrgEnrollmentBucket {
  key: 'gte75' | 'b50_75' | 'b25_50' | 'lt25' | 'none';
  label: string;
  count: number;
  color: string;
}

export interface OrgRegionBucket {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface OrgInsightsSnapshot {
  enrollmentBuckets: OrgEnrollmentBucket[];
  regionCounts: OrgRegionBucket[];
}

export type OrgAttentionKey =
  | 'sites_below_50'
  | 'no_visit_60'
  | 'orgs_unassigned';

export interface OrgAttentionRow {
  key: OrgAttentionKey;
  label: string;
  count: number;
}

export interface OrgSuggestion {
  id: string;
  label: string;
  cta: string;
  attentionKey: OrgAttentionKey;
}

export interface DirectoryOrganizationSnapshot {
  kpi: OrgKpiSnapshot;
  insights: OrgInsightsSnapshot;
  needsAttention: OrgAttentionRow[];
  suggestions: OrgSuggestion[];
  enrichmentByInstitutionId: Record<string, OrgEnrichment>;
}

export interface ActivitySummary {
  lastActivityRelative: string;
  lastActivityAt: string;
  lastActivityActor: string;
  totalActivities: number;
  activeLast7Days: number;
  activePctOfTotal: number;
  inactivityDays: number;
  inactivityRisk: 'ok' | 'at_risk';
  status: 'Active' | 'Engaged' | 'Idle';
  lastVisit: string;
  lastVisitDate: string;
  lastStudyActivity: string;
  lastSiteActivity: string;
}

export interface ActivityAttentionItem {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: 'Log visit' | 'Review' | 'Create task';
  intent: 'visit' | 'review' | 'task';
}

export interface DirectoryActivitySnapshot {
  events: ActivityEvent[];
  summary: ActivitySummary;
  attention: ActivityAttentionItem[];
  insightsTrend: number[];
  insightsTicks: string[];
  insightsTotalLabel: string;
}

export interface ContactLastActivity {
  kind: 'visit' | 'email' | 'none';
  date: string;
  relative: string;
}

export const EMPTY_ORGANIZATION_SNAPSHOT: DirectoryOrganizationSnapshot = {
  kpi: {
    totalOrganizations: 0,
    totalOrganizationsLabel: 'All types',
    activeSites: { active: 0, total: 0 },
    sitesAtRisk: 0,
    irbsPending: 0,
    labsActive: 0,
    labsAcrossStudies: 0,
  },
  insights: {
    enrollmentBuckets: [
      { key: 'gte75', label: '>= 75%', count: 0, color: '#10b981' },
      { key: 'b50_75', label: '50% - 75%', count: 0, color: '#22c55e' },
      { key: 'b25_50', label: '25% - 50%', count: 0, color: '#f59e0b' },
      { key: 'lt25', label: '< 25%', count: 0, color: '#ef4444' },
      { key: 'none', label: 'Not tracked', count: 0, color: '#94a3b8' },
    ],
    regionCounts: [],
  },
  needsAttention: [],
  suggestions: [],
  enrichmentByInstitutionId: {},
};

export const EMPTY_ACTIVITY_SUMMARY: ActivitySummary = {
  lastActivityRelative: 'No activity',
  lastActivityAt: 'No activity recorded',
  lastActivityActor: 'No actor yet',
  totalActivities: 0,
  activeLast7Days: 0,
  activePctOfTotal: 0,
  inactivityDays: 0,
  inactivityRisk: 'ok',
  status: 'Idle',
  lastVisit: 'Not tracked',
  lastVisitDate: 'Not tracked',
  lastStudyActivity: 'No study activity',
  lastSiteActivity: 'No site activity',
};

export const EMPTY_ACTIVITY_SNAPSHOT: DirectoryActivitySnapshot = {
  events: [],
  summary: EMPTY_ACTIVITY_SUMMARY,
  attention: [],
  insightsTrend: [],
  insightsTicks: [],
  insightsTotalLabel: 'Last 90 days',
};

export function neutralOrgEnrichment(): OrgEnrichment {
  return {
    studyInvolvement: [],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: null,
    health: 'not_tracked',
    irbStatus: 'not_tracked',
    irbDateISO: null,
    tatDays: null,
  };
}

export type OrgTypeLabelMap = Record<
  InstitutionOrganizationType,
  { plural: string; singular: string }
>;
