'use server';

import { createClient } from '@/lib/server';
import { getDirectoryPermissionContext } from '@/lib/directory-permissions';
import { normalizeAuditAndHistory } from '@/lib/directory/activity-events';
import type { ActivityEvent } from '@/lib/directory/activity-events';
import {
  EMPTY_ACTIVITY_SNAPSHOT,
  EMPTY_ACTIVITY_SUMMARY,
  EMPTY_ORGANIZATION_SNAPSHOT,
  neutralOrgEnrichment,
  type ActivityAttentionItem,
  type ActivitySummary,
  type DirectoryActivitySnapshot,
  type DirectoryOrganizationSnapshot,
  type OrgAttentionRow,
  type OrgEnrichment,
  type OrgHealth,
  type OrgSuggestion,
} from '@/lib/directory/live-directory-types';
import type { InstitutionRow } from '@/lib/types/directory';
import { summarizeOrganizationCompleteness } from '@/lib/directory/record-completeness';

async function requireReader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) throw new Error('No company');
  return { supabase, user, ...ctx };
}

async function assertStudyInCompany(studyId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('studies')
    .select('id,title,protocol_number,company_id')
    .eq('id', studyId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Study not found');
  return data as { id: string; title: string | null; protocol_number: string | null; company_id: string };
}

function studyLabel(study: { title?: string | null; protocol_number?: string | null }): string {
  return study.protocol_number?.trim() || study.title?.trim() || 'Study';
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestTime = 0;
  for (const value of values) {
    if (!value) continue;
    const t = new Date(value).getTime();
    if (Number.isNaN(t)) continue;
    if (t > bestTime) {
      bestTime = t;
      best = value;
    }
  }
  return best;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function activityRelative(iso: string): string {
  const days = daysSince(iso);
  if (days == null) return 'No activity';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Not tracked';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not tracked';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return 'Not tracked';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not tracked';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function orgHealthFor(inst: InstitutionRow, enrichment: OrgEnrichment): OrgHealth {
  if (inst.organization_type !== 'clinical_site') {
    return enrichment.studyInvolvement.length > 0 ? 'healthy' : 'not_tracked';
  }
  if (!enrichment.enrollmentTarget) return 'not_tracked';
  const pct = enrichment.enrollmentCurrent / enrichment.enrollmentTarget;
  const visitDays = daysSince(enrichment.lastVisitISO);
  if (pct < 0.25 || (visitDays != null && visitDays >= 60)) return 'critical';
  if (pct < 0.5 || (visitDays != null && visitDays >= 30)) return 'at_risk';
  return 'healthy';
}

function emptyEnrollmentBuckets() {
  return [
    { key: 'gte75' as const, label: '>= 75%', count: 0, color: '#10b981' },
    { key: 'b50_75' as const, label: '50% - 75%', count: 0, color: '#22c55e' },
    { key: 'b25_50' as const, label: '25% - 50%', count: 0, color: '#f59e0b' },
    { key: 'lt25' as const, label: '< 25%', count: 0, color: '#ef4444' },
    { key: 'none' as const, label: 'Not tracked', count: 0, color: '#94a3b8' },
  ];
}

export async function getDirectoryOrganizationSnapshot(
  studyId: string
): Promise<{ data: DirectoryOrganizationSnapshot; error: string | null }> {
  try {
    const { supabase, companyId } = await requireReader();
    const study = await assertStudyInCompany(studyId, companyId);
    const label = studyLabel(study);

    const { data: institutions, error: instErr } = await supabase
      .from('institutions')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
      .limit(1000);
    if (instErr) return { data: EMPTY_ORGANIZATION_SNAPSHOT, error: instErr.message };

    const rows = (institutions ?? []) as InstitutionRow[];
    if (rows.length === 0) return { data: EMPTY_ORGANIZATION_SNAPSHOT, error: null };
    const formCompleteness = summarizeOrganizationCompleteness(rows);

    const institutionIds = rows.map((r) => r.id);
    const [{ data: studyLinks }, { data: siteLinks }, { data: studySites }, { data: subjects }, { data: visits }] =
      await Promise.all([
        supabase
          .from('institution_study')
          .select('institution_id, study_id, studies(id,title,protocol_number)')
          .in('institution_id', institutionIds),
        supabase
          .from('institution_study_site')
          .select('institution_id, study_site_id, study_sites!inner(id,name,site_number,study_id,target_enrollment,status)')
          .in('institution_id', institutionIds)
          .eq('study_sites.study_id', studyId),
        supabase.from('study_sites').select('id,name,site_number,target_enrollment,status').eq('study_id', studyId),
        supabase.from('subjects').select('id,site_id,status').eq('study_id', studyId),
        supabase
          .from('monitoring_visits')
          .select('id,site_id,status,actual_date,planned_date,updated_at')
          .eq('study_id', studyId),
      ]);

    const subjectsBySite = new Map<string, number>();
    for (const row of subjects ?? []) {
      const r = row as { site_id: string | null; status: string | null };
      if (!r.site_id) continue;
      if (!['randomized', 'active', 'completed'].includes(r.status ?? '')) continue;
      subjectsBySite.set(r.site_id, (subjectsBySite.get(r.site_id) ?? 0) + 1);
    }

    const targetBySite = new Map<string, number>();
    for (const row of studySites ?? []) {
      const r = row as { id: string; target_enrollment: number | null };
      targetBySite.set(r.id, r.target_enrollment ?? 0);
    }

    const visitDatesBySite = new Map<string, string[]>();
    for (const row of visits ?? []) {
      const r = row as {
        site_id: string | null;
        actual_date: string | null;
        planned_date: string | null;
        updated_at: string | null;
      };
      if (!r.site_id) continue;
      const arr = visitDatesBySite.get(r.site_id) ?? [];
      const best = maxIso([r.actual_date, r.planned_date, r.updated_at]);
      if (best) arr.push(best);
      visitDatesBySite.set(r.site_id, arr);
    }

    const linkedStudyLabels = new Map<string, Set<string>>();
    const directStudyLinked = new Set<string>();
    for (const row of studyLinks ?? []) {
      const r = row as { institution_id: string; study_id: string | null; studies: unknown };
      const set = linkedStudyLabels.get(r.institution_id) ?? new Set<string>();
      const nested = Array.isArray(r.studies) ? r.studies[0] : r.studies;
      const s = nested as { title?: string | null; protocol_number?: string | null } | null;
      set.add(studyLabel(s ?? {}));
      linkedStudyLabels.set(r.institution_id, set);
      if (r.study_id === studyId) directStudyLinked.add(r.institution_id);
    }

    const siteIdsByInstitution = new Map<string, Set<string>>();
    for (const row of siteLinks ?? []) {
      const r = row as { institution_id: string; study_site_id: string | null };
      if (!r.study_site_id) continue;
      const set = siteIdsByInstitution.get(r.institution_id) ?? new Set<string>();
      set.add(r.study_site_id);
      siteIdsByInstitution.set(r.institution_id, set);
      const labels = linkedStudyLabels.get(r.institution_id) ?? new Set<string>();
      labels.add(label);
      linkedStudyLabels.set(r.institution_id, labels);
    }

    const enrichmentByInstitutionId: Record<string, OrgEnrichment> = {};
    for (const inst of rows) {
      const siteIds = Array.from(siteIdsByInstitution.get(inst.id) ?? []);
      const enrichment = neutralOrgEnrichment();
      enrichment.studyInvolvement = Array.from(linkedStudyLabels.get(inst.id) ?? []);
      enrichment.enrollmentTarget = siteIds.reduce((acc, id) => acc + (targetBySite.get(id) ?? 0), 0);
      enrichment.enrollmentCurrent = siteIds.reduce((acc, id) => acc + (subjectsBySite.get(id) ?? 0), 0);
      enrichment.lastVisitISO = maxIso(siteIds.flatMap((id) => visitDatesBySite.get(id) ?? []));
      enrichment.health = orgHealthFor(inst, enrichment);
      enrichmentByInstitutionId[inst.id] = enrichment;
    }

    const clinical = rows.filter((r) => r.organization_type === 'clinical_site');
    const activeClinical = clinical.filter((r) => r.status === 'active').length;
    const sitesAtRisk = clinical.filter((r) => {
      const health = enrichmentByInstitutionId[r.id]?.health;
      return health === 'at_risk' || health === 'critical';
    }).length;
    const labs = rows.filter((r) => r.organization_type === 'lab');
    const labsAcrossStudies = labs.filter((r) => (linkedStudyLabels.get(r.id)?.size ?? 0) > 0).length;

    const enrollmentBuckets = emptyEnrollmentBuckets();
    for (const inst of clinical) {
      const e = enrichmentByInstitutionId[inst.id];
      if (!e?.enrollmentTarget) {
        enrollmentBuckets.find((b) => b.key === 'none')!.count += 1;
        continue;
      }
      const pct = e.enrollmentCurrent / e.enrollmentTarget;
      if (pct >= 0.75) enrollmentBuckets.find((b) => b.key === 'gte75')!.count += 1;
      else if (pct >= 0.5) enrollmentBuckets.find((b) => b.key === 'b50_75')!.count += 1;
      else if (pct >= 0.25) enrollmentBuckets.find((b) => b.key === 'b25_50')!.count += 1;
      else enrollmentBuckets.find((b) => b.key === 'lt25')!.count += 1;
    }

    const regionColors = ['#0ea5e9', '#10b981', '#f59e0b', '#94a3b8', '#8b5cf6'];
    const regionMap = new Map<string, number>();
    for (const inst of rows) {
      const key = inst.region?.trim() || inst.country_code?.trim() || 'Unspecified';
      regionMap.set(key, (regionMap.get(key) ?? 0) + 1);
    }

    const sitesBelow50 = clinical.filter((inst) => {
      const e = enrichmentByInstitutionId[inst.id];
      return !!e?.enrollmentTarget && e.enrollmentCurrent / e.enrollmentTarget < 0.5;
    }).length;
    const noVisit60 = clinical.filter((inst) => {
      const e = enrichmentByInstitutionId[inst.id];
      const days = daysSince(e?.lastVisitISO ?? null);
      return days != null && days >= 60;
    }).length;
    const assigned = new Set([...directStudyLinked, ...Array.from(siteIdsByInstitution.keys())]);
    const orgsUnassigned = rows.filter((r) => !assigned.has(r.id)).length;

    const needsAttention: OrgAttentionRow[] = [
      { key: 'sites_below_50', label: 'Sites below 50% enrollment', count: sitesBelow50 },
      { key: 'no_visit_60', label: 'No visit in 60+ days', count: noVisit60 },
      { key: 'orgs_unassigned', label: 'Organizations not assigned to study', count: orgsUnassigned },
    ];

    const suggestions: OrgSuggestion[] = [];
    if (noVisit60 > 0) {
      suggestions.push({
        id: 'visits-60d',
        label: `${noVisit60} site${noVisit60 === 1 ? ' has' : 's have'} no visit in 60+ days`,
        cta: 'Filter sites',
        attentionKey: 'no_visit_60',
      });
    }
    if (orgsUnassigned > 0) {
      suggestions.push({
        id: 'unassigned',
        label: `${orgsUnassigned} organization${orgsUnassigned === 1 ? '' : 's'} not assigned to this study`,
        cta: 'Review organizations',
        attentionKey: 'orgs_unassigned',
      });
    }

    return {
      data: {
        kpi: {
          totalOrganizations: rows.length,
          totalOrganizationsLabel: 'All types',
          formCompleteness,
          activeSites: { active: activeClinical, total: clinical.length },
          sitesAtRisk,
          irbsPending: 0,
          labsActive: labs.filter((r) => r.status === 'active').length,
          labsAcrossStudies,
        },
        insights: {
          enrollmentBuckets,
          regionCounts: Array.from(regionMap.entries()).map(([key, count], index) => ({
            key,
            label: key,
            count,
            color: regionColors[index % regionColors.length],
          })),
        },
        needsAttention,
        suggestions,
        enrichmentByInstitutionId,
      },
      error: null,
    };
  } catch (e) {
    return {
      data: EMPTY_ORGANIZATION_SNAPSHOT,
      error: e instanceof Error ? e.message : 'Failed to load organization snapshot',
    };
  }
}

function buildActivitySummary(events: ActivityEvent[]): ActivitySummary {
  if (events.length === 0) return EMPTY_ACTIVITY_SUMMARY;
  const sorted = [...events].sort((a, b) => b.at.getTime() - a.at.getTime());
  const latest = sorted[0];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeLast7Days = sorted.filter((e) => e.at.getTime() >= weekAgo).length;
  const inactivityDays = daysSince(latest.at.toISOString()) ?? 0;
  const lastStudy = sorted.find((e) => e.kind === 'study')?.at.toISOString() ?? null;
  const lastSite = sorted.find((e) => e.kind === 'site')?.at.toISOString() ?? null;
  const lastVisit = sorted.find((e) => e.kind === 'visits')?.at.toISOString() ?? null;
  return {
    lastActivityRelative: activityRelative(latest.at.toISOString()),
    lastActivityAt: formatDateTime(latest.at.toISOString()),
    lastActivityActor: `By ${latest.actor.name}`,
    totalActivities: events.length,
    activeLast7Days,
    activePctOfTotal: events.length === 0 ? 0 : Math.round((activeLast7Days / events.length) * 100),
    inactivityDays,
    inactivityRisk: inactivityDays >= 30 ? 'at_risk' : 'ok',
    status: inactivityDays >= 30 ? 'Idle' : activeLast7Days > 0 ? 'Active' : 'Engaged',
    lastVisit: formatDateOnly(lastVisit),
    lastVisitDate: formatDateOnly(lastVisit),
    lastStudyActivity: lastStudy ? formatDateTime(lastStudy) : 'No study activity',
    lastSiteActivity: lastSite ? formatDateTime(lastSite) : 'No site activity',
  };
}

function buildActivityTrend(events: ActivityEvent[]): { trend: number[]; ticks: string[] } {
  const buckets = Array.from({ length: 12 }, () => 0);
  const now = Date.now();
  const bucketMs = (90 * 24 * 60 * 60 * 1000) / buckets.length;
  for (const event of events) {
    const age = now - event.at.getTime();
    if (age < 0 || age > 90 * 24 * 60 * 60 * 1000) continue;
    const index = Math.min(11, Math.floor((90 * 24 * 60 * 60 * 1000 - age) / bucketMs));
    buckets[index] += 1;
  }
  const ticks = [90, 60, 30, 0].map((daysAgoValue) => {
    const d = new Date(now - daysAgoValue * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  return { trend: buckets, ticks };
}

function buildActivityAttention(summary: ActivitySummary): ActivityAttentionItem[] {
  const items: ActivityAttentionItem[] = [];
  if (summary.totalActivities === 0) {
    items.push({
      id: 'no-activity',
      title: 'No directory activity recorded',
      subtitle: 'Create or update a directory record to start the audit trail.',
      ctaLabel: 'Review',
      intent: 'review',
    });
  } else if (summary.inactivityRisk === 'at_risk') {
    items.push({
      id: 'stale-activity',
      title: 'Directory activity is stale',
      subtitle: `Last activity was ${summary.inactivityDays} days ago.`,
      ctaLabel: 'Review',
      intent: 'review',
    });
  }
  if (summary.lastVisit === 'Not tracked') {
    items.push({
      id: 'visits-not-tracked',
      title: 'Visit activity not tracked here',
      subtitle: 'Monitoring visits can be reviewed in the site/visit workflows.',
      ctaLabel: 'Log visit',
      intent: 'visit',
    });
  }
  return items;
}

export async function getDirectoryActivitySnapshot(opts?: {
  limit?: number;
  offset?: number;
  fromQuery?: string;
}): Promise<{ data: DirectoryActivitySnapshot; error: string | null }> {
  try {
    const { supabase, companyId } = await requireReader();
    const limit = Math.min(opts?.limit ?? 100, 500);
    const offset = opts?.offset ?? 0;
    const [{ data: audit, error: auditError }, { data: history, error: historyError }] = await Promise.all([
      supabase
        .from('directory_audit_log')
        .select('*')
        .eq('company_id', companyId)
        .order('changed_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('directory_assignment_history')
        .select('*')
        .eq('company_id', companyId)
        .order('changed_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);
    if (auditError) return { data: EMPTY_ACTIVITY_SNAPSHOT, error: auditError.message };
    if (historyError) return { data: EMPTY_ACTIVITY_SNAPSHOT, error: historyError.message };

    const events = normalizeAuditAndHistory(audit ?? [], history ?? [], { fromQuery: opts?.fromQuery ?? '' });
    const summary = buildActivitySummary(events);
    const { trend, ticks } = buildActivityTrend(events);
    return {
      data: {
        events,
        summary,
        attention: buildActivityAttention(summary),
        insightsTrend: trend,
        insightsTicks: ticks,
        insightsTotalLabel: 'Last 90 days',
      },
      error: null,
    };
  } catch (e) {
    return {
      data: EMPTY_ACTIVITY_SNAPSHOT,
      error: e instanceof Error ? e.message : 'Failed to load activity snapshot',
    };
  }
}

