import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionItemPriority } from '@/lib/types/action-items';
import type { MonitoringVisitStatus, MonitoringVisitType, Study } from '@/lib/types/ctms';

export type DashboardEnrollmentBucketKey = 'on_track' | 'at_risk' | 'behind' | 'not_started' | 'target_missing';
export type DashboardAttentionKind = 'visit' | 'enrollment' | 'task' | 'site';

export interface StudyDashboardRow {
  id: string;
  title: string;
  protocolNumber: string;
  phase: string;
  status: string;
  updatedAt: string;
  activeSites: number;
  totalSites: number;
  enrolled: number;
  enrollmentTarget: number;
}

export interface DashboardVisit {
  id: string;
  studyId: string;
  studyTitle: string;
  protocolNumber: string;
  siteLabel: string;
  visitType: MonitoringVisitType | string;
  plannedDate: string | null;
  status: MonitoringVisitStatus | string;
  monitorName: string | null;
  href: string;
}

export interface DashboardEnrollmentSegment {
  key: DashboardEnrollmentBucketKey;
  label: string;
  count: number;
  color: string;
}

export interface DashboardEnrollmentOverview {
  segments: DashboardEnrollmentSegment[];
  enrolled: number;
  target: number;
  percent: number;
  targetMissingCount: number;
}

export interface DashboardAttentionItem {
  id: string;
  kind: DashboardAttentionKind;
  title: string;
  subtitle: string;
  href: string;
  tone: 'red' | 'amber' | 'violet' | 'sky';
}

export interface DashboardTask {
  id: string;
  title: string;
  studyId: string | null;
  studyLabel: string;
  siteLabel: string | null;
  dueDate: string | null;
  dueLabel: string;
  isDueToday: boolean;
  priority: ActionItemPriority | string;
  href: string;
}

export interface DashboardLiveKpis {
  contacts: number;
  upcomingVisits: number;
  enrollmentValue: string;
  enrollmentCaption: string;
  sitesAtRisk: number;
}

export interface CtmsDashboardOverview {
  studyRows: StudyDashboardRow[];
  upcomingVisits: DashboardVisit[];
  enrollment: DashboardEnrollmentOverview;
  attention: DashboardAttentionItem[];
  tasks: DashboardTask[];
  kpis: DashboardLiveKpis;
}

type SiteRow = {
  id: string;
  study_id: string;
  status: string | null;
  target_enrollment: number | null;
  name: string | null;
  site_number: string | null;
  updated_at: string | null;
};

type SubjectRow = {
  id: string;
  study_id: string;
  status: string | null;
  is_active: boolean | null;
  updated_at: string | null;
};

type VisitRow = {
  id: string;
  study_id: string;
  site_id: string | null;
  visit_type: string | null;
  planned_date: string | null;
  status: string | null;
  monitor_id: string | null;
  study_sites: { site_number: string | null; name: string | null } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
  studies: { title: string | null; protocol_number: string | null } | null;
};

type ActionRow = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  protocol_id: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  category: string | null;
  created_at: string | null;
  protocol: { id: string; title: string | null; protocol_number: string | null } | null;
};

const ACTIVE_SITE_STATUSES = new Set(['activated', 'enrolling']);
const ENROLLED_SUBJECT_STATUSES = new Set(['randomized', 'active', 'completed']);

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateOnly(d);
}

function labelFromNames(first: string | null | undefined, last: string | null | undefined): string | null {
  const label = [first, last].filter(Boolean).join(' ').trim();
  return label || null;
}

function studyDisplay(study: Pick<Study, 'study_name' | 'title' | 'protocol_number'>): string {
  return study.study_name?.trim() || study.title || study.protocol_number;
}

function percent(enrolled: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((enrolled / target) * 100);
}

function enrollmentBucket(row: StudyDashboardRow): DashboardEnrollmentBucketKey {
  if (row.enrollmentTarget <= 0) return 'target_missing';
  if (row.enrolled === 0) return 'not_started';
  const pct = row.enrolled / row.enrollmentTarget;
  if (pct >= 0.75) return 'on_track';
  if (pct >= 0.5) return 'at_risk';
  return 'behind';
}

function dueLabel(dueDate: string | null): { label: string; isDueToday: boolean; isOverdue: boolean } {
  if (!dueDate) return { label: 'No due date', isDueToday: false, isOverdue: false };
  const today = dateOnly(new Date());
  if (dueDate === today) return { label: 'Due today', isDueToday: true, isOverdue: false };
  if (dueDate < today) return { label: 'Overdue', isDueToday: false, isOverdue: true };
  const formatted = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(new Date(`${dueDate}T00:00:00`));
  return { label: `Due ${formatted}`, isDueToday: false, isOverdue: false };
}

function siteLabel(site: { site_number: string | null; name: string | null } | null): string {
  if (!site) return 'Unassigned site';
  return [site.site_number, site.name].filter(Boolean).join(' · ') || 'Unassigned site';
}

