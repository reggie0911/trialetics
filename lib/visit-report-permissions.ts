/**
 * Study-scoped RBAC for trip reports: CRA authors, CPM reviewers.
 * @see docs/REPORT_SUBMISSION_APPROVAL_WORKFLOW.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamMemberRole } from '@/lib/types/ctms';

export const REPORT_AUTHOR_ROLE: TeamMemberRole = 'clinical_research_associate';
export const REPORT_REVIEWER_ROLE: TeamMemberRole = 'clinical_project_manager';

const AUTHOR_ROLES: TeamMemberRole[] = [REPORT_AUTHOR_ROLE];
const REVIEWER_ROLES: TeamMemberRole[] = [REPORT_REVIEWER_ROLE];
const CRA_OR_CPM: TeamMemberRole[] = [REPORT_AUTHOR_ROLE, REPORT_REVIEWER_ROLE];

export async function getStudyIdForVisit(
  supabase: SupabaseClient,
  visitId: string
): Promise<{ studyId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('monitoring_visits')
    .select('study_id')
    .eq('id', visitId)
    .maybeSingle();
  if (error) return { studyId: null, error: error.message };
  const studyId = (data as { study_id?: string } | null)?.study_id ?? null;
  if (!studyId) return { studyId: null, error: 'Visit has no study assigned.' };
  return { studyId, error: null };
}

export async function getStudyIdForReport(
  supabase: SupabaseClient,
  reportId: string
): Promise<{ visitId: string; studyId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('trip_reports')
    .select('visit_id')
    .eq('id', reportId)
    .maybeSingle();
  if (error) return { visitId: '', studyId: null, error: error.message };
  const visitId = (data as { visit_id?: string } | null)?.visit_id;
  if (!visitId) return { visitId: '', studyId: null, error: 'Report not found.' };
  const { studyId, error: vErr } = await getStudyIdForVisit(supabase, visitId);
  if (vErr || !studyId) return { visitId, studyId: null, error: vErr ?? 'Visit has no study.' };
  return { visitId, studyId, error: null };
}

export async function profileHasStudyRoles(
  supabase: SupabaseClient,
  profileId: string,
  studyId: string,
  roles: TeamMemberRole[]
): Promise<boolean> {
  const { data, error } = await supabase
    .from('study_team_members')
    .select('id')
    .eq('study_id', studyId)
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .in('role', roles)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getUserIsStudyCraAndCpm(
  supabase: SupabaseClient,
  profileId: string,
  studyId: string
): Promise<{ isCra: boolean; isCpm: boolean }> {
  const [isCra, isCpm] = await Promise.all([
    profileHasStudyRoles(supabase, profileId, studyId, AUTHOR_ROLES),
    profileHasStudyRoles(supabase, profileId, studyId, REVIEWER_ROLES),
  ]);
  return { isCra, isCpm };
}

/** CRA may author (draft, submit, recall when author). */
export async function assertReportAuthorPermission(
  supabase: SupabaseClient,
  profileId: string,
  reportId: string
): Promise<string | null> {
  const { studyId, error } = await getStudyIdForReport(supabase, reportId);
  if (error) return error;
  const ok = await profileHasStudyRoles(supabase, profileId, studyId!, AUTHOR_ROLES);
  if (!ok) return 'Only a Clinical Research Associate assigned to this study can perform this action.';
  return null;
}

/** CPM may review workflow actions (start review, assign reviewer, etc.). */
export async function assertReportCpmPermission(
  supabase: SupabaseClient,
  profileId: string,
  reportId: string
): Promise<string | null> {
  const { studyId, error } = await getStudyIdForReport(supabase, reportId);
  if (error) return error;
  const ok = await profileHasStudyRoles(supabase, profileId, studyId!, REVIEWER_ROLES);
  if (!ok) return 'Only a Clinical Project Manager assigned to this study can perform this action.';
  return null;
}

/**
 * Reviewer comments / return / approve: assigned reviewer OR any CPM on study.
 */
export async function assertReportReviewerPermission(
  supabase: SupabaseClient,
  profileId: string,
  reportId: string,
  reviewerId: string | null | undefined
): Promise<string | null> {
  const { studyId, error } = await getStudyIdForReport(supabase, reportId);
  if (error) return error;
  const isCpm = await profileHasStudyRoles(supabase, profileId, studyId!, REVIEWER_ROLES);
  if (isCpm) return null;
  if (reviewerId && profileId === reviewerId) return null;
  return 'Only the assigned reviewer or a Clinical Project Manager on this study can perform this action.';
}

export async function getProfileRole(
  supabase: SupabaseClient,
  profileId: string
): Promise<'admin' | 'user' | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', profileId).maybeSingle();
  const r = (data as { role?: string } | null)?.role;
  if (r === 'admin' || r === 'user') return r;
  return null;
}

/**
 * View: approved → company (RLS); in-flight → CRA, CPM, or company admin.
 */
export async function canViewTripReportContent(
  supabase: SupabaseClient,
  profileId: string | null,
  reportStatus: string | null | undefined,
  studyId: string
): Promise<boolean> {
  if (reportStatus === 'approved_and_signed') return true;
  if (!profileId) return false;
  const { isCra, isCpm } = await getUserIsStudyCraAndCpm(supabase, profileId, studyId);
  if (isCra || isCpm) return true;
  const appRole = await getProfileRole(supabase, profileId);
  return appRole === 'admin';
}

/** CRA may create visit+report for a study. */
export async function assertVisitAuthorForStudy(
  supabase: SupabaseClient,
  profileId: string,
  studyId: string
): Promise<string | null> {
  const ok = await profileHasStudyRoles(supabase, profileId, studyId, AUTHOR_ROLES);
  if (!ok) return 'Only a Clinical Research Associate assigned to this study can create a visit report.';
  return null;
}

export { AUTHOR_ROLES, REVIEWER_ROLES, CRA_OR_CPM };
