import type { SupabaseClient } from '@supabase/supabase-js';

import { listStudyBudgetTemplates } from '@/lib/actions/study-budget-templates';
import { getPendingInvitations, type PendingInvitation } from '@/lib/actions/team';
import type { StudyBudgetTemplate } from '@/lib/types/ctms';

/**
 * Coarse role buckets shown on the User Access Overview donut. The mapping is
 * intentionally lossy: anything that is not an obvious admin / study manager /
 * CRA falls into `other` so the legend stays at four slices.
 */
export type RoleBucket = 'admin' | 'study_manager' | 'cra' | 'other';

export const ROLE_BUCKET_LABEL: Record<RoleBucket, string> = {
  admin: 'Administrators',
  study_manager: 'Study Managers',
  cra: 'CRAs',
  other: 'Other Roles',
};

export interface AdminOverviewProps {
  /** All templates for the company, ordered by `updated_at` desc. Used by KPI count + the templates row. */
  templates: StudyBudgetTemplate[];
  /** Total `profiles` rows for the company. */
  userCount: number;
  /** Count of users in each coarse role bucket; sums to `userCount`. */
  roleBreakdown: Record<RoleBucket, number>;
  /** Pending `invitations` (company) for the admin overview card. */
  pendingInvitations: PendingInvitation[];
  /** Recent live system events composed from existing company audit/workflow tables. */
  recentActivity: AdminRecentActivityItem[];
}

export type AdminActivityKind = 'template' | 'invite' | 'module' | 'report';

export interface AdminRecentActivityItem {
  id: string;
  kind: AdminActivityKind;
  title: string;
  subtitle: string;
  timestamp: string;
}

type ProfileRow = {
  company_id: string;
};

function classifyRole(role: string | null | undefined): RoleBucket {
  const normalized = (role ?? '').toLowerCase().trim();
  if (!normalized) return 'other';
  if (normalized === 'admin' || normalized.includes('administrator')) return 'admin';
  if (
    normalized.includes('study_manager') ||
    normalized.includes('study manager') ||
    normalized.includes('clinical_project_manager') ||
    normalized.includes('project manager')
  ) {
    return 'study_manager';
  }
  if (
    normalized === 'cra' ||
    normalized.includes('clinical_research_associate') ||
    normalized.includes('research associate') ||
    normalized.includes('cra_manager')
  ) {
    return 'cra';
  }
  return 'other';
}

/**
 * Loads the admin-only data slices used by the redesigned `/protected/studies`
 * overview: templates list, total user count, and a four-bucket role
 * breakdown. Caller is expected to have already verified the user has CTMS
 * access.
 */
export async function getAdminOverviewProps(
  supabase: SupabaseClient,
  profile: ProfileRow,
): Promise<AdminOverviewProps> {
  const [templates, profilesResult, pendingInvitations, moduleAuditResult, reportAuditResult] = await Promise.all([
    listStudyBudgetTemplates(profile.company_id).catch(() => [] as StudyBudgetTemplate[]),
    supabase
      .from('profiles')
      .select('role')
      .eq('company_id', profile.company_id),
    getPendingInvitations().catch(() => [] as PendingInvitation[]),
    supabase
      .from('company_module_audit')
      .select('id, changed_at')
      .eq('company_id', profile.company_id)
      .order('changed_at', { ascending: false })
      .limit(6),
    supabase
      .from('report_runs_audit')
      .select('id, dataset_key, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const profileRows = (profilesResult.data ?? []) as Array<{ role: string | null }>;

  const roleBreakdown: Record<RoleBucket, number> = {
    admin: 0,
    study_manager: 0,
    cra: 0,
    other: 0,
  };
  for (const row of profileRows) {
    roleBreakdown[classifyRole(row.role)] += 1;
  }

  const templateActivity: AdminRecentActivityItem[] = templates.slice(0, 4).map((template) => ({
    id: `template:${template.id}`,
    kind: 'template',
    title: `Template "${template.name}" updated`,
    subtitle: 'Study budget template',
    timestamp: template.updated_at,
  }));

  const invitationActivity: AdminRecentActivityItem[] = pendingInvitations.slice(0, 4).map((invite) => ({
    id: `invite:${invite.id}`,
    kind: 'invite',
    title: `User "${invite.email}" invited`,
    subtitle: `${invite.role} · Pending acceptance`,
    timestamp: invite.invited_at,
  }));

  const moduleActivity: AdminRecentActivityItem[] = ((moduleAuditResult.data ?? []) as Array<{
    id: string;
    changed_at: string;
  }>).map((row) => ({
    id: `module:${row.id}`,
    kind: 'module',
    title: 'Module settings updated',
    subtitle: 'Company module access changed',
    timestamp: row.changed_at,
  }));

  const reportActivity: AdminRecentActivityItem[] = ((reportAuditResult.data ?? []) as Array<{
    id: string;
    dataset_key: string | null;
    created_at: string;
  }>).map((row) => ({
    id: `report:${row.id}`,
    kind: 'report',
    title: `Report "${row.dataset_key ?? 'unknown'}" run`,
    subtitle: 'Reporting activity',
    timestamp: row.created_at,
  }));

  const recentActivity = [
    ...templateActivity,
    ...invitationActivity,
    ...moduleActivity,
    ...reportActivity,
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return {
    templates,
    userCount: profileRows.length,
    roleBreakdown,
    pendingInvitations,
    recentActivity,
  };
}