export async function getCtmsDashboardOverview(
  supabase: SupabaseClient,
  profile: { id?: string | null; company_id: string }
): Promise<CtmsDashboardOverview> {
  const studiesResult = await supabase
    .from('studies')
    .select('id, company_id, protocol_number, study_name, title, phase, status, updated_at')
    .eq('company_id', profile.company_id)
    .order('updated_at', { ascending: false });

  const studies = ((studiesResult.data ?? []) as Study[]).map((s) => ({
    ...s,
    study_name: s.study_name ?? null,
    overview: null,
    therapeutic_area: null,
    indication: null,
    sponsor: null,
    sponsor_institution_id: null,
    start_date: null,
    end_date: null,
    description: null,
    finance_approval_template_id: null,
    created_at: s.created_at ?? s.updated_at,
  }));
  const studyIds = studies.map((s) => s.id);

  if (studyIds.length === 0) {
    return {
      studyRows: [],
      upcomingVisits: [],
      enrollment: {
        segments: [
          { key: 'on_track', label: 'On Track', count: 0, color: '#10b981' },
          { key: 'at_risk', label: 'At Risk', count: 0, color: '#3b82f6' },
          { key: 'behind', label: 'Behind', count: 0, color: '#f59e0b' },
          { key: 'not_started', label: 'Not Started', count: 0, color: '#94a3b8' },
          { key: 'target_missing', label: 'Target Missing', count: 0, color: '#64748b' },
        ],
        enrolled: 0,
        target: 0,
        percent: 0,
        targetMissingCount: 0,
      },
      attention: [],
      tasks: [],
      kpis: { contacts: 0, upcomingVisits: 0, enrollmentValue: '0 / 0', enrollmentCaption: 'No enrollment target', sitesAtRisk: 0 },
    };
  }

  const today = dateOnly(new Date());
  const in30 = addDays(30);

  const [sitesResult, subjectsResult, visitsResult, actionItemsResult, contactsResult] = await Promise.all([
    supabase
      .from('study_sites')
      .select('id, study_id, status, target_enrollment, name, site_number, updated_at')
      .in('study_id', studyIds),
    supabase
      .from('subjects')
      .select('id, study_id, status, is_active, updated_at')
      .in('study_id', studyIds),
    supabase
      .from('monitoring_visits')
      .select('id, study_id, site_id, visit_type, planned_date, status, monitor_id, study_sites(site_number, name), profiles(first_name, last_name), studies(title, protocol_number)')
      .in('study_id', studyIds)
      .gte('planned_date', today)
      .lte('planned_date', in30)
      .in('status', ['planned', 'confirmed'])
      .order('planned_date', { ascending: true })
      .limit(8),
    supabase
      .from('action_items')
      .select('id, title, status, priority, protocol_id, assigned_to_id, due_date, category, created_at, protocol:studies(id, title, protocol_number)')
      .eq('company_id', profile.company_id)
      .not('status', 'in', '("resolved","closed")')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from('directory_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id),
  ]);

  const sites = (sitesResult.data ?? []) as SiteRow[];
  const subjects = (subjectsResult.data ?? []) as SubjectRow[];
  const visits = (visitsResult.data ?? []) as unknown as VisitRow[];
  const actionItems = (actionItemsResult.data ?? []) as unknown as ActionRow[];

  const sitesByStudy = new Map<string, SiteRow[]>();
  for (const site of sites) {
    const rows = sitesByStudy.get(site.study_id) ?? [];
    rows.push(site);
    sitesByStudy.set(site.study_id, rows);
  }

  const subjectsByStudy = new Map<string, SubjectRow[]>();
  for (const subject of subjects) {
    const rows = subjectsByStudy.get(subject.study_id) ?? [];
    rows.push(subject);
    subjectsByStudy.set(subject.study_id, rows);
  }

  const studyRows: StudyDashboardRow[] = studies.map((study) => {
    const studySites = sitesByStudy.get(study.id) ?? [];
    const studySubjects = subjectsByStudy.get(study.id) ?? [];
    const activeSites = studySites.filter((s) => ACTIVE_SITE_STATUSES.has(s.status ?? '')).length;
    const enrollmentTarget = studySites.reduce((acc, s) => acc + (Number(s.target_enrollment) || 0), 0);
    const enrolled = studySubjects.filter((s) => s.is_active !== false && ENROLLED_SUBJECT_STATUSES.has(s.status ?? '')).length;
    return {
      id: study.id,
      title: studyDisplay(study),
      protocolNumber: study.protocol_number,
      phase: study.phase,
      status: study.status,
      updatedAt: study.updated_at,
      activeSites,
      totalSites: studySites.length,
      enrolled,
      enrollmentTarget,
    };
  });

  const totalEnrolled = studyRows.reduce((acc, row) => acc + row.enrolled, 0);
  const totalTarget = studyRows.reduce((acc, row) => acc + row.enrollmentTarget, 0);
  const bucketCounts = new Map<DashboardEnrollmentBucketKey, number>([
    ['on_track', 0],
    ['at_risk', 0],
    ['behind', 0],
    ['not_started', 0],
    ['target_missing', 0],
  ]);
  for (const row of studyRows) {
    const key = enrollmentBucket(row);
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
  }

  const enrollment: DashboardEnrollmentOverview = {
    segments: [
      { key: 'on_track', label: 'On Track', count: bucketCounts.get('on_track') ?? 0, color: '#10b981' },
      { key: 'at_risk', label: 'At Risk', count: bucketCounts.get('at_risk') ?? 0, color: '#3b82f6' },
      { key: 'behind', label: 'Behind', count: bucketCounts.get('behind') ?? 0, color: '#f59e0b' },
      { key: 'not_started', label: 'Not Started', count: bucketCounts.get('not_started') ?? 0, color: '#94a3b8' },
      { key: 'target_missing', label: 'Target Missing', count: bucketCounts.get('target_missing') ?? 0, color: '#64748b' },
    ],
    enrolled: totalEnrolled,
    target: totalTarget,
    percent: percent(totalEnrolled, totalTarget),
    targetMissingCount: bucketCounts.get('target_missing') ?? 0,
  };

  const upcomingVisits: DashboardVisit[] = visits.map((visit) => ({
    id: visit.id,
    studyId: visit.study_id,
    studyTitle: visit.studies?.title ?? 'Untitled study',
    protocolNumber: visit.studies?.protocol_number ?? '',
    siteLabel: siteLabel(visit.study_sites),
    visitType: visit.visit_type ?? 'monitoring',
    plannedDate: visit.planned_date,
    status: visit.status ?? 'planned',
    monitorName: labelFromNames(visit.profiles?.first_name, visit.profiles?.last_name),
    href: `/protected/studies/${visit.study_id}/visits/${visit.id}`,
  }));

  const tasks: DashboardTask[] = actionItems
    .filter((item) => !profile.id || item.assigned_to_id === profile.id)
    .slice(0, 5)
    .map((item) => {
      const due = dueLabel(item.due_date);
      return {
        id: item.id,
        title: item.title,
        studyId: item.protocol_id,
        studyLabel: item.protocol?.protocol_number ?? item.protocol?.title ?? 'General',
        siteLabel: item.category,
        dueDate: item.due_date,
        dueLabel: due.label,
        isDueToday: due.isDueToday,
        priority: item.priority ?? 'medium',
        href: item.protocol_id ? `/protected/studies/${item.protocol_id}/tasks` : '/protected/my-tasks',
      };
    });

  const attention: DashboardAttentionItem[] = [];
  const sitesAtRisk = studyRows.filter((row) => row.enrollmentTarget > 0 && row.enrolled / row.enrollmentTarget < 0.5).length;
  const overdueTasks = actionItems.filter((item) => dueLabel(item.due_date).isOverdue).length;
  const behindStudies = studyRows.filter((row) => enrollmentBucket(row) === 'behind').length;

  if (upcomingVisits.length > 0) {
    attention.push({
      id: 'upcoming-visits',
      kind: 'visit',
      title: `${upcomingVisits.length} visit${upcomingVisits.length === 1 ? '' : 's'} coming up in 30 days`,
      subtitle: upcomingVisits[0]?.studyTitle ?? 'Upcoming monitoring visits',
      href: '/protected/visits',
      tone: 'violet',
    });
  }
  if (behindStudies > 0) {
    attention.push({
      id: 'behind-enrollment',
      kind: 'enrollment',
      title: `${behindStudies} stud${behindStudies === 1 ? 'y is' : 'ies are'} behind enrollment target`,
      subtitle: 'Review study enrollment and site activation',
      href: '/protected/studies/catalog',
      tone: 'amber',
    });
  }
  if (overdueTasks > 0) {
    attention.push({
      id: 'overdue-tasks',
      kind: 'task',
      title: `${overdueTasks} overdue action item${overdueTasks === 1 ? '' : 's'}`,
      subtitle: 'Assigned or open follow-up work needs review',
      href: '/protected/my-tasks',
      tone: 'red',
    });
  }
  if (sitesAtRisk > 0) {
    attention.push({
      id: 'sites-at-risk',
      kind: 'site',
      title: `${sitesAtRisk} stud${sitesAtRisk === 1 ? 'y has' : 'ies have'} low enrollment`,
      subtitle: 'Enrollment is under 50% of configured target',
      href: '/protected/sites',
      tone: 'sky',
    });
  }

  return {
    studyRows,
    upcomingVisits,
    enrollment,
    attention: attention.slice(0, 4),
    tasks,
    kpis: {
      contacts: contactsResult.count ?? 0,
      upcomingVisits: upcomingVisits.length,
      enrollmentValue: `${totalEnrolled.toLocaleString()} / ${totalTarget.toLocaleString()}`,
      enrollmentCaption: totalTarget > 0 ? `${percent(totalEnrolled, totalTarget)}% of target` : 'No enrollment target',
      sitesAtRisk,
    },
  };
}
