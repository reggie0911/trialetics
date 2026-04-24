'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { createAdminClient } from '@/lib/server-admin';
import type {
  TripReportDaysBasis,
  VisitReportTemplate,
  VisitReportTemplateQuestion,
  VisitReportType,
} from '@/lib/types/visit-reports';
import { studySelectLabel } from '@/lib/ctms/study-display';
import {
  VISIT_TYPE_LABEL,
  type MonitoringVisitType,
  type SubjectCrfPercentages,
  type SubjectCrfQueryStatus,
} from '@/lib/types/ctms';
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import {
  assertReportAuthorPermission,
  assertReportCpmPermission,
  assertReportReviewerPermission,
  assertVisitAuthorForStudy,
  canViewTripReportContent,
  getProfileRole,
  getStudyIdForReport,
  getStudyIdForVisit,
  getUserIsStudyCraAndCpm,
  profileHasStudyRoles,
  REPORT_REVIEWER_ROLE,
} from '@/lib/visit-report-permissions';
import {
  logTripReportSignatureAudit,
  logTripReportStatusEvent,
} from '@/lib/trip-report-audit';
import {
  TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_AUTHOR_ATTESTATION,
  TRIP_REPORT_VOID_ATTESTATION,
  assertPasswordReverified,
  computeReportContentHash,
  namesMatch,
} from '@/lib/visit-report-signature';
import { headers } from 'next/headers';
import {
  notifyReportApproved,
  notifyReportReturnedToAuthor,
  notifyReportSubmitted,
  notifyReviewerAssigned,
} from '@/lib/trip-report-notifications';
import { getCompanyLogoUrl } from '@/lib/actions/company';
import { buildVisitReportPdfData } from '@/lib/utils/build-visit-report-pdf-data';
import {
  MAX_ATTACHMENTS_PER_REPORT,
  validateAttachmentCandidate,
} from '@/lib/visit-report-attachments-policy';
import type { VisitReportPdfData } from '@/components/ctms/trip-reports/visit-report-pdf-document';
import {
  TRIP_REPORT_DEFAULT_PAGE_SIZE as TRIP_REPORT_DEFAULT_PAGE_SIZE_PURE,
  TRIP_REPORT_MAX_PAGE_SIZE as TRIP_REPORT_MAX_PAGE_SIZE_PURE,
  bucketizeOverdueDays,
  compareForSort as compareForSortPure,
  emptyAgingBuckets,
  normalizeTripReportPagination as normalizeTripReportPaginationPure,
  type TrackerAgingBuckets as TrackerAgingBucketsPure,
  type TripReportPaginationOptions as TripReportPaginationOptionsPure,
  type TripReportSortDirection as TripReportSortDirectionPure,
  type TripReportSortOption as TripReportSortOptionPure,
} from '@/lib/trip-report-compliance';
import {
  loadTemplateForReport,
  maybeRefreshSnapshotForReport,
  resolveTemplateQuestionVersionId,
  snapshotTemplateForReport,
} from '@/lib/actions/visit-report-template-versions';

async function getProfileId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('No profile found');
  return profile.id;
}

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

/**
 * Load the signer's identity for a Part 11 signature: profile id +
 * first/last name (for `namesMatch`) + auth email (for the password
 * reverification round-trip). Returns a typed error string on failure
 * so callers can surface it as a 400/401-style result.
 */
async function loadSignerIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{
  profileId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  error: string | null;
}> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { profileId: null, email: null, firstName: null, lastName: null, error: 'Not authenticated.' };
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return { profileId: null, email: user.email ?? null, firstName: null, lastName: null, error: 'No profile found.' };
  }
  const p = profile as { id: string; first_name: string | null; last_name: string | null };
  return {
    profileId: p.id,
    email: user.email ?? null,
    firstName: p.first_name,
    lastName: p.last_name,
    error: null,
  };
}

/**
 * Best-effort capture of the request IP and User-Agent for signature
 * audit rows. Falls back to nulls if `headers()` is not available
 * (e.g. test environments) so we never block a legitimate signature on
 * audit-metadata collection.
 */
async function captureSignatureRequestMetadata(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const fwd = h.get('x-forwarded-for');
    const ip = (fwd?.split(',')[0]?.trim() || h.get('x-real-ip') || null) ?? null;
    const ua = h.get('user-agent') ?? null;
    return { ipAddress: ip, userAgent: ua };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Revalidate the trip-report related UI surfaces.
 *
 * Pass `studyId` whenever it is known so the per-study trip-reports route is
 * invalidated specifically. We intentionally avoid invalidating the entire
 * `/protected/studies` layout - that wipes every study tab in the cache and
 * creates noticeable navigation latency for users in unrelated studies.
 */
function revalidateTripReportRelatedUi(studyId?: string | null) {
  revalidatePath('/protected/trip-reports');
  revalidatePath('/protected/visits');
  if (studyId) {
    revalidatePath(`/protected/studies/${studyId}/trip-reports`);
    revalidatePath(`/protected/studies/${studyId}/trip-reports`, 'layout');
  }
}

/**
 * Look up the studyId from a reportId and call `revalidateTripReportRelatedUi`.
 * Use this in mutation actions that only have the reportId in scope so we still
 * invalidate the per-study trip-reports route without falling back to a layout-wide
 * revalidation.
 */
async function revalidateAfterReportMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string
): Promise<void> {
  const { studyId } = await getStudyIdForReport(supabase, reportId);
  revalidateTripReportRelatedUi(studyId);
}

export interface TripReportSummaryRow {
  id: string;
  visit_id: string;
  study_id: string;
  site_name: string;
  visit_name: string;
  visit_type: string;
  country_name: string;
  visit_start_date: string | null;
  report_status: string;
  report_id: string | null;
  report_author: string | null;
  can_edit_report: boolean;
  can_review_report: boolean;
  can_view_report: boolean;
  submission_overdue: boolean;
}

export interface TripReportTrackerRow {
  visit_id: string;
  study_id: string;
  study_name: string;
  site_name: string;
  visit_type: string;
  /** Persisted monitoring_visits.visit_name; auto-derived for legacy null rows. */
  visit_name: string;
  visit_id_display: string;
  visit_end_date: string | null;
  report_status: string;
  days_until_submission_due: number | null;
  days_until_approval_due: number | null;
  report_author: string | null;
  submission_date: string | null;
  /** Same source as DB approved_date; shown as VR Approval Date */
  approved_date: string | null;
  reviewer: string | null;
  approver: string | null;
  compliance_status: string;
  report_id: string | null;
  can_edit_report: boolean;
  can_review_report: boolean;
  can_view_report: boolean;
  is_report_author: boolean;
  can_send_to_review: boolean;
  can_recall_report: boolean;
  submission_overdue: boolean;
  approval_overdue: boolean;
  /** From template offsets + visit anchor; else stored submission_due_date when no template */
  expected_vr_submission_date: string | null;
  expected_vr_approval_date: string | null;
  submission_compliance: string;
  submission_days: number | null;
  vr_reviewed_date: string | null;
  review_days: number | null;
  approval_compliance: string;
  approval_days: number | null;
  expected_send_date_confirmation_letter: string | null;
  expected_send_date_followup_letter: string | null;
  date_followup_letter_uploaded: string | null;
  date_mvl_log_uploaded: string | null;
}

export interface TripReportReviewQueueRow {
  visit_id: string;
  study_id: string;
  study_name: string;
  site_name: string;
  visit_type: string;
  report_id: string;
  report_status: string;
  report_author: string | null;
  reviewer_id: string | null;
}

/** Supabase join shape for monitoring_visits + study_sites + studies (client row may be array-nested) */
type VisitRow = {
  id: string;
  study_id: string;
  site_id?: string | null;
  visit_type: string;
  planned_date?: string | null;
  actual_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  visit_name?: string | null;
  created_at?: string | null;
  study_sites?: { name: string; study_countries?: { country_name: string } | null } | null;
  studies?: { title: string; protocol_number?: string | null } | null;
};

/**
 * Build a `visitId -> visit_name` map that mirrors the SQL backfill rule:
 * for any row whose persisted `visit_name` is null, derive
 * `${VISIT_TYPE_LABEL[visit_type]} -${rank}` where rank is the row's
 * 1-based position within (study_id, site_id, visit_type) ordered by
 * (created_at, id). Persisted names are returned as-is.
 *
 * The on-the-fly derivation is purely a defensive read-side fallback - the
 * canonical write path is `createSiteVisitWithReport` and the
 * 20260528000000 backfill migration; once both are in place, there should
 * be no null `visit_name` rows in practice.
 */
function buildVisitNameMap(
  visits: { id: string; study_id?: string | null; site_id?: string | null; visit_type?: string | null; visit_name?: string | null; created_at?: string | null }[]
): Map<string, string> {
  const groups = new Map<string, { id: string; created_at: string }[]>();
  for (const v of visits) {
    if (v.visit_name) continue;
    const key = `${v.study_id ?? ''}::${v.site_id ?? ''}::${v.visit_type ?? ''}`;
    const list = groups.get(key) ?? [];
    list.push({ id: v.id, created_at: v.created_at ?? '' });
    groups.set(key, list);
  }
  const derived = new Map<string, string>();
  for (const [key, list] of groups) {
    list.sort((a, b) => {
      if (a.created_at && b.created_at && a.created_at !== b.created_at) {
        return a.created_at < b.created_at ? -1 : 1;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    const visitType = key.split('::')[2] ?? '';
    const label = (VISIT_TYPE_LABEL as Record<string, string | undefined>)[visitType] ?? visitType;
    list.forEach((row, idx) => {
      derived.set(row.id, `${label} -${idx + 1}`);
    });
  }
  const out = new Map<string, string>();
  for (const v of visits) {
    if (v.visit_name) {
      out.set(v.id, v.visit_name);
    } else {
      out.set(v.id, derived.get(v.id) ?? '—');
    }
  }
  return out;
}

type ReportRow = {
  id: string;
  report_status?: string;
  status?: string;
  created_by?: string | null;
  reviewer_id?: string | null;
};

export type TrackerAgingBuckets = TrackerAgingBucketsPure;

export interface TrackerBreakdownEntry {
  /** Display label (author name, site name, etc.). */
  label: string;
  /** Total tracker rows in this bucket. */
  total: number;
  /** Overdue submissions count. */
  submissionOverdue: number;
  /** Overdue approvals count. */
  approvalOverdue: number;
  /** Compliant submissions count. */
  submissionCompleted: number;
  /** Compliant approvals count. */
  approvalCompleted: number;
}

export interface TrackerComplianceMetrics {
  submissionCompleted: number;
  submissionOverdue: number;
  submissionTotal: number;
  submissionPercent: number;
  approvalCompleted: number;
  approvalOverdue: number;
  approvalTotal: number;
  approvalPercent: number;
  /** Aging buckets for *currently* overdue submissions (not yet submitted). */
  submissionAging: TrackerAgingBuckets;
  /** Aging buckets for *currently* overdue approvals (not yet approved). */
  approvalAging: TrackerAgingBuckets;
  /** Per-author breakdown, sorted by total descending then label. */
  byAuthor: TrackerBreakdownEntry[];
  /** Per-site breakdown, sorted by total descending then label. */
  bySite: TrackerBreakdownEntry[];
}

function latestTripReportByVisitId(
  rows: { visit_id: string; created_at?: string | null; [key: string]: unknown }[]
): Map<string, (typeof rows)[number]> {
  const map = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = map.get(r.visit_id);
    if (!prev || (r.created_at && (!prev.created_at || String(r.created_at) > String(prev.created_at)))) {
      map.set(r.visit_id, r);
    }
  }
  return map;
}

function isoDateOnly(iso: string): string {
  return String(iso).split('T')[0];
}

function normalizeTripReportDaysBasis(raw: string | null | undefined): TripReportDaysBasis {
  return raw === 'business' ? 'business' : 'calendar';
}

/** Match createSiteVisitWithReport: add whole calendar days from a YYYY-MM-DD anchor (date-only safe). */
function addCalendarDaysFromIsoDate(anchor: string, days: number): string {
  const part = isoDateOnly(anchor);
  const start = new Date(`${part}T12:00:00.000Z`);
  return new Date(start.getTime() + days * 86400000).toISOString().split('T')[0];
}

/**
 * v1 business days: skip Saturday/Sunday (UTC). Public holidays are not excluded.
 * Cumulative with calendar mode: submission at N business days from anchor; approval at (N+M) business days from anchor.
 */
function addBusinessDaysFromIsoDate(anchorIso: string, days: number): string {
  if (!Number.isFinite(days) || days <= 0) return isoDateOnly(anchorIso);
  const anchor = isoDateOnly(anchorIso);
  const d = new Date(`${anchor}T12:00:00.000Z`);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().split('T')[0];
}

function addTripReportDueDaysFromAnchor(
  anchorIso: string,
  days: number,
  basis: TripReportDaysBasis
): string {
  if (basis === 'business') return addBusinessDaysFromIsoDate(anchorIso, days);
  return addCalendarDaysFromIsoDate(anchorIso, days);
}

function submissionAndApprovalDueFromVisitStart(
  visitStartIso: string,
  daysSubmission: number,
  daysApproval: number,
  basis: TripReportDaysBasis
): { submissionDue: string; approvalDue: string } {
  const submissionDue = addTripReportDueDaysFromAnchor(visitStartIso, daysSubmission, basis);
  const approvalDue = addTripReportDueDaysFromAnchor(visitStartIso, daysSubmission + daysApproval, basis);
  return { submissionDue, approvalDue };
}

function calendarDaysBetweenIso(from: string, to: string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

function isoDateFromReviewedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const part = String(iso).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : null;
}

const AUTHOR_EDIT_STATUSES = new Set(['report_pending', 'authoring', 'returned']);

async function assertAuthorCanEditReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  reportId: string
): Promise<string | null> {
  const roleErr = await assertReportAuthorPermission(supabase, profileId, reportId);
  if (roleErr) return roleErr;
  const { data: row } = await supabase.from('trip_reports').select('report_status').eq('id', reportId).maybeSingle();
  const st = (row as { report_status?: string } | null)?.report_status ?? 'report_pending';
  const norm = st === 'draft' ? 'report_pending' : st;
  if (!AUTHOR_EDIT_STATUSES.has(norm)) {
    return 'This report cannot be edited in its current status.';
  }
  return null;
}

export async function getStudyCpmsForReviewerAssignment(
  studyId: string,
  options?: { includeReviewerProfileId?: string | null }
): Promise<{ id: string; displayName: string }[]> {
  const supabase = await createClient();
  const profileId = await getProfileId();
  const isCpm = await profileHasStudyRoles(supabase, profileId, studyId, [REPORT_REVIEWER_ROLE]);
  if (!isCpm) return [];
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('study_team_members')
    .select('profile_id')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .eq('role', REPORT_REVIEWER_ROLE);
  const ids = [...new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))];
  const includeId = options?.includeReviewerProfileId?.trim() || null;
  const idQuery = [...ids];
  if (includeId && !idQuery.includes(includeId)) idQuery.push(includeId);
  if (idQuery.length === 0) return [];

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', idQuery);
  const rows = (profiles ?? []).map((p: { id: string; first_name: string | null; last_name: string | null }) => ({
    id: p.id,
    displayName: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
  }));

  if (includeId && !rows.some((r) => r.id === includeId)) {
    const { data: extra } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', includeId)
      .maybeSingle();
    const e = extra as { id: string; first_name: string | null; last_name: string | null } | null;
    if (e) {
      rows.push({
        id: e.id,
        displayName: [e.first_name, e.last_name].filter(Boolean).join(' ') || '—',
      });
    }
  }

  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
}

/** Server-side pagination defaults for trip report tables. */
export type TripReportSortDirection = TripReportSortDirectionPure;
export type TripReportSortOption = TripReportSortOptionPure;
export type TripReportPaginationOptions = TripReportPaginationOptionsPure;

const SUMMARY_SORTABLE_COLUMNS = new Set<string>([
  'site_name',
  'visit_name',
  'visit_type',
  'country_name',
  'visit_start_date',
  'report_status',
  'report_author',
]);

const TRACKER_SORTABLE_COLUMNS = new Set<string>([
  'study_name',
  'site_name',
  'visit_name',
  'visit_type',
  'visit_end_date',
  'report_status',
  'report_author',
  'days_until_submission_due',
  'days_until_approval_due',
  'submission_date',
  'approved_date',
  'submission_compliance',
  'approval_compliance',
  'compliance_status',
]);

const compareForSort = compareForSortPure;

export interface TripReportSummaryListResult {
  rows: TripReportSummaryRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TripReportTrackerListResult {
  rows: TripReportTrackerRow[];
  metrics: TrackerComplianceMetrics;
  total: number;
  page: number;
  pageSize: number;
}

const normalizeTripReportPagination = normalizeTripReportPaginationPure;

export async function getTripReportSummaryList(
  studyId?: string | null,
  options?: TripReportPaginationOptions
): Promise<TripReportSummaryListResult> {
  const { page, pageSize } = normalizeTripReportPagination(options);
  const supabase = await createClient();
  let currentProfileId: string | null = null;
  try {
    currentProfileId = await getProfileId();
  } catch {
    currentProfileId = null;
  }

  let visitQuery = supabase
    .from('monitoring_visits')
    .select(`
      id,
      study_id,
      site_id,
      visit_type,
      planned_date,
      start_date,
      visit_name,
      created_at,
      study_sites (
        name,
        study_countries ( country_name )
      ),
      studies ( title, protocol_number )
    `)
    .order('planned_date', { ascending: false, nullsFirst: true });
  if (studyId) visitQuery = visitQuery.eq('study_id', studyId);
  const { data: visits, error } = await visitQuery;

  if (error) throw new Error(error.message);

  const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
  const visitNameById = buildVisitNameMap(
    (visits ?? []) as unknown as {
      id: string;
      study_id?: string | null;
      site_id?: string | null;
      visit_type?: string | null;
      visit_name?: string | null;
      created_at?: string | null;
    }[]
  );
  const admin = createAdminClient();
  let reportByVisit = new Map<string, Record<string, unknown>>();
  if (visitIds.length > 0) {
    const { data: reportRows } = await admin
      .from('trip_reports')
      .select(
        'id, visit_id, report_status, status, created_by, submission_due_date, created_at'
      )
      .in('visit_id', visitIds);
    reportByVisit = latestTripReportByVisitId(
      (reportRows ?? []) as { visit_id: string; created_at?: string | null }[]
    ) as unknown as Map<string, Record<string, unknown>>;
  }

  const createdByIds = [...reportByVisit.values()]
    .map((r) => r.created_by as string | undefined)
    .filter(Boolean) as string[];

  const authorByProfileId: Record<string, string> = {};
  if (createdByIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', [...new Set(createdByIds)]);
    (profiles ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      authorByProfileId[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
    });
  }

  // Batch CRA/CPM membership lookup once per (study_id, profile) instead of
  // running study_team_members queries per visit row.
  const summaryStudyIds = [
    ...new Set(
      (visits ?? [])
        .map((v) => (v as unknown as VisitRow).study_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  type SummaryStudyRoles = { isCra: boolean; isCpm: boolean };
  const summaryRolesByStudy = new Map<string, SummaryStudyRoles>();
  let summaryAppRoleIsAdmin = false;
  if (currentProfileId) {
    if (summaryStudyIds.length > 0) {
      const { data: memberRows } = await admin
        .from('study_team_members')
        .select('study_id, role')
        .eq('profile_id', currentProfileId)
        .eq('is_active', true)
        .in('role', ['clinical_research_associate', 'clinical_project_manager'])
        .in('study_id', summaryStudyIds);
      for (const m of memberRows ?? []) {
        const row = m as { study_id: string; role: string };
        const flags = summaryRolesByStudy.get(row.study_id) ?? { isCra: false, isCpm: false };
        if (row.role === 'clinical_research_associate') flags.isCra = true;
        if (row.role === 'clinical_project_manager') flags.isCpm = true;
        summaryRolesByStudy.set(row.study_id, flags);
      }
    }
    const role = await getProfileRole(supabase, currentProfileId);
    summaryAppRoleIsAdmin = role === 'admin';
  }

  const today = new Date().toISOString().split('T')[0];
  const rows: TripReportSummaryRow[] = [];

  for (const v of visits ?? []) {
    const vr = v as unknown as VisitRow;
    const site = vr.study_sites;
    const countryName = site?.study_countries?.country_name ?? '—';
    const studyId = vr.study_id;
    const report = reportByVisit.get(v.id) ?? null;
    const rawStatus = (report?.report_status as string | undefined) ?? (report?.status as string | undefined) ?? 'report_pending';
    const status = rawStatus === 'draft' ? 'report_pending' : rawStatus;
    const author = report?.created_by ? authorByProfileId[report.created_by as string] ?? null : null;
    const subDue = (report?.submission_due_date as string | null | undefined) ?? null;
    const daysSub = subDue ? Math.floor((new Date(subDue).getTime() - new Date(today).getTime()) / 86400000) : null;
    const submitted = status !== 'report_pending' && status !== 'authoring';
    const submission_overdue = !!(subDue && !submitted && daysSub !== null && daysSub < 0);

    const summaryFlags: SummaryStudyRoles = (currentProfileId && studyId && summaryRolesByStudy.get(studyId)) || { isCra: false, isCpm: false };
    const isCra = summaryFlags.isCra;
    const isCpm = summaryFlags.isCpm;

    const can_edit_report =
      isCra && !!report && ['report_pending', 'authoring', 'returned'].includes(status);
    const can_review_report = isCpm && !!report && ['submitted', 'under_review'].includes(status);
    let can_view_report = false;
    if (report) {
      if (status === 'approved_and_signed') {
        can_view_report = true;
      } else if (currentProfileId) {
        can_view_report = isCra || isCpm || summaryAppRoleIsAdmin;
      }
    }

    rows.push({
      id: v.id,
      visit_id: v.id,
      study_id: studyId ?? '',
      site_name: site?.name ?? '—',
      visit_name: visitNameById.get(v.id) ?? '—',
      visit_type: v.visit_type ?? '—',
      country_name: countryName,
      visit_start_date: vr.start_date ?? v.planned_date ?? null,
      report_status: status,
      report_id: (report?.id as string | undefined) ?? null,
      report_author: author ?? '—',
      can_edit_report,
      can_review_report,
      can_view_report,
      submission_overdue,
    });
  }

  if (options?.sort && SUMMARY_SORTABLE_COLUMNS.has(options.sort.column)) {
    const { column, direction } = options.sort;
    rows.sort((a, b) => compareForSort(
      (a as unknown as Record<string, unknown>)[column],
      (b as unknown as Record<string, unknown>)[column],
      direction
    ));
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);
  return { rows: pagedRows, total, page, pageSize };
}

/** Prefer `studies.study_name` in tracker/queue; fall back to `title` for legacy rows. */
function trackerStudyDisplayName(
  studies: { title?: string | null; study_name?: string | null } | null | undefined
): string {
  const name = studies?.study_name?.trim();
  if (name) return name;
  const title = studies?.title?.trim();
  return title || '—';
}

export async function getTripReportTrackerList(
  studyId?: string | null,
  options?: TripReportPaginationOptions
): Promise<TripReportTrackerListResult> {
  const { page, pageSize } = normalizeTripReportPagination(options);
  const supabase = await createClient();
  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  let currentProfileId: string | null = null;
  try {
    currentProfileId = await getProfileId();
  } catch {
    currentProfileId = null;
  }

  let trackerVisitQuery = supabase
    .from('monitoring_visits')
    .select(`
      id,
      study_id,
      site_id,
      visit_type,
      planned_date,
      actual_date,
      start_date,
      end_date,
      visit_name,
      created_at,
      study_sites ( name ),
      studies ( title, study_name )
    `)
    .order('planned_date', { ascending: false, nullsFirst: true });
  if (studyId) trackerVisitQuery = trackerVisitQuery.eq('study_id', studyId);
  const { data: visits, error } = await trackerVisitQuery;

  if (error) {
    const emptyMetrics: TrackerComplianceMetrics = {
      submissionCompleted: 0,
      submissionOverdue: 0,
      submissionTotal: 0,
      submissionPercent: 0,
      approvalCompleted: 0,
      approvalOverdue: 0,
      approvalTotal: 0,
      approvalPercent: 0,
      submissionAging: emptyAgingBuckets(),
      approvalAging: emptyAgingBuckets(),
      byAuthor: [],
      bySite: [],
    };
    return { rows: [], metrics: emptyMetrics, total: 0, page, pageSize };
  }

  const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
  const visitNameById = buildVisitNameMap(
    (visits ?? []) as unknown as {
      id: string;
      study_id?: string | null;
      site_id?: string | null;
      visit_type?: string | null;
      visit_name?: string | null;
      created_at?: string | null;
    }[]
  );
  let reportByVisit = new Map<string, Record<string, unknown>>();
  if (visitIds.length > 0) {
    const { data: reportRows } = await admin
      .from('trip_reports')
      .select(
        'id, visit_id, status, report_status, template_id, submitted_date, approved_date, reviewed_at, created_by, approved_by, reviewer_id, submission_due_date, approval_due_date, created_at, expected_send_date_confirmation_letter, expected_send_date_followup_letter, date_followup_letter_uploaded, date_mvl_log_uploaded'
      )
      .in('visit_id', visitIds);
    reportByVisit = latestTripReportByVisitId(
      (reportRows ?? []) as { visit_id: string; created_at?: string | null }[]
    ) as unknown as Map<string, Record<string, unknown>>;
  }

  const templateIds = [
    ...new Set(
      [...reportByVisit.values()]
        .map((r) => r.template_id as string | undefined)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const templateById = new Map<
    string,
    { days_submission: number; days_approval: number; days_basis: TripReportDaysBasis }
  >();
  if (templateIds.length > 0) {
    const { data: tmplRows } = await admin
      .from('visit_report_templates')
      .select('id, days_submission, days_approval, days_basis')
      .in('id', templateIds);
    for (const t of tmplRows ?? []) {
      const row = t as {
        id: string;
        days_submission: number | null;
        days_approval: number | null;
        days_basis: string | null;
      };
      templateById.set(row.id, {
        days_submission: row.days_submission ?? 14,
        days_approval: row.days_approval ?? 7,
        days_basis: normalizeTripReportDaysBasis(row.days_basis),
      });
    }
  }

  const createdByIds = new Set<string>();
  const reviewerIds = new Set<string>();
  const approverIds = new Set<string>();
  for (const r of reportByVisit.values()) {
    if (r.created_by) createdByIds.add(r.created_by as string);
    if (r.reviewer_id) reviewerIds.add(r.reviewer_id as string);
    if (r.approved_by) approverIds.add(r.approved_by as string);
  }

  const allProfileIds = [...createdByIds, ...reviewerIds, ...approverIds];
  const profileNames: Record<string, string> = {};
  if (allProfileIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', [...new Set(allProfileIds)]);
    (profiles ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      profileNames[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
    });
  }

  // Batch CRA/CPM membership lookup once per (study_id, profile) instead of
  // hitting study_team_members per visit row inside the loop below. Also
  // resolve the global app role once for `canViewTripReportContent` fallbacks.
  const studyIdsForPerm = [
    ...new Set(
      (visits ?? [])
        .map((v) => (v as unknown as VisitRow).study_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  type StudyRoles = { isCra: boolean; isCpm: boolean };
  const rolesByStudy = new Map<string, StudyRoles>();
  let appRoleIsAdmin = false;
  if (currentProfileId) {
    if (studyIdsForPerm.length > 0) {
      const { data: memberRows } = await admin
        .from('study_team_members')
        .select('study_id, role')
        .eq('profile_id', currentProfileId)
        .eq('is_active', true)
        .in('role', ['clinical_research_associate', 'clinical_project_manager'])
        .in('study_id', studyIdsForPerm);
      for (const m of memberRows ?? []) {
        const row = m as { study_id: string; role: string };
        const flags = rolesByStudy.get(row.study_id) ?? { isCra: false, isCpm: false };
        if (row.role === 'clinical_research_associate') flags.isCra = true;
        if (row.role === 'clinical_project_manager') flags.isCpm = true;
        rolesByStudy.set(row.study_id, flags);
      }
    }
    const role = await getProfileRole(supabase, currentProfileId);
    appRoleIsAdmin = role === 'admin';
  }

  let submissionCompleted = 0;
  let submissionOverdue = 0;
  let approvalCompleted = 0;
  let approvalOverdue = 0;

  const rows: TripReportTrackerRow[] = [];

  const preSubmissionStatuses = new Set(['report_pending', 'authoring', 'returned']);

  for (const v of visits ?? []) {
    const vr = v as unknown as VisitRow;
    const report = reportByVisit.get(v.id) ?? null;
    const rawStatus = (report?.report_status as string | undefined) ?? (report?.status as string | undefined) ?? 'report_pending';
    const status = rawStatus === 'draft' ? 'report_pending' : rawStatus;
    const endDate = vr.end_date ?? v.actual_date ?? v.planned_date ?? null;
    const anchor = vr.start_date ?? v.planned_date ?? null;
    const storedSubDue = (report?.submission_due_date as string | null | undefined) ?? null;
    const storedAppDue = (report?.approval_due_date as string | null | undefined) ?? null;
    const templateId = (report?.template_id as string | null | undefined) ?? null;

    let expectedSub: string | null = null;
    let expectedApp: string | null = null;
    if (templateId && anchor) {
      const tmpl = templateById.get(templateId);
      const ds = tmpl?.days_submission ?? 14;
      const da = tmpl?.days_approval ?? 7;
      const basis = tmpl?.days_basis ?? 'calendar';
      expectedSub = addTripReportDueDaysFromAnchor(anchor, ds, basis);
      expectedApp = addTripReportDueDaysFromAnchor(anchor, ds + da, basis);
    } else {
      expectedSub = storedSubDue;
      expectedApp = storedAppDue;
    }

    const daysSub = expectedSub ? Math.floor((new Date(expectedSub).getTime() - new Date(today).getTime()) / 86400000) : null;
    const daysApp = expectedApp ? Math.floor((new Date(expectedApp).getTime() - new Date(today).getTime()) / 86400000) : null;

    const submitted = status !== 'report_pending' && status !== 'authoring';
    if (expectedSub) {
      if (submitted) submissionCompleted++;
      else if (daysSub !== null && daysSub < 0) submissionOverdue++;
    }
    const approved = status === 'approved_and_signed';
    if (expectedApp) {
      if (approved) approvalCompleted++;
      else if (daysApp !== null && daysApp < 0) approvalOverdue++;
    }

    let complianceStatus = '—';
    if (expectedSub && expectedApp) {
      if (approved) complianceStatus = 'Compliant';
      else if ((daysSub !== null && daysSub < 0) || (daysApp !== null && daysApp < 0)) complianceStatus = 'Overdue';
    }

    const submittedDate = (report?.submitted_date as string | null | undefined) ?? null;
    const approvedDate = (report?.approved_date as string | null | undefined) ?? null;
    const reviewedAt = (report?.reviewed_at as string | null | undefined) ?? null;
    const vrReviewedDate = isoDateFromReviewedAt(reviewedAt);

    let submissionCompliance = '—';
    if (!expectedSub) submissionCompliance = '—';
    else if (!submittedDate && preSubmissionStatuses.has(status)) submissionCompliance = 'Pending';
    else if (!submittedDate) submissionCompliance = '—';
    else if (submittedDate <= expectedSub) submissionCompliance = 'Compliant';
    else submissionCompliance = 'Non-compliant';

    let approvalCompliance = '—';
    if (!expectedApp) approvalCompliance = '—';
    else if (!approvedDate && !approved) approvalCompliance = 'Pending';
    else if (!approvedDate) approvalCompliance = '—';
    else if (approvedDate <= expectedApp) approvalCompliance = 'Compliant';
    else approvalCompliance = 'Non-compliant';

    const submissionDays =
      endDate && submittedDate ? calendarDaysBetweenIso(endDate, submittedDate) : null;
    const reviewDays =
      submittedDate && vrReviewedDate ? calendarDaysBetweenIso(submittedDate, vrReviewedDate) : null;
    let approvalDays: number | null = null;
    if (vrReviewedDate && approvedDate) approvalDays = calendarDaysBetweenIso(vrReviewedDate, approvedDate);
    else if (submittedDate && approvedDate) approvalDays = calendarDaysBetweenIso(submittedDate, approvedDate);

    const studyId = vr.study_id;
    const studyFlags: StudyRoles = (currentProfileId && studyId && rolesByStudy.get(studyId)) || { isCra: false, isCpm: false };
    const isCra = studyFlags.isCra;
    const isCpm = studyFlags.isCpm;
    const can_edit_report =
      isCra && !!report && ['report_pending', 'authoring', 'returned'].includes(status);
    const can_review_report = isCpm && !!report && ['submitted', 'under_review'].includes(status);
    let can_view_report = false;
    if (report) {
      if (status === 'approved_and_signed') {
        can_view_report = true;
      } else if (currentProfileId) {
        can_view_report = isCra || isCpm || appRoleIsAdmin;
      }
    }
    const is_report_author = !!(
      report &&
      currentProfileId &&
      (report.created_by as string | null | undefined) === currentProfileId
    );
    const can_send_to_review =
      is_report_author && isCra && (status === 'authoring' || status === 'returned');
    const can_recall_report = is_report_author && isCra && status === 'submitted';
    const submission_overdue = !!(expectedSub && !submitted && daysSub !== null && daysSub < 0);
    const approval_overdue = !!(expectedApp && !approved && daysApp !== null && daysApp < 0);

    rows.push({
      visit_id: v.id,
      study_id: studyId ?? '',
      study_name: trackerStudyDisplayName(
        vr.studies as { title?: string | null; study_name?: string | null } | null | undefined
      ),
      site_name: vr.study_sites?.name ?? '—',
      visit_type: v.visit_type,
      visit_name: visitNameById.get(v.id) ?? '—',
      visit_id_display: `V-${v.id.slice(0, 12).toUpperCase()}`,
      visit_end_date: endDate,
      report_status: status,
      days_until_submission_due: daysSub,
      days_until_approval_due: daysApp,
      report_author: report?.created_by ? profileNames[report.created_by as string] ?? null : null,
      submission_date: submittedDate,
      approved_date: approvedDate,
      reviewer: report?.reviewer_id ? profileNames[report.reviewer_id as string] ?? null : null,
      approver: report?.approved_by ? profileNames[report.approved_by as string] ?? null : null,
      compliance_status: complianceStatus,
      report_id: (report?.id as string | undefined) ?? null,
      can_edit_report,
      can_review_report,
      can_view_report,
      is_report_author,
      can_send_to_review,
      can_recall_report,
      submission_overdue,
      approval_overdue,
      expected_vr_submission_date: expectedSub,
      expected_vr_approval_date: expectedApp,
      submission_compliance: submissionCompliance,
      submission_days: submissionDays,
      vr_reviewed_date: vrReviewedDate,
      review_days: reviewDays,
      approval_compliance: approvalCompliance,
      approval_days: approvalDays,
      expected_send_date_confirmation_letter:
        (report?.expected_send_date_confirmation_letter as string | null | undefined) ?? null,
      expected_send_date_followup_letter:
        (report?.expected_send_date_followup_letter as string | null | undefined) ?? null,
      date_followup_letter_uploaded:
        (report?.date_followup_letter_uploaded as string | null | undefined) ?? null,
      date_mvl_log_uploaded:
        (report?.date_mvl_log_uploaded as string | null | undefined) ?? null,
    });
  }

  const submissionTotal = rows.filter((r) => r.days_until_submission_due !== null).length || 1;
  const approvalTotal = rows.filter((r) => r.days_until_approval_due !== null).length || 1;

  const submissionAging = emptyAgingBuckets();
  const approvalAging = emptyAgingBuckets();
  for (const r of rows) {
    if (r.submission_overdue && typeof r.days_until_submission_due === 'number') {
      const overdueDays = Math.abs(r.days_until_submission_due);
      submissionAging[bucketizeOverdueDays(overdueDays)] += 1;
    }
    if (r.approval_overdue && typeof r.days_until_approval_due === 'number') {
      const overdueDays = Math.abs(r.days_until_approval_due);
      approvalAging[bucketizeOverdueDays(overdueDays)] += 1;
    }
  }

  type Acc = { total: number; submissionOverdue: number; approvalOverdue: number; submissionCompleted: number; approvalCompleted: number };
  const newAcc = (): Acc => ({ total: 0, submissionOverdue: 0, approvalOverdue: 0, submissionCompleted: 0, approvalCompleted: 0 });
  const byAuthorMap = new Map<string, Acc>();
  const bySiteMap = new Map<string, Acc>();
  for (const r of rows) {
    const authorKey = r.report_author?.trim() || 'Unassigned';
    const siteKey = r.site_name?.trim() || '—';
    const a = byAuthorMap.get(authorKey) ?? newAcc();
    const s = bySiteMap.get(siteKey) ?? newAcc();
    a.total += 1;
    s.total += 1;
    if (r.submission_overdue) { a.submissionOverdue += 1; s.submissionOverdue += 1; }
    if (r.approval_overdue) { a.approvalOverdue += 1; s.approvalOverdue += 1; }
    if (r.submission_compliance === 'compliant') { a.submissionCompleted += 1; s.submissionCompleted += 1; }
    if (r.approval_compliance === 'compliant') { a.approvalCompleted += 1; s.approvalCompleted += 1; }
    byAuthorMap.set(authorKey, a);
    bySiteMap.set(siteKey, s);
  }
  const sortBreakdown = (m: Map<string, Acc>): TrackerBreakdownEntry[] =>
    [...m.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const metrics: TrackerComplianceMetrics = {
    submissionCompleted,
    submissionOverdue,
    submissionTotal,
    submissionPercent: submissionTotal ? Math.round((submissionCompleted / submissionTotal) * 100) : 100,
    approvalCompleted,
    approvalOverdue,
    approvalTotal,
    approvalPercent: approvalTotal ? Math.round((approvalCompleted / approvalTotal) * 100) : 100,
    submissionAging,
    approvalAging,
    byAuthor: sortBreakdown(byAuthorMap),
    bySite: sortBreakdown(bySiteMap),
  };

  if (options?.sort && TRACKER_SORTABLE_COLUMNS.has(options.sort.column)) {
    const { column, direction } = options.sort;
    rows.sort((a, b) => compareForSort(
      (a as unknown as Record<string, unknown>)[column],
      (b as unknown as Record<string, unknown>)[column],
      direction
    ));
  }

  // Compute metrics over the full result so the dashboard cards stay accurate
  // regardless of the page being viewed; only slice the rows array for display.
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);
  return { rows: pagedRows, metrics, total, page, pageSize };
}

export async function getTripReportReviewQueue(studyId?: string | null): Promise<TripReportReviewQueueRow[]> {
  const supabase = await createClient();
  let currentProfileId: string | null = null;
  try {
    currentProfileId = await getProfileId();
  } catch {
    return [];
  }

  const admin = createAdminClient();
  const { data: cpmStudies } = await supabase
    .from('study_team_members')
    .select('study_id')
    .eq('profile_id', currentProfileId)
    .eq('is_active', true)
    .eq('role', 'clinical_project_manager');
  let studyIds = [...new Set((cpmStudies ?? []).map((r: { study_id: string }) => r.study_id))];
  if (studyId) studyIds = studyIds.filter((id) => id === studyId);
  if (studyIds.length === 0) return [];

  const { data: visits } = await supabase
    .from('monitoring_visits')
    .select('id, study_id, visit_type, study_sites(name), studies(title, study_name)')
    .in('study_id', studyIds);

  const visitList = visits ?? [];
  const visitIds = visitList.map((v: { id: string }) => v.id);
  if (visitIds.length === 0) return [];

  const { data: reports } = await admin
    .from('trip_reports')
    .select('id, visit_id, report_status, status, created_by, reviewer_id, created_at')
    .in('visit_id', visitIds)
    .order('created_at', { ascending: false });

  const latestByVisit = latestTripReportByVisitId((reports ?? []) as { visit_id: string; created_at?: string | null }[]);
  const createdByIds = [...latestByVisit.values()]
    .map((r) => r.created_by as string | undefined)
    .filter(Boolean) as string[];
  const authorNames: Record<string, string> = {};
  if (createdByIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', [...new Set(createdByIds)]);
    (profiles ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      authorNames[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
    });
  }

  const out: TripReportReviewQueueRow[] = [];
  for (const v of visitList) {
    const r = latestByVisit.get(v.id);
    if (!r) continue;
    const report = r as unknown as ReportRow;
    const vr = v as unknown as VisitRow;
    const st = report.report_status ?? report.status ?? '';
    const norm = st === 'draft' ? 'report_pending' : st;
    if (norm !== 'submitted' && norm !== 'under_review') continue;
    out.push({
      visit_id: v.id,
      study_id: vr.study_id,
      study_name: trackerStudyDisplayName(
        vr.studies as { title?: string | null; study_name?: string | null } | null | undefined
      ),
      site_name: vr.study_sites?.name ?? '—',
      visit_type: v.visit_type,
      report_id: report.id,
      report_status: norm,
      report_author: report.created_by ? authorNames[report.created_by] ?? null : null,
      reviewer_id: report.reviewer_id ?? null,
    });
  }
  return out;
}

export async function getTemplateCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('visit_report_templates')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getVisitReportTemplates(): Promise<VisitReportTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('visit_report_templates')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data as VisitReportTemplate[]) ?? [];
}

export interface TemplateWithQuestionCount extends VisitReportTemplate {
  question_count: number;
  report_count: number;
  /**
   * Distinct trip reports that have snapshotted this template via the
   * versioning system (any version_number). Drives the "edits won't
   * affect N historical reports" reassurance badge on the Templates
   * Admin tab. Independent of `report_count` so legacy reports still
   * pointing at the live `template_id` aren't double-counted.
   */
  snapshotted_report_count: number;
  study_name?: string | null;
  /** Display name of the profile that created the template (or null when unknown). */
  created_by_name?: string | null;
}

const TEMPLATE_SELECT_COLS =
  'id, company_id, name, visit_report_type, days_submission, days_approval, days_basis, template_status, created_by, created_at, updated_at';
const TEMPLATE_SELECT_WITH_STUDY = `${TEMPLATE_SELECT_COLS}, study_id`;

export async function getTemplatesWithQuestionCount(): Promise<TemplateWithQuestionCount[]> {
  const supabase = await createClient();
  let templates: Record<string, unknown>[] | null = null;
  let te: { message: string } | null = null;
  const selectCols = TEMPLATE_SELECT_WITH_STUDY;
  const result = await supabase.from('visit_report_templates').select(selectCols).order('name');
  te = result.error;
  templates = (result.data as Record<string, unknown>[] | null) ?? null;
  if (te && isStudyIdColumnMissingError(te.message)) {
    const fallback = await supabase.from('visit_report_templates').select(TEMPLATE_SELECT_COLS).order('name');
    te = fallback.error;
    templates = (fallback.data as Record<string, unknown>[] | null) ?? null;
  }
  if (te) return [];
  if (!templates?.length) return [];

  const { data: counts, error: ce } = await supabase
    .from('visit_report_template_questions')
    .select('template_id');
  if (ce) throw new Error(ce.message);

  const countByTemplate: Record<string, number> = {};
  (counts ?? []).forEach((r: { template_id: string }) => {
    countByTemplate[r.template_id] = (countByTemplate[r.template_id] ?? 0) + 1;
  });

  const { data: reportCounts, error: re } = await supabase
    .from('trip_reports')
    .select('template_id');
  if (re) throw new Error(re.message);

  const reportCountByTemplate: Record<string, number> = {};
  (reportCounts ?? []).forEach((r: { template_id: string | null }) => {
    if (r.template_id) {
      reportCountByTemplate[r.template_id] = (reportCountByTemplate[r.template_id] ?? 0) + 1;
    }
  });

  // Snapshotted report counts: distinct reports per live template_id,
  // joined through visit_report_template_versions.template_id. Wrapped
  // in a try/swallow so the Admin tab still renders on environments
  // without the versioning migration applied yet.
  const snapshotCountByTemplate: Record<string, number> = {};
  try {
    const { data: versionRows } = await supabase
      .from('visit_report_template_versions')
      .select('id, template_id');
    const templateIdByVersionId: Record<string, string> = {};
    (versionRows ?? []).forEach((v: { id: string; template_id: string }) => {
      templateIdByVersionId[v.id] = v.template_id;
    });
    if (Object.keys(templateIdByVersionId).length > 0) {
      const { data: snapshotReports } = await supabase
        .from('trip_reports')
        .select('id, template_version_id')
        .not('template_version_id', 'is', null);
      const seenByTemplate: Record<string, Set<string>> = {};
      (snapshotReports ?? []).forEach((r: { id: string; template_version_id: string | null }) => {
        const tplId = r.template_version_id ? templateIdByVersionId[r.template_version_id] : null;
        if (!tplId) return;
        if (!seenByTemplate[tplId]) seenByTemplate[tplId] = new Set();
        seenByTemplate[tplId].add(r.id);
      });
      for (const [tplId, ids] of Object.entries(seenByTemplate)) {
        snapshotCountByTemplate[tplId] = ids.size;
      }
    }
  } catch {
    // versioning tables not yet migrated: leave snapshot counts at 0.
  }

  const studyIds = [...new Set((templates as Record<string, unknown>[]).map((t) => t.study_id).filter(Boolean) as string[])];
  const studyNameById: Record<string, string> = {};
  if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from('studies')
      .select('id, title, study_name, protocol_number')
      .in('id', studyIds);
    (studies ?? []).forEach((s: { id: string; title: string; study_name: string | null; protocol_number?: string | null }) => {
      studyNameById[s.id] = studySelectLabel(s);
    });
  }

  const creatorIds = [
    ...new Set(
      (templates as Record<string, unknown>[])
        .map((t) => t.created_by)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  const creatorNameById: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', creatorIds);
    (profiles ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      if (name) creatorNameById[p.id] = name;
    });
  }

  return (templates as unknown as VisitReportTemplate[]).map((t) => {
    const raw = t as unknown as Record<string, unknown>;
    const studyId = (raw.study_id as string | null | undefined) ?? null;
    const createdBy = (raw.created_by as string | null | undefined) ?? null;
    return {
      ...t,
      question_count: countByTemplate[t.id] ?? 0,
      report_count: reportCountByTemplate[t.id] ?? 0,
      snapshotted_report_count: snapshotCountByTemplate[t.id] ?? 0,
      study_name: studyId ? (studyNameById[studyId] ?? null) : null,
      created_by_name: createdBy ? (creatorNameById[createdBy] ?? null) : null,
    };
  });
}

// =====================================================
// Create Site Visit + Report
// =====================================================

export interface CreateSiteVisitWithReportInput {
  study_id: string;
  site_id: string;
  site_number?: string;
  visit_type: 'sqv' | 'siv' | 'monitoring' | 'close_out' | 'training';
  visit_location: 'onsite' | 'remote';
  description?: string;
  start_date: string;
  end_date: string;
  template_id?: string | null;
}

/**
 * Compute the next auto-numbered visit_name for a (study, site, visit_type)
 * triple. The number is the count of existing rows + 1, regardless of status,
 * so cancelled visits permanently retain their slot. Once written, the
 * `visit_name` is treated as an immutable label by downstream readers.
 */
async function nextAutoVisitName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  siteId: string,
  visitType: MonitoringVisitType
): Promise<string> {
  const { count } = await supabase
    .from('monitoring_visits')
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .eq('visit_type', visitType);
  const n = (count ?? 0) + 1;
  const label = VISIT_TYPE_LABEL[visitType] ?? visitType;
  return `${label} -${n}`;
}

export async function createSiteVisitWithReport(
  input: CreateSiteVisitWithReportInput
): Promise<{ visitId: string | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    if (!input.study_id?.trim()) {
      return { visitId: null, error: 'Study is required for every visit report.' };
    }
    const craErr = await assertVisitAuthorForStudy(supabase, profileId, input.study_id);
    if (craErr) return { visitId: null, error: craErr };

    let submissionDue: string | null = null;
    let approvalDue: string | null = null;
    if (input.template_id) {
      const { data: tmpl } = await supabase
        .from('visit_report_templates')
        .select('days_submission, days_approval, days_basis')
        .eq('id', input.template_id)
        .single();
      if (tmpl) {
        const basis = normalizeTripReportDaysBasis(
          (tmpl as { days_basis?: string | null }).days_basis
        );
        const ds = tmpl.days_submission ?? 14;
        const da = tmpl.days_approval ?? 7;
        const { submissionDue: sd, approvalDue: ad } = submissionAndApprovalDueFromVisitStart(
          input.start_date,
          ds,
          da,
          basis
        );
        submissionDue = sd;
        approvalDue = ad;
      }
    }

    const visitType = input.visit_type as MonitoringVisitType;

    const insertVisit = async (visitName: string) =>
      supabase
        .from('monitoring_visits')
        .insert({
          study_id: input.study_id,
          site_id: input.site_id,
          visit_type: input.visit_type,
          visit_name: visitName,
          visit_location: input.visit_location,
          start_date: input.start_date,
          end_date: input.end_date,
          description: input.description ?? null,
          planned_date: input.start_date,
          status: 'planned',
        })
        .select('id')
        .single();

    let visitName = await nextAutoVisitName(supabase, input.study_id, input.site_id, visitType);
    let { data: visit, error: visitError } = await insertVisit(visitName);

    // Retry once on Postgres unique-violation in case a concurrent insert
    // claimed the same slot between count() and insert().
    if (visitError && (visitError as { code?: string }).code === '23505') {
      visitName = await nextAutoVisitName(supabase, input.study_id, input.site_id, visitType);
      ({ data: visit, error: visitError } = await insertVisit(visitName));
    }

    if (visitError || !visit) return { visitId: null, error: visitError?.message ?? 'Failed to create visit' };

    const { data: insertedReport, error: reportError } = await supabase
      .from('trip_reports')
      .insert({
        visit_id: visit.id,
        created_by: profileId,
        report_status: 'report_pending',
        template_id: input.template_id ?? null,
        submission_due_date: submissionDue,
        approval_due_date: approvalDue,
      })
      .select('id')
      .single();

    if (reportError || !insertedReport) {
      return { visitId: null, error: reportError?.message ?? 'Failed to create report.' };
    }

    // Snapshot the template + questions onto the report immediately so
    // later edits to the live template never silently mutate this
    // historical report. No-op for reports without a chosen template.
    if (input.template_id) {
      const reportId = (insertedReport as { id: string }).id;
      const snap = await snapshotTemplateForReport(reportId, supabase, {
        reason: 'on_create',
        profileId,
      });
      if (snap.error) {
        // Roll back the report row so the visit doesn't end up with an
        // unsnapshotted report. The visit row itself is intentionally
        // left in place to mirror the existing failure behavior in this
        // function (a stranded visit can be re-attempted by the user).
        await supabase.from('trip_reports').delete().eq('id', reportId);
        return { visitId: null, error: snap.error };
      }
    }

    revalidateTripReportRelatedUi(input.study_id);
    return { visitId: visit.id, error: null };
  } catch (err) {
    return { visitId: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Template CRUD
// =====================================================

function isStudyIdColumnMissingError(message: string): boolean {
  return /study_id/i.test(message) && /schema cache|Could not find.*column|column.*does not exist/i.test(message);
}

export async function createTemplate(input: {
  name: string;
  visit_report_type: VisitReportType;
  days_submission: number;
  days_approval: number;
  days_basis?: TripReportDaysBasis;
  study_id?: string | null;
}): Promise<{ data: VisitReportTemplate | null; error: string | null; studySkipped?: boolean }> {
  const supabase = await createClient();
  try {
    const [companyId, createdBy] = await Promise.all([getCompanyId(), getProfileId()]);
    const basePayload = {
      company_id: companyId,
      name: input.name,
      visit_report_type: input.visit_report_type,
      days_submission: input.days_submission,
      days_approval: input.days_approval,
      days_basis: input.days_basis ?? 'calendar',
      template_status: 'active',
      created_by: createdBy,
    };
    const payloadWithStudy = { ...basePayload, ...(input.study_id && { study_id: input.study_id }) };
    let { data, error } = await supabase
      .from('visit_report_templates')
      .insert(payloadWithStudy)
      .select()
      .single();
    let studySkipped = false;
    if (error && isStudyIdColumnMissingError(error.message)) {
      studySkipped = Boolean(input.study_id);
      ({ data, error } = await supabase
        .from('visit_report_templates')
        .insert(basePayload)
        .select()
        .single());
    }
    if (error) return { data: null, error: error.message };
    revalidateTripReportRelatedUi(input.study_id ?? null);
    return { data: data as VisitReportTemplate, error: null, ...(studySkipped && { studySkipped: true }) };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateTemplate(
  id: string,
  input: {
    name?: string;
    visit_report_type?: VisitReportType;
    days_submission?: number;
    days_approval?: number;
    days_basis?: TripReportDaysBasis;
    template_status?: 'active' | 'inactive';
    study_id?: string | null;
  }
): Promise<{ error: string | null; studySkipped?: boolean }> {
  const supabase = await createClient();
  try {
    let result = await supabase.from('visit_report_templates').update(input).eq('id', id);
    let studySkipped = false;
    if (result.error && isStudyIdColumnMissingError(result.error.message)) {
      studySkipped = input.study_id !== undefined && input.study_id !== null;
      const { study_id: _removed, ...inputWithoutStudyId } = input;
      result = await supabase.from('visit_report_templates').update(inputWithoutStudyId).eq('id', id);
    }
    if (result.error) return { error: result.error.message };
    revalidateTripReportRelatedUi(input.study_id ?? null);
    return { error: null, ...(studySkipped && { studySkipped: true }) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deactivateTemplate(id: string): Promise<{ error: string | null }> {
  return updateTemplate(id, { template_status: 'inactive' });
}

export async function reactivateTemplate(id: string): Promise<{ error: string | null }> {
  return updateTemplate(id, { template_status: 'active' });
}

export async function deleteTemplate(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: reports, error: countErr } = await supabase
      .from('trip_reports')
      .select('id')
      .eq('template_id', id)
      .limit(1);
    if (countErr) return { error: countErr.message };
    if ((reports ?? []).length > 0) {
      return { error: 'Template cannot be deleted because it is used in one or more reports. Deactivate it instead.' };
    }
    const { error } = await supabase.from('visit_report_templates').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateTripReportRelatedUi();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function getTemplateById(id: string): Promise<VisitReportTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('visit_report_templates').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as VisitReportTemplate;
}

export async function getTemplateQuestions(templateId: string): Promise<VisitReportTemplateQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('visit_report_template_questions')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data as VisitReportTemplateQuestion[]) ?? [];
}

export async function addTemplateQuestion(input: {
  template_id: string;
  question_text: string;
  report_order?: number;
  report_section?: string | null;
  report_sub_section?: string | null;
  sort_order?: number;
}): Promise<{ data: VisitReportTemplateQuestion | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: existing } = await supabase
      .from('visit_report_template_questions')
      .select('sort_order')
      .eq('template_id', input.template_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (existing?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from('visit_report_template_questions')
      .insert({
        template_id: input.template_id,
        question_text: input.question_text,
        report_order: input.report_order ?? 0,
        report_section: input.report_section ?? null,
        report_sub_section: input.report_sub_section ?? null,
        sort_order: input.sort_order ?? nextOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateTripReportRelatedUi();
    return { data: data as VisitReportTemplateQuestion, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteTemplateQuestion(questionId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('visit_report_template_questions').delete().eq('id', questionId);
    if (error) return { error: error.message };
    revalidateTripReportRelatedUi();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateTemplateQuestion(
  questionId: string,
  input: { question_text?: string; report_order?: number; report_sub_section?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const payload: Record<string, unknown> = {};
    if (input.question_text !== undefined) payload.question_text = input.question_text;
    if (input.report_order !== undefined) payload.report_order = input.report_order;
    if (input.report_sub_section !== undefined) payload.report_sub_section = input.report_sub_section;
    if (Object.keys(payload).length === 0) return { error: null };
    const { error } = await supabase
      .from('visit_report_template_questions')
      .update(payload)
      .eq('id', questionId);
    if (error) return { error: error.message };
    revalidateTripReportRelatedUi();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function reorderTemplateQuestions(
  templateId: string,
  questionIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    for (let i = 0; i < questionIds.length; i++) {
      await supabase.from('visit_report_template_questions').update({ sort_order: i }).eq('id', questionIds[i]).eq('template_id', templateId);
    }
    revalidateTripReportRelatedUi();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface BulkUploadQuestionInput {
  question_text: string;
  report_order?: number;
  report_section?: string | null;
  report_sub_section?: string | null;
}

export interface TripReportAttendee {
  id: string;
  trip_report_id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  attendee_type: 'site' | 'sponsor';
  sort_order: number;
  created_at: string;
}

export interface TripReportCrfEntry {
  id: string;
  trip_report_id: string;
  subject_number: string | null;
  crf_name: string | null;
  sdv_status: string | null;
  sort_order: number;
  created_at: string;
  /** Traceability link back to the eCRF tracking matrix (nullable for legacy / freetext rows). */
  subject_id: string | null;
  subject_visit_id: string | null;
  subject_crf_id: string | null;
  /**
   * Live snapshot of the linked `subject_crfs` row + its `subject_visit.visit_name`,
   * resolved by `getTripReportWithDetails`. Null for legacy/freetext rows or when
   * the eCRF tables are unavailable. Read-only — display only; do not write.
   */
  linked?: {
    visit_name: string | null;
    crf_name: string | null;
    data_entry: boolean;
    source_data_review: boolean;
    source_data_verified: boolean;
    pi_signed: boolean;
    data_management_lock: boolean;
    query_status: SubjectCrfQueryStatus;
  } | null;
}

export interface TripReportActionItem {
  id: string;
  trip_report_id: string;
  description: string;
  owner: string | null;
  due_date: string | null;
  resolution_date: string | null;
  status: 'open' | 'closed';
  sort_order: number;
  created_at: string;
}

export type TripReportAttachmentScanStatus =
  | 'pending'
  | 'clean'
  | 'infected'
  | 'error'
  | 'skipped';

export interface TripReportAttachment {
  id: string;
  trip_report_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  uploaded_by: string | null;
  created_at: string;
  scan_status: TripReportAttachmentScanStatus;
  scan_status_at: string | null;
  scan_engine: string | null;
  scan_signature: string | null;
  scan_error: string | null;
}

export interface TripReportStatusEventRow {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
  actor_display_name?: string | null;
}

export interface TripReportSignatureAuditRow {
  id: string;
  trip_report_id: string;
  kind: 'author_submit' | 'approver_approve' | 'void_approval';
  actor_profile_id: string;
  printed_name: string;
  attestation_text: string;
  content_hash: string | null;
  password_verified: boolean;
  reason: string | null;
  signed_at_db: string;
  ip_address: string | null;
  user_agent: string | null;
  actor_display_name?: string | null;
}

/**
 * Discriminated entry in the merged audit timeline. The dialog renders
 * `status` and `signature` rows differently (the status row keeps the
 * existing from→to badge UX; the signature row shows the printed name,
 * full attestation, and content hash).
 */
export type TripReportAuditTimelineEntry =
  | { kind: 'status'; at: string; event: TripReportStatusEventRow }
  | { kind: 'signature'; at: string; event: TripReportSignatureAuditRow };

/**
 * Returns the date of the most recent approved visit for the same study+site,
 * excluding the current visit. Uses actual_date ?? planned_date of the visit.
 */
export async function getLastApprovedVisitDate(
  studyId: string,
  siteId: string,
  excludeVisitId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data: approvedReports } = await supabase
    .from('trip_reports')
    .select('visit_id')
    .eq('report_status', 'approved_and_signed');
  const approvedVisitIds = (approvedReports ?? [])
    .map((r: { visit_id: string }) => r.visit_id)
    .filter((id) => id !== excludeVisitId);
  if (approvedVisitIds.length === 0) return null;

  const { data: visits, error } = await supabase
    .from('monitoring_visits')
    .select('id, planned_date, actual_date')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .in('id', approvedVisitIds)
    .order('actual_date', { ascending: false, nullsFirst: false })
    .order('planned_date', { ascending: false, nullsFirst: false });

  if (error || !visits || visits.length === 0) return null;
  const row = visits[0] as { planned_date: string | null; actual_date: string | null };
  return row.actual_date ?? row.planned_date ?? null;
}

export type TripReportWithDetailsResult = {
  visit: Record<string, unknown>;
  report: Record<string, unknown> | null;
  template: VisitReportTemplate | null;
  questions: VisitReportTemplateQuestion[];
  responses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }>;
  attendees: TripReportAttendee[];
  crfEntries: TripReportCrfEntry[];
  actionItems: TripReportActionItem[];
  attachments: TripReportAttachment[];
  /** Subjects on the visit's site, used by the Monitored CRFs picker. */
  siteSubjects: { id: string; subject_number: string; status: string | null }[];
  /**
   * Per-subject_visit DE/SDV/Lock rollups, keyed by `subject_visit_id`. Computed
   * across every `subject_crf` in each visit (not just the picked entries) via
   * `computeSubjectCrfPercentages`, so the SDV% chip in the Monitored CRF(s)
   * group header matches what the eCRF Tracking tab shows. Empty `{}` when the
   * eCRF tables are unavailable (e.g. Production migration backlog).
   */
  visitTotalsBySubjectVisitId: Record<string, SubjectCrfPercentages>;
  visitSequenceNumber: number | null;
  lastApprovedVisitDate: string | null;
  currentUserProfileId: string | null;
  userIsAppAdmin: boolean;
  userIsStudyCra: boolean;
  userIsStudyCpm: boolean;
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  auditEvents: TripReportStatusEventRow[];
  /** Display names for report author and approver (for signatures / PDF). */
  reportSignerNames: { author: string | null; approver: string | null };
  /**
   * Phone for the primary site contact (`is_primary`, else first by `id`); for
   * the visit report Site Details line. `null` when no phone or no contacts.
   */
  primarySitePhone: string | null;
};

export async function getTripReportWithDetails(visitId: string): Promise<TripReportWithDetailsResult | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  let currentUserProfileId: string | null = null;
  let userIsAppAdmin = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
      if (profile) {
        currentUserProfileId = (profile as { id: string }).id;
        userIsAppAdmin = (profile as { role?: string }).role === 'admin';
      }
    }
  } catch {
    // ignore
  }
  const { data: visit, error: ve } = await supabase
    .from('monitoring_visits')
    .select('*, study_sites(name, site_number, address, city, state, postal_code, pi_name, pi_email, study_countries(country_name)), studies(id, title, study_name, protocol_number)')
    .eq('id', visitId)
    .single();
  if (ve || !visit) return null;

  let primarySitePhone: string | null = null;
  if (visit.site_id) {
    try {
      const { data: scRows } = await supabase
        .from('site_contacts')
        .select('id, is_primary, phone')
        .eq('site_id', visit.site_id as string);
      const rows = (scRows ?? []) as { id: string; is_primary: boolean; phone: string | null }[];
      if (rows.length > 0) {
        const primary = rows.find((r) => r.is_primary);
        const pick = primary ?? [...rows].sort((a, b) => a.id.localeCompare(b.id))[0];
        const p = pick?.phone?.trim();
        primarySitePhone = p || null;
      }
    } catch {
      primarySitePhone = null;
    }
  }

  if (!visit.study_id) {
    return null;
  }

  const { isCra: userIsStudyCra, isCpm: userIsStudyCpm } = currentUserProfileId
    ? await getUserIsStudyCraAndCpm(supabase, currentUserProfileId, visit.study_id)
    : { isCra: false, isCpm: false };

  const lastApprovedVisitDate =
    visit.study_id && visit.site_id
      ? await getLastApprovedVisitDate(visit.study_id, visit.site_id, visitId)
      : null;

  // Compute visit sequence number: Nth visit of same type for this study+site
  let visitSequenceNumber: number | null = null;
  if (visit.study_id && visit.site_id && visit.visit_type) {
    const { data: sameVisits } = await supabase
      .from('monitoring_visits')
      .select('id')
      .eq('study_id', visit.study_id)
      .eq('site_id', visit.site_id)
      .eq('visit_type', visit.visit_type)
      .order('planned_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    const idx = sameVisits?.findIndex((v: { id: string }) => v.id === visit.id);
    if (idx !== undefined && idx >= 0) visitSequenceNumber = idx + 1;
  }

  const { data: report } = await admin
    .from('trip_reports')
    .select('*')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const defaultSignerNames = { author: null as string | null, approver: null as string | null };

  const emptyBase = {
    visit: visit as Record<string, unknown>,
    report: null as Record<string, unknown> | null,
    template: null as VisitReportTemplate | null,
    questions: [] as VisitReportTemplateQuestion[],
    responses: {} as Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }>,
    attendees: [] as TripReportAttendee[],
    crfEntries: [] as TripReportCrfEntry[],
    actionItems: [] as TripReportActionItem[],
    attachments: [] as TripReportAttachment[],
    siteSubjects: [] as { id: string; subject_number: string; status: string | null }[],
    visitTotalsBySubjectVisitId: {} as Record<string, SubjectCrfPercentages>,
    visitSequenceNumber,
    lastApprovedVisitDate,
    currentUserProfileId,
    userIsAppAdmin,
    userIsStudyCra,
    userIsStudyCpm,
    accessDenied: false,
    accessDeniedMessage: null as string | null,
    auditEvents: [] as TripReportStatusEventRow[],
    reportSignerNames: defaultSignerNames,
    primarySitePhone,
  };

  if (!report) {
    return { ...emptyBase, report: null };
  }

  const rawReportStatus = (report as { report_status?: string; status?: string }).report_status ?? (report as { status?: string }).status ?? 'report_pending';
  const normalizedStatus = rawReportStatus === 'draft' ? 'report_pending' : rawReportStatus;
  const canView = await canViewTripReportContent(
    supabase,
    currentUserProfileId,
    normalizedStatus,
    visit.study_id as string
  );
  if (!canView) {
    return {
      ...emptyBase,
      accessDenied: true,
      accessDeniedMessage:
        'You do not have permission to view this report while it is in progress. Only CRAs and CPMs on this study (or a company admin) can view in-flight reports.',
      auditEvents: [],
    };
  }

  // Read through the snapshot-aware loader so this returns the locked-in
  // template + questions for snapshot reports, and falls back to the
  // live template for legacy reports that pre-date versioning.
  const loaded = await loadTemplateForReport(report.id, supabase);
  const template: VisitReportTemplate | null = loaded.template;
  const questions: VisitReportTemplateQuestion[] = loaded.questions;
  if (process.env.NODE_ENV === 'development' && loaded.error) {
    console.info('[TripReportDebug] loadTemplateForReport error', {
      visitId,
      reportId: report.id,
      error: loaded.error,
    });
  }

  const { data: resRows } = await supabase
    .from('trip_report_question_responses')
    .select('template_question_id, template_question_version_id, response, comments, reviewer_comments')
    .eq('trip_report_id', report.id);
  const responses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }> = {};
  (resRows ?? []).forEach((r: {
    template_question_id: string | null;
    template_question_version_id: string | null;
    response: string | null;
    comments: string | null;
    reviewer_comments: string | null;
  }) => {
    // Snapshot reports key responses by version question id (which
    // loadTemplateForReport surfaces as VisitReportTemplateQuestion.id);
    // legacy reports key by the live template_question_id.
    const key = r.template_question_version_id ?? r.template_question_id;
    if (!key) return;
    responses[key] = {
      response: r.response ?? null,
      comments: r.comments ?? null,
      reviewer_comments: r.reviewer_comments ?? null,
    };
  });

  let attendees: TripReportAttendee[] = [];
  let crfEntries: TripReportCrfEntry[] = [];
  let actionItems: TripReportActionItem[] = [];
  let attachments: TripReportAttachment[] = [];
  let siteSubjects: { id: string; subject_number: string; status: string | null }[] = [];
  try {
    const [attRes, crfRes, actRes, subjRes] = await Promise.all([
      supabase.from('trip_report_attendees').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_crf_entries').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_action_items').select('*').eq('trip_report_id', report.id).order('sort_order'),
      visit.site_id
        ? supabase
            .from('subjects')
            .select('id, subject_number, status')
            .eq('site_id', visit.site_id as string)
            .order('subject_number', { ascending: true })
        : Promise.resolve({ data: [] as { id: string; subject_number: string; status: string | null }[] }),
    ]);
    attendees = (attRes.data ?? []) as TripReportAttendee[];
    crfEntries = (crfRes.data ?? []) as TripReportCrfEntry[];
    actionItems = (actRes.data ?? []) as TripReportActionItem[];
    siteSubjects = (subjRes.data ?? []) as { id: string; subject_number: string; status: string | null }[];
  } catch {
    // New tables may not exist yet; keep empty arrays
  }
  try {
    const { data: attachData } = await supabase
      .from('visit_report_attachments')
      .select('*')
      .eq('trip_report_id', report.id)
      .order('created_at', { ascending: false });
    attachments = (attachData ?? []) as TripReportAttachment[];
  } catch {
    // Table may not exist yet; keep empty array
  }

  // Enrich crfEntries with live `subject_crfs` + `subject_visits` snapshots so
  // the recorded list can render DE/SDR/SDV/PI/LOCK/Query badges and the SDV%
  // chip per visit group. Wrapped in try/catch so legacy environments without
  // the eCRF tracking tables silently fall back to `linked = null` and an
  // empty `visitTotalsBySubjectVisitId`.
  let visitTotalsBySubjectVisitId: Record<string, SubjectCrfPercentages> = {};
  try {
    const subjectCrfIds = Array.from(
      new Set(crfEntries.map((e) => e.subject_crf_id).filter((id): id is string => Boolean(id)))
    );
    const subjectVisitIds = Array.from(
      new Set(crfEntries.map((e) => e.subject_visit_id).filter((id): id is string => Boolean(id)))
    );

    if (subjectCrfIds.length > 0) {
      const { data: linkedRows } = await supabase
        .from('subject_crfs')
        .select(
          'id, crf_name, data_entry, source_data_review, source_data_verified, pi_signed, data_management_lock, query_status, subject_visits(visit_name)'
        )
        .in('id', subjectCrfIds);
      const linkedById = new Map<string, TripReportCrfEntry['linked']>();
      (linkedRows ?? []).forEach((row: {
        id: string;
        crf_name: string | null;
        data_entry: boolean;
        source_data_review: boolean;
        source_data_verified: boolean;
        pi_signed: boolean;
        data_management_lock: boolean;
        query_status: SubjectCrfQueryStatus;
        subject_visits: { visit_name: string | null } | { visit_name: string | null }[] | null;
      }) => {
        const sv = Array.isArray(row.subject_visits) ? row.subject_visits[0] ?? null : row.subject_visits;
        linkedById.set(row.id, {
          visit_name: sv?.visit_name ?? null,
          crf_name: row.crf_name,
          data_entry: row.data_entry,
          source_data_review: row.source_data_review,
          source_data_verified: row.source_data_verified,
          pi_signed: row.pi_signed,
          data_management_lock: row.data_management_lock,
          query_status: row.query_status,
        });
      });
      crfEntries = crfEntries.map((e) =>
        e.subject_crf_id
          ? { ...e, linked: linkedById.get(e.subject_crf_id) ?? null }
          : { ...e, linked: null }
      );
    }

    if (subjectVisitIds.length > 0) {
      const { data: visitCrfs } = await supabase
        .from('subject_crfs')
        .select(
          'subject_visit_id, data_expected, data_entry, source_data_verified, data_management_lock, query_status'
        )
        .in('subject_visit_id', subjectVisitIds);
      const buckets: Record<
        string,
        Array<{
          data_expected: number;
          data_entry: boolean;
          source_data_verified: boolean;
          data_management_lock: boolean;
          query_status: SubjectCrfQueryStatus;
        }>
      > = {};
      (visitCrfs ?? []).forEach((row: {
        subject_visit_id: string;
        data_expected: number;
        data_entry: boolean;
        source_data_verified: boolean;
        data_management_lock: boolean;
        query_status: SubjectCrfQueryStatus;
      }) => {
        const list = buckets[row.subject_visit_id] ?? (buckets[row.subject_visit_id] = []);
        list.push({
          data_expected: row.data_expected,
          data_entry: row.data_entry,
          source_data_verified: row.source_data_verified,
          data_management_lock: row.data_management_lock,
          query_status: row.query_status,
        });
      });
      for (const [svId, rows] of Object.entries(buckets)) {
        visitTotalsBySubjectVisitId[svId] = computeSubjectCrfPercentages(rows);
      }
    }
  } catch {
    // eCRF tracking tables not available (e.g. Production migration backlog);
    // recorded entries will still render in the legacy "Unlinked" bucket.
    visitTotalsBySubjectVisitId = {};
  }

  const profileNamesById: Record<string, string> = {};
  let auditEvents: TripReportStatusEventRow[] = [];
  try {
    const { data: evRows } = await supabase
      .from('trip_report_status_events')
      .select('id, from_status, to_status, created_at, actor_profile_id, metadata')
      .eq('trip_report_id', report.id)
      .order('created_at', { ascending: true });
    const base = (evRows ?? []) as TripReportStatusEventRow[];
    const rpIds = report as { created_by?: string | null; approved_by?: string | null };
    const actorIds = [
      ...new Set(
        [...base.map((e) => e.actor_profile_id).filter(Boolean), rpIds.created_by, rpIds.approved_by].filter(
          Boolean
        ) as string[]
      ),
    ];
    if (actorIds.length > 0) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', actorIds);
      (profs ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
        profileNamesById[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
      });
    }
    auditEvents = base.map((e) => ({
      ...e,
      actor_display_name: e.actor_profile_id ? profileNamesById[e.actor_profile_id] ?? null : null,
    }));
  } catch {
    auditEvents = [];
  }

  const rpSigner = report as { created_by?: string | null; approved_by?: string | null };
  const reportSignerNames = {
    author: rpSigner.created_by ? profileNamesById[rpSigner.created_by] ?? null : null,
    approver: rpSigner.approved_by ? profileNamesById[rpSigner.approved_by] ?? null : null,
  };

  const reportWithNarrative = report as { narrative?: string | null };
  return {
    visit,
    report: { ...report, narrative: reportWithNarrative.narrative ?? null },
    template,
    questions,
    responses,
    attendees,
    crfEntries,
    actionItems,
    attachments,
    siteSubjects,
    visitTotalsBySubjectVisitId,
    visitSequenceNumber,
    lastApprovedVisitDate,
    currentUserProfileId,
    userIsAppAdmin,
    userIsStudyCra,
    userIsStudyCpm,
    accessDenied: false,
    accessDeniedMessage: null,
    auditEvents,
    reportSignerNames,
    primarySitePhone,
  };
}

export async function getApprovedTripReportPdfData(
  visitId: string
): Promise<{ data: VisitReportPdfData } | { error: string }> {
  const [details, logoUrl] = await Promise.all([getTripReportWithDetails(visitId), getCompanyLogoUrl()]);
  if (!details) return { error: 'Visit report not found.' };
  if (details.accessDenied) {
    return { error: details.accessDeniedMessage ?? 'You do not have permission to view this report.' };
  }
  if (!details.report) return { error: 'No report for this visit.' };
  const rawStatus =
    (details.report.report_status as string | undefined) ??
    (details.report.status as string | undefined) ??
    'report_pending';
  const status = rawStatus === 'draft' ? 'report_pending' : rawStatus;
  if (status !== 'approved_and_signed') {
    return { error: 'Official PDF is only available after approval and signing.' };
  }
  const narrative = String(details.report.narrative ?? '');
  const data = buildVisitReportPdfData({
    visitId,
    visit: details.visit,
    report: details.report as Record<string, unknown>,
    questions: details.questions,
    responses: details.responses,
    attendees: details.attendees,
    crfEntries: details.crfEntries,
    actionItems: details.actionItems,
    attachments: details.attachments,
    narrative,
    visitSequenceNumber: details.visitSequenceNumber,
    lastApprovedVisitDate: details.lastApprovedVisitDate,
    logoUrl,
    reportSignerNames: details.reportSignerNames,
    includeReviewerComments: true,
    visitTotalsBySubjectVisitId: details.visitTotalsBySubjectVisitId,
  });
  return { data };
}

/**
 * Returns the trip_report_status_events for a single trip report, with actor
 * display names resolved. Drives the row-level status timeline drawer on the
 * Summary and Tracker tabs. Permissions follow `canViewTripReportContent`.
 */
export async function getTripReportStatusEvents(
  tripReportId: string
): Promise<{ events: TripReportStatusEventRow[]; error: string | null }> {
  if (!tripReportId) return { events: [], error: 'Missing trip report id.' };
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { events: [], error: 'Not authenticated.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const profileId = (profile as { id?: string } | null)?.id ?? null;
  if (!profileId) return { events: [], error: 'No profile.' };

  const { data: report } = await admin
    .from('trip_reports')
    .select('id, visit_id, report_status')
    .eq('id', tripReportId)
    .maybeSingle();
  const r = report as { id: string; visit_id: string; report_status: string } | null;
  if (!r) return { events: [], error: 'Report not found.' };

  const { data: visit } = await admin
    .from('monitoring_visits')
    .select('study_id')
    .eq('id', r.visit_id)
    .maybeSingle();
  const studyId = (visit as { study_id?: string } | null)?.study_id ?? null;
  if (studyId) {
    const allowed = await canViewTripReportContent(supabase, profileId, r.report_status, studyId);
    if (!allowed) return { events: [], error: 'You do not have permission to view this timeline.' };
  }

  const { data: evRows, error } = await admin
    .from('trip_report_status_events')
    .select('id, from_status, to_status, created_at, actor_profile_id, metadata')
    .eq('trip_report_id', tripReportId)
    .order('created_at', { ascending: true });
  if (error) return { events: [], error: error.message };
  const base = (evRows ?? []) as TripReportStatusEventRow[];
  const actorIds = [
    ...new Set(base.map((e) => e.actor_profile_id).filter((v): v is string => !!v)),
  ];
  const nameById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', actorIds);
    (profs ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      nameById[p.id] = name || '—';
    });
  }
  const events = base.map((e) => ({
    ...e,
    actor_display_name: e.actor_profile_id ? nameById[e.actor_profile_id] ?? null : null,
  }));
  return { events, error: null };
}

/**
 * Returns the merged audit timeline for a trip report combining
 * `trip_report_status_events` (workflow transitions) and
 * `trip_report_signature_audit` (Part 11 signing events) sorted by time.
 * Honors the same view-permission gate used by getTripReportStatusEvents.
 */
export async function getTripReportAuditTimeline(
  tripReportId: string
): Promise<{ entries: TripReportAuditTimelineEntry[]; error: string | null }> {
  if (!tripReportId) return { entries: [], error: 'Missing trip report id.' };
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { entries: [], error: 'Not authenticated.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const profileId = (profile as { id?: string } | null)?.id ?? null;
  if (!profileId) return { entries: [], error: 'No profile.' };

  const { data: report } = await admin
    .from('trip_reports')
    .select('id, visit_id, report_status')
    .eq('id', tripReportId)
    .maybeSingle();
  const r = report as { id: string; visit_id: string; report_status: string } | null;
  if (!r) return { entries: [], error: 'Report not found.' };

  const { data: visit } = await admin
    .from('monitoring_visits')
    .select('study_id')
    .eq('id', r.visit_id)
    .maybeSingle();
  const studyId = (visit as { study_id?: string } | null)?.study_id ?? null;
  if (studyId) {
    const allowed = await canViewTripReportContent(supabase, profileId, r.report_status, studyId);
    if (!allowed) return { entries: [], error: 'You do not have permission to view this timeline.' };
  }

  const [{ data: statusRows, error: statusErr }, { data: sigRows, error: sigErr }] =
    await Promise.all([
      admin
        .from('trip_report_status_events')
        .select('id, from_status, to_status, created_at, actor_profile_id, metadata')
        .eq('trip_report_id', tripReportId),
      admin
        .from('trip_report_signature_audit')
        .select(
          'id, trip_report_id, kind, actor_profile_id, printed_name, attestation_text, content_hash, password_verified, reason, signed_at_db, ip_address, user_agent'
        )
        .eq('trip_report_id', tripReportId),
    ]);
  if (statusErr) return { entries: [], error: statusErr.message };
  if (sigErr) return { entries: [], error: sigErr.message };

  const status = (statusRows ?? []) as TripReportStatusEventRow[];
  const sigs = (sigRows ?? []) as TripReportSignatureAuditRow[];
  const actorIds = [
    ...new Set([
      ...status.map((e) => e.actor_profile_id),
      ...sigs.map((e) => e.actor_profile_id),
    ].filter((v): v is string => !!v)),
  ];
  const nameById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', actorIds);
    (profs ?? []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      nameById[p.id] = name || '—';
    });
  }
  const statusEntries: TripReportAuditTimelineEntry[] = status.map((e) => ({
    kind: 'status',
    at: e.created_at,
    event: {
      ...e,
      actor_display_name: e.actor_profile_id ? nameById[e.actor_profile_id] ?? null : null,
    },
  }));
  const sigEntries: TripReportAuditTimelineEntry[] = sigs.map((e) => ({
    kind: 'signature',
    at: e.signed_at_db,
    event: {
      ...e,
      actor_display_name: e.actor_profile_id ? nameById[e.actor_profile_id] ?? null : null,
    },
  }));
  const merged = [...statusEntries, ...sigEntries].sort((a, b) => a.at.localeCompare(b.at));
  return { entries: merged, error: null };
}

export async function saveReportDraft(
  reportId: string,
  responses: { template_question_id: string; response: string | null; comments: string | null; reviewer_comments: string | null }[],
  narrative?: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };

    // First-edit lock-in: re-snapshot the live template if it changed
    // since the create-snapshot, while the report is still report_pending.
    // No-op once the report transitions out of report_pending below.
    const refresh = await maybeRefreshSnapshotForReport(reportId, supabase, profileId);
    if (refresh.error) return { error: refresh.error };

    const { data: existing } = await supabase
      .from('trip_reports')
      .select('report_status')
      .eq('id', reportId)
      .single();
    const status = (existing as { report_status?: string } | null)?.report_status;
    const reportUpdate: Record<string, unknown> = {};
    if (status !== 'returned') {
      reportUpdate.report_status = 'authoring';
    }
    if (narrative !== undefined) reportUpdate.narrative = narrative ?? null;
    if (Object.keys(reportUpdate).length > 0) {
      await supabase.from('trip_reports').update(reportUpdate).eq('id', reportId);
    }

    for (const r of responses) {
      const upsertErr = await upsertResponseRow(supabase, reportId, {
        template_question_id: r.template_question_id,
        response: r.response,
        comments: r.comments,
        reviewer_comments: r.reviewer_comments,
      });
      if (upsertErr) return { error: upsertErr };
    }
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Internal helper: upsert a question response, choosing whether to write
 * `template_question_version_id` (snapshot reports) or
 * `template_question_id` (legacy reports) based on whether the report
 * has a template_version_id and whether the inbound id resolves to a
 * version row.
 *
 * We use select + insert/update instead of PostgREST `.upsert(onConflict:
 * ...)` because uniqueness is enforced by *partial* unique indexes
 * (20260601 migration). PostgreSQL does not use partial indexes for
 * ON CONFLICT inference, so `.upsert` fails with "no unique or exclusion
 * constraint matching the ON CONFLICT specification".
 */
async function upsertResponseRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  row: {
    template_question_id: string;
    response: string | null;
    comments: string | null;
    reviewer_comments: string | null;
  }
): Promise<string | null> {
  const versionQuestionId = await resolveTemplateQuestionVersionId(
    supabase,
    reportId,
    row.template_question_id
  );
  const payload = {
    response: row.response,
    comments: row.comments,
    reviewer_comments: row.reviewer_comments,
    sort_order: 0,
  };

  if (versionQuestionId) {
    const { data: existing, error: selErr } = await supabase
      .from('trip_report_question_responses')
      .select('id')
      .eq('trip_report_id', reportId)
      .eq('template_question_version_id', versionQuestionId)
      .maybeSingle();
    if (selErr) return selErr.message;

    const insertRow = {
      trip_report_id: reportId,
      template_question_version_id: versionQuestionId,
      template_question_id: null as string | null,
      ...payload,
    };
    if (existing?.id) {
      const { error } = await supabase
        .from('trip_report_question_responses')
        .update(insertRow)
        .eq('id', existing.id);
      return error?.message ?? null;
    }
    const { error } = await supabase.from('trip_report_question_responses').insert(insertRow);
    return error?.message ?? null;
  }

  const { data: existing, error: selErr } = await supabase
    .from('trip_report_question_responses')
    .select('id')
    .eq('trip_report_id', reportId)
    .eq('template_question_id', row.template_question_id)
    .maybeSingle();
  if (selErr) return selErr.message;

  const insertRow = {
    trip_report_id: reportId,
    template_question_id: row.template_question_id,
    ...payload,
  };
  if (existing?.id) {
    const { error } = await supabase
      .from('trip_report_question_responses')
      .update(insertRow)
      .eq('id', existing.id);
    return error?.message ?? null;
  }
  const { error } = await supabase.from('trip_report_question_responses').insert(insertRow);
  return error?.message ?? null;
}

export async function submitReport(
  reportId: string,
  options: {
    signatureData: string;
    signedAt?: string;
    printedName: string;
    attestationText: string;
    password: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const sig = options?.signatureData?.trim() ?? '';
    const printedName = (options?.printedName ?? '').trim();
    const attestationText = options?.attestationText ?? '';
    const password = options?.password ?? '';
    if (!sig) {
      return { error: 'Electronic signature is required to submit the report.' };
    }
    if (!printedName) {
      return { error: 'Please type your full legal name to sign.' };
    }
    if (attestationText !== TRIP_REPORT_AUTHOR_ATTESTATION) {
      return { error: 'Attestation text does not match the required statement; reload the page and try again.' };
    }

    const identity = await loadSignerIdentity(supabase);
    if (identity.error || !identity.profileId) {
      return { error: identity.error ?? 'No profile found.' };
    }
    const profileId = identity.profileId;

    const roleErr = await assertReportAuthorPermission(supabase, profileId, reportId);
    if (roleErr) return { error: roleErr };

    // 11.300: server-side password reverification (the modal verifies as
    // a UX nicety; this is the source of truth).
    const pwErr = await assertPasswordReverified(supabase, identity.email, password);
    if (pwErr) return { error: pwErr };

    // 11.50: validate the typed printed name against the profile name.
    if (!namesMatch(printedName, { first_name: identity.firstName, last_name: identity.lastName })) {
      return { error: 'The name you typed does not match the name on your account.' };
    }

    // First-edit lock-in: re-snapshot the live template if it changed
    // since the create-snapshot, while the report is still report_pending.
    const refresh = await maybeRefreshSnapshotForReport(reportId, supabase, profileId);
    if (refresh.error) return { error: refresh.error };

    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, visit_id, reviewer_id')
      .eq('id', reportId)
      .single();
    const status = (report as { report_status?: string; visit_id?: string; reviewer_id?: string | null } | null)?.report_status;
    if (status !== 'report_pending' && status !== 'authoring' && status !== 'returned') {
      return { error: 'Report can only be submitted from report pending, authoring, or returned status' };
    }
    const fromStatus = status ?? 'report_pending';

    // 11.70: bind the signature to the record content via a SHA-256
    // over the canonical signed payload.
    const { hash: contentHash, error: hashErr } = await computeReportContentHash(supabase, reportId);
    if (hashErr) return { error: hashErr };

    const signedAtDb = new Date().toISOString();
    const clientSignedAt = (options.signedAt ?? '').trim();

    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'submitted',
        submitted_date: signedAtDb.split('T')[0],
        // Legacy columns kept populated for back-compat through one release.
        author_submission_signature_data: sig,
        author_submission_signed_at: clientSignedAt || signedAtDb,
        // New first-class signature manifestation columns.
        author_submission_printed_name: printedName,
        author_submission_attestation_text: attestationText,
        author_submission_signed_at_db: signedAtDb,
        author_submission_content_hash: contentHash,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };

    const meta = await captureSignatureRequestMetadata();
    const audit = await logTripReportSignatureAudit({
      tripReportId: reportId,
      kind: 'author_submit',
      actorProfileId: profileId,
      printedName,
      attestationText,
      contentHash,
      passwordVerified: true,
      signedAtDb,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    if (audit.error) {
      // Treat audit failure as a hard fail so we never leave a signed
      // record without its corresponding audit row. The status event is
      // not yet inserted, so the report stays in its prior status.
      return { error: `Failed to record signature audit: ${audit.error}` };
    }

    const visitId = (report as { visit_id?: string })?.visit_id;
    const { studyId } = visitId ? await getStudyIdForVisit(supabase, visitId) : { studyId: null as string | null };
    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus,
      toStatus: 'submitted',
      actorProfileId: profileId,
    });
    if (studyId && visitId) {
      await notifyReportSubmitted({
        studyId,
        visitId,
        reviewerId: (report as { reviewer_id?: string | null })?.reviewer_id ?? null,
      });
    }
    revalidateTripReportRelatedUi(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function startReview(reportId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const cpmErr = await assertReportCpmPermission(supabase, profileId, reportId);
    if (cpmErr) return { error: cpmErr };

    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id')
      .eq('id', reportId)
      .single();
    const r = report as { report_status?: string; reviewer_id?: string | null } | null;
    const status = r?.report_status;
    if (status !== 'submitted') {
      return { error: 'Report must be in submitted status to start review' };
    }
    const fromStatus = status;
    const update: Record<string, unknown> = {
      report_status: 'under_review',
      reviewed_at: new Date().toISOString(),
      reviewer_id: profileId,
    };
    const { error } = await supabase.from('trip_reports').update(update).eq('id', reportId);
    if (error) return { error: error.message };
    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus,
      toStatus: 'under_review',
      actorProfileId: profileId,
    });
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * CPM opens report via `/claim-review` route (or legacy flow): assign self as reviewer; if submitted, start review.
 */
export async function claimReportReviewForVisit(visitId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data: report, error: re } = await supabase
      .from('trip_reports')
      .select('id, report_status')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (re) return { error: re.message };
    const row = report as { id: string; report_status?: string } | null;
    if (!row?.id) return { error: 'No trip report found for this visit.' };

    const cpmErr = await assertReportCpmPermission(supabase, profileId, row.id);
    if (cpmErr) return { error: cpmErr };

    const st = row.report_status ?? '';
    if (st === 'submitted') {
      const assignErr = await assignReportReviewer(row.id, profileId);
      if (assignErr.error) return assignErr;
      return startReview(row.id);
    }
    if (st === 'under_review') {
      return assignReportReviewer(row.id, profileId);
    }
    return {
      error: 'Report must be submitted or under review to open for review.',
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export type TripReportSectionReviewerComments = {
  reviewer_comments_site_attendees: string | null;
  reviewer_comments_sponsor_attendees: string | null;
  reviewer_comments_monitored_crfs: string | null;
  reviewer_comments_narrative: string | null;
  reviewer_comments_open_actions: string | null;
  reviewer_comments_attachments: string | null;
};

export async function saveReviewerComments(
  reportId: string,
  responses: {
    template_question_id: string;
    response: string | null;
    comments: string | null;
    reviewer_comments: string | null;
  }[],
  sectionComments: TripReportSectionReviewerComments
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id')
      .eq('id', reportId)
      .single();
    const r = report as { report_status?: string; reviewer_id?: string } | null;
    if (!r || r.report_status !== 'under_review') {
      return { error: 'Report must be under review to save reviewer comments' };
    }
    const profileId = await getProfileId();
    const revErr = await assertReportReviewerPermission(supabase, profileId, reportId, r.reviewer_id);
    if (revErr) return { error: revErr };
    for (const row of responses) {
      const upsertErr = await upsertResponseRow(supabase, reportId, {
        template_question_id: row.template_question_id,
        response: row.response,
        comments: row.comments,
        reviewer_comments: row.reviewer_comments,
      });
      if (upsertErr) return { error: upsertErr };
    }
    const { error: reportUpErr } = await supabase.from('trip_reports').update(sectionComments).eq('id', reportId);
    if (reportUpErr) return { error: reportUpErr.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function returnReport(
  reportId: string,
  responses?: { template_question_id: string; reviewer_comments: string | null }[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id, created_by, visit_id')
      .eq('id', reportId)
      .single();
    const r = report as {
      report_status?: string;
      reviewer_id?: string;
      created_by?: string;
      visit_id?: string;
    } | null;
    if (!r || r.report_status !== 'under_review') {
      return { error: 'Report must be under review to return to CRA' };
    }
    const profileId = await getProfileId();
    const revErr = await assertReportReviewerPermission(supabase, profileId, reportId, r.reviewer_id);
    if (revErr) return { error: revErr };
    if (responses && responses.length > 0) {
      for (const res of responses) {
        // Branches on whether the report has a snapshot. Reviewer-only
        // partial upsert: do NOT include response / comments so existing
        // values aren't overwritten to null on conflict.
        const versionQuestionId = await resolveTemplateQuestionVersionId(
          supabase,
          reportId,
          res.template_question_id
        );
        if (versionQuestionId) {
          const { data: existing, error: selErr } = await supabase
            .from('trip_report_question_responses')
            .select('id')
            .eq('trip_report_id', reportId)
            .eq('template_question_version_id', versionQuestionId)
            .maybeSingle();
          if (selErr) return { error: selErr.message };
          const row = {
            trip_report_id: reportId,
            template_question_version_id: versionQuestionId,
            template_question_id: null as string | null,
            reviewer_comments: res.reviewer_comments,
            sort_order: 0,
          };
          if (existing?.id) {
            const { error: updErr } = await supabase
              .from('trip_report_question_responses')
              .update({ reviewer_comments: res.reviewer_comments, sort_order: 0 })
              .eq('id', existing.id);
            if (updErr) return { error: updErr.message };
          } else {
            const { error: insErr } = await supabase.from('trip_report_question_responses').insert(row);
            if (insErr) return { error: insErr.message };
          }
        } else {
          const { data: existing, error: selErr } = await supabase
            .from('trip_report_question_responses')
            .select('id')
            .eq('trip_report_id', reportId)
            .eq('template_question_id', res.template_question_id)
            .maybeSingle();
          if (selErr) return { error: selErr.message };
          const row = {
            trip_report_id: reportId,
            template_question_id: res.template_question_id,
            reviewer_comments: res.reviewer_comments,
            sort_order: 0,
          };
          if (existing?.id) {
            const { error: updErr } = await supabase
              .from('trip_report_question_responses')
              .update({ reviewer_comments: res.reviewer_comments, sort_order: 0 })
              .eq('id', existing.id);
            if (updErr) return { error: updErr.message };
          } else {
            const { error: insErr } = await supabase.from('trip_report_question_responses').insert(row);
            if (insErr) return { error: insErr.message };
          }
        }
      }
    }
    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'returned',
        author_submission_signature_data: null,
        author_submission_signed_at: null,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'under_review',
      toStatus: 'returned',
      actorProfileId: profileId,
    });
    let returnStudyId: string | null = null;
    if (r.created_by && r.visit_id) {
      const { studyId } = await getStudyIdForVisit(supabase, r.visit_id);
      returnStudyId = studyId;
      if (studyId) {
        await notifyReportReturnedToAuthor({
          authorProfileId: r.created_by,
          visitId: r.visit_id,
          studyId,
        });
      }
    }
    if (returnStudyId) {
      revalidateTripReportRelatedUi(returnStudyId);
    } else {
      await revalidateAfterReportMutation(supabase, reportId);
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/** Recall a submitted report back to authoring. Only the report author can recall. */
export async function recallReport(reportId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, created_by')
      .eq('id', reportId)
      .single();
    const r = report as { report_status?: string; created_by?: string } | null;
    if (!r || r.report_status !== 'submitted') {
      return { error: 'Report can only be recalled when it is in submitted status' };
    }
    if (r.created_by && r.created_by !== profileId) {
      return { error: 'Only the report author can recall a submitted report' };
    }
    const craErr = await assertReportAuthorPermission(supabase, profileId, reportId);
    if (craErr) return { error: craErr };

    // No-op when the report is not in report_pending, but we keep the
    // call here for symmetry with the rest of the author-write entry
    // points so the gate is consistent.
    const refresh = await maybeRefreshSnapshotForReport(reportId, supabase, profileId);
    if (refresh.error) return { error: refresh.error };
    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'authoring',
        submitted_date: null,
        author_submission_signature_data: null,
        author_submission_signed_at: null,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'submitted',
      toStatus: 'authoring',
      actorProfileId: profileId,
    });
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

const VOID_APPROVAL_REASON_MIN = 15;
const VOID_APPROVAL_REASON_MAX = 2000;

/** Void an approved report and return it to the CRA for corrections. Company admin only; requires reason + password re-verification. */
export async function voidApproval(
  reportId: string,
  input: { reason: string; password: string }
): Promise<{ error: string | null }> {
  const trimmedReason = input.reason?.trim() ?? '';
  if (trimmedReason.length < VOID_APPROVAL_REASON_MIN) {
    return { error: `Please provide a reason of at least ${VOID_APPROVAL_REASON_MIN} characters.` };
  }
  if (trimmedReason.length > VOID_APPROVAL_REASON_MAX) {
    return { error: `Reason must be at most ${VOID_APPROVAL_REASON_MAX} characters.` };
  }
  const password = input.password ?? '';
  if (!password) {
    return { error: 'Password is required.' };
  }

  const supabase = await createClient();
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.email) {
      return { error: 'You must be signed in with an email and password to void approval.' };
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signErr) {
      return { error: 'Invalid password or this account cannot re-authenticate with a password.' };
    }

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (profileErr || !profileRow) {
      return { error: 'No profile found.' };
    }
    const profileId = (profileRow as { id: string }).id;
    const role = await getProfileRole(supabase, profileId);
    if (role !== 'admin') {
      return { error: 'Only company administrators can void an approval.' };
    }

    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status')
      .eq('id', reportId)
      .single();
    const r = report as { report_status?: string } | null;
    if (!r || r.report_status !== 'approved_and_signed') {
      return { error: 'Only an approved report can be voided' };
    }

    // Resolve printed name from the signer's profile (no typed-name UI
    // for voids today; the admin's stored profile name is the canonical
    // printed-name source for the audit row).
    const { data: signerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', profileId)
      .maybeSingle();
    const sp = signerProfile as { first_name: string | null; last_name: string | null } | null;
    const voidPrintedName = [sp?.first_name, sp?.last_name].filter(Boolean).join(' ').trim() || 'Unknown signer';

    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'returned',
        approved_by: null,
        approved_date: null,
        approval_signature_data: null,
        approval_signed_at: null,
        approval_printed_name: null,
        approval_attestation_text: null,
        approval_signed_at_db: null,
        approval_content_hash: null,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };

    const meta = await captureSignatureRequestMetadata();
    const audit = await logTripReportSignatureAudit({
      tripReportId: reportId,
      kind: 'void_approval',
      actorProfileId: profileId,
      printedName: voidPrintedName,
      attestationText: TRIP_REPORT_VOID_ATTESTATION,
      contentHash: null,
      passwordVerified: true,
      reason: trimmedReason,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    if (audit.error) {
      return { error: `Failed to record signature audit: ${audit.error}` };
    }

    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'approved_and_signed',
      toStatus: 'returned',
      actorProfileId: profileId,
      metadata: { void_approval: true, reason: trimmedReason },
    });
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function approveReport(
  reportId: string,
  options: {
    signatureData: string;
    signedAt?: string;
    printedName: string;
    attestationText: string;
    password: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const sig = options?.signatureData?.trim() ?? '';
    const printedName = (options?.printedName ?? '').trim();
    const attestationText = options?.attestationText ?? '';
    const password = options?.password ?? '';
    if (!sig) {
      return { error: 'Electronic signature is required to approve the report.' };
    }
    if (!printedName) {
      return { error: 'Please type your full legal name to sign.' };
    }
    if (attestationText !== TRIP_REPORT_APPROVER_ATTESTATION) {
      return { error: 'Attestation text does not match the required statement; reload the page and try again.' };
    }

    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id, created_by, visit_id')
      .eq('id', reportId)
      .single();
    const r = report as {
      report_status?: string;
      reviewer_id?: string | null;
      created_by?: string;
      visit_id?: string;
    } | null;
    if (!r || r.report_status !== 'under_review') {
      return { error: 'Report must be under review to approve' };
    }

    const identity = await loadSignerIdentity(supabase);
    if (identity.error || !identity.profileId) {
      return { error: identity.error ?? 'No profile found.' };
    }
    const profileId = identity.profileId;

    const revErr = await assertReportReviewerPermission(supabase, profileId, reportId, r.reviewer_id);
    if (revErr) return { error: revErr };

    const pwErr = await assertPasswordReverified(supabase, identity.email, password);
    if (pwErr) return { error: pwErr };

    if (!namesMatch(printedName, { first_name: identity.firstName, last_name: identity.lastName })) {
      return { error: 'The name you typed does not match the name on your account.' };
    }

    const { hash: contentHash, error: hashErr } = await computeReportContentHash(supabase, reportId);
    if (hashErr) return { error: hashErr };

    const signedAtDb = new Date().toISOString();
    const clientSignedAt = (options.signedAt ?? '').trim();

    const payload: Record<string, unknown> = {
      report_status: 'approved_and_signed',
      approved_by: profileId,
      approved_date: signedAtDb.split('T')[0],
      approval_signature_data: sig,
      approval_signed_at: clientSignedAt || signedAtDb,
      approval_printed_name: printedName,
      approval_attestation_text: attestationText,
      approval_signed_at_db: signedAtDb,
      approval_content_hash: contentHash,
    };
    if (r.reviewer_id == null) {
      payload.reviewer_id = profileId;
      payload.reviewed_at = signedAtDb;
    }
    const { error } = await supabase
      .from('trip_reports')
      .update(payload)
      .eq('id', reportId);
    if (error) return { error: error.message };

    const meta = await captureSignatureRequestMetadata();
    const audit = await logTripReportSignatureAudit({
      tripReportId: reportId,
      kind: 'approver_approve',
      actorProfileId: profileId,
      printedName,
      attestationText,
      contentHash,
      passwordVerified: true,
      signedAtDb,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    if (audit.error) {
      return { error: `Failed to record signature audit: ${audit.error}` };
    }

    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'under_review',
      toStatus: 'approved_and_signed',
      actorProfileId: profileId,
    });
    const { studyId } = r.visit_id ? await getStudyIdForVisit(supabase, r.visit_id) : { studyId: null as string | null };
    if (studyId && r.created_by && r.visit_id) {
      await notifyReportApproved({
        studyId,
        authorProfileId: r.created_by,
        visitId: r.visit_id,
      });
    }
    revalidateTripReportRelatedUi(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================================
// Bulk approve (continuous-session signing — 21 CFR 11.200(a)(1)(ii))
// =====================================================================

export interface BulkApproveResult {
  reportId: string;
  ok: boolean;
  error: string | null;
}

export interface BulkApproveResponse {
  results: BulkApproveResult[];
  summary: { total: number; succeeded: number; failed: number };
  /**
   * Populated only when the entire batch is rejected before any audit
   * row is written (bad password, name mismatch, attestation mismatch,
   * basic input validation). Per-report failures are surfaced in
   * `results`, not here.
   */
  error: string | null;
}

/** Hard cap on the number of reports a CPM can approve in a single request. */
const APPROVE_REPORTS_BULK_MAX = 50;

/**
 * Approve N trip reports in a single continuous controlled session.
 *
 * Authentication / manifestation challenges happen ONCE per call:
 *   - `signInWithPassword` reverification (server-side; client check is UX-only)
 *   - printed-name validation against the signer's profile
 *   - canonical attestation text byte-equality
 *
 * After the challenges pass, every report is processed atomically per
 * report (status check, study CPM permission, content hash, single
 * `trip_reports` UPDATE, signature audit row, status event,
 * notification). Failures on individual reports do NOT abort the
 * batch; they are surfaced as `{ ok: false, error }` rows in `results`
 * so the CPM can retry just those.
 *
 * Every successful audit row is stamped with the same generated
 * `signing_session_id` so a regulator can re-tie the per-record
 * manifestations back to the single session that authorized them.
 */
export async function approveReportsBulk(
  reportIds: string[],
  options: {
    signatureData: string;
    signedAt?: string;
    printedName: string;
    attestationText: string;
    password: string;
  }
): Promise<BulkApproveResponse> {
  const empty: BulkApproveResponse = {
    results: [],
    summary: { total: 0, succeeded: 0, failed: 0 },
    error: null,
  };
  const ids = Array.from(new Set((reportIds ?? []).filter((s) => typeof s === 'string' && s.trim() !== '')));
  if (ids.length === 0) {
    return { ...empty, error: 'No reports selected.' };
  }
  if (ids.length > APPROVE_REPORTS_BULK_MAX) {
    return {
      ...empty,
      error: `Cannot approve more than ${APPROVE_REPORTS_BULK_MAX} reports in a single batch.`,
    };
  }

  const sig = options?.signatureData?.trim() ?? '';
  const printedName = (options?.printedName ?? '').trim();
  const attestationText = options?.attestationText ?? '';
  const password = options?.password ?? '';
  if (!sig) return { ...empty, error: 'Electronic signature is required to approve the reports.' };
  if (!printedName) return { ...empty, error: 'Please type your full legal name to sign.' };
  if (attestationText !== TRIP_REPORT_APPROVER_ATTESTATION) {
    return {
      ...empty,
      error: 'Attestation text does not match the required statement; reload the page and try again.',
    };
  }

  const supabase = await createClient();
  try {
    const identity = await loadSignerIdentity(supabase);
    if (identity.error || !identity.profileId) {
      return { ...empty, error: identity.error ?? 'No profile found.' };
    }
    const profileId = identity.profileId;

    // 11.200: ONE server-side reverification per session.
    const pwErr = await assertPasswordReverified(supabase, identity.email, password);
    if (pwErr) return { ...empty, error: pwErr };

    // 11.50: ONE printed-name match per session.
    if (!namesMatch(printedName, { first_name: identity.firstName, last_name: identity.lastName })) {
      return { ...empty, error: 'The name you typed does not match the name on your account.' };
    }

    // The shared session id every successful audit row in this batch
    // will carry. NULL on the existing per-report flows so we don't
    // disturb single-report audit semantics.
    const signingSessionId = crypto.randomUUID();
    const meta = await captureSignatureRequestMetadata();

    const results: BulkApproveResult[] = [];
    for (const reportId of ids) {
      const reportRes = await processOneApprovalForBulk(supabase, {
        reportId,
        profileId,
        sig,
        printedName,
        attestationText,
        clientSignedAt: (options.signedAt ?? '').trim(),
        signingSessionId,
        meta,
      });
      results.push(reportRes);
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;
    revalidateTripReportRelatedUi(null);
    return {
      results,
      summary: { total: results.length, succeeded, failed },
      error: null,
    };
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Approve a single report inside a `approveReportsBulk` loop. All the
 * cross-batch validation (password, printed name, attestation) is
 * already done by the caller; this just runs the per-report part of
 * the per-report `approveReport` flow with the shared
 * `signingSessionId` threaded through to the audit row.
 *
 * Returns `{ ok, error }` per report — never throws into the batch
 * loop so one bad report cannot abort the rest.
 */
async function processOneApprovalForBulk(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    reportId: string;
    profileId: string;
    sig: string;
    printedName: string;
    attestationText: string;
    clientSignedAt: string;
    signingSessionId: string;
    meta: { ipAddress: string | null; userAgent: string | null };
  }
): Promise<BulkApproveResult> {
  const { reportId, profileId, sig, printedName, attestationText, clientSignedAt, signingSessionId, meta } =
    input;
  try {
    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id, created_by, visit_id')
      .eq('id', reportId)
      .single();
    const r = report as {
      report_status?: string;
      reviewer_id?: string | null;
      created_by?: string;
      visit_id?: string;
    } | null;
    if (!r) return { reportId, ok: false, error: 'Report not found.' };
    if (r.report_status !== 'under_review') {
      return { reportId, ok: false, error: 'Report is no longer under review.' };
    }

    const revErr = await assertReportReviewerPermission(supabase, profileId, reportId, r.reviewer_id);
    if (revErr) return { reportId, ok: false, error: revErr };

    const { hash: contentHash, error: hashErr } = await computeReportContentHash(supabase, reportId);
    if (hashErr) return { reportId, ok: false, error: hashErr };

    const signedAtDb = new Date().toISOString();
    const payload: Record<string, unknown> = {
      report_status: 'approved_and_signed',
      approved_by: profileId,
      approved_date: signedAtDb.split('T')[0],
      approval_signature_data: sig,
      approval_signed_at: clientSignedAt || signedAtDb,
      approval_printed_name: printedName,
      approval_attestation_text: attestationText,
      approval_signed_at_db: signedAtDb,
      approval_content_hash: contentHash,
    };
    if (r.reviewer_id == null) {
      payload.reviewer_id = profileId;
      payload.reviewed_at = signedAtDb;
    }
    const { error: updErr } = await supabase
      .from('trip_reports')
      .update(payload)
      .eq('id', reportId);
    if (updErr) return { reportId, ok: false, error: updErr.message };

    const audit = await logTripReportSignatureAudit({
      tripReportId: reportId,
      kind: 'approver_approve',
      actorProfileId: profileId,
      printedName,
      attestationText,
      contentHash,
      passwordVerified: true,
      signedAtDb,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      signingSessionId,
    });
    if (audit.error) {
      return {
        reportId,
        ok: false,
        error: `Failed to record signature audit: ${audit.error}`,
      };
    }

    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'under_review',
      toStatus: 'approved_and_signed',
      actorProfileId: profileId,
    });

    if (r.visit_id) {
      const { studyId } = await getStudyIdForVisit(supabase, r.visit_id);
      if (studyId && r.created_by) {
        try {
          await notifyReportApproved({
            studyId,
            authorProfileId: r.created_by,
            visitId: r.visit_id,
          });
        } catch (notifyErr) {
          // Notifications are best-effort; never fail an already-signed report.
          console.error('notifyReportApproved (bulk) failed:', notifyErr);
        }
      }
    }

    return { reportId, ok: true, error: null };
  } catch (err) {
    return {
      reportId,
      ok: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/** CPM on study may assign or clear `reviewer_id` while submitted or under_review. */
export async function assignReportReviewer(
  reportId: string,
  reviewerProfileId: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const cpmErr = await assertReportCpmPermission(supabase, profileId, reportId);
    if (cpmErr) return { error: cpmErr };

    const { data: rep, error: fe } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id, visit_id')
      .eq('id', reportId)
      .single();
    if (fe || !rep) return { error: fe?.message ?? 'Report not found' };
    const st = (rep as { report_status?: string }).report_status ?? '';
    if (st !== 'submitted' && st !== 'under_review') {
      return { error: 'Reviewer can only be assigned while the report is submitted or under review.' };
    }

    const { studyId, error: se } = await getStudyIdForReport(supabase, reportId);
    if (se || !studyId) return { error: se ?? 'Study not found for this report.' };

    if (reviewerProfileId) {
      const ok = await profileHasStudyRoles(supabase, reviewerProfileId, studyId, [REPORT_REVIEWER_ROLE]);
      if (!ok) {
        return { error: 'Assigned reviewer must be a Clinical Project Manager on this study.' };
      }
    }

    const prev = (rep as { reviewer_id?: string | null }).reviewer_id ?? null;
    const visitId = (rep as { visit_id: string }).visit_id;
    const { error } = await supabase
      .from('trip_reports')
      .update({ reviewer_id: reviewerProfileId })
      .eq('id', reportId);
    if (error) return { error: error.message };

    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: st,
      toStatus: st,
      actorProfileId: profileId,
      metadata: {
        action: 'assign_reviewer',
        previous_reviewer_id: prev,
        reviewer_id: reviewerProfileId,
      },
    });
    if (reviewerProfileId && reviewerProfileId !== prev) {
      await notifyReviewerAssigned({ reviewerProfileId, visitId, studyId });
    }
    revalidateTripReportRelatedUi(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function transitionReportStatusForTest(
  reportId: string,
  targetStatus: 'submitted' | 'under_review' | 'returned' | 'approved_and_signed' | 'authoring'
): Promise<{ error: string | null }> {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Workflow test is only available in development' };
  }
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data: report } = await supabase
      .from('trip_reports')
      .select('report_status, reviewer_id')
      .eq('id', reportId)
      .single();
    const r = report as { report_status?: string; reviewer_id?: string } | null;
    const status = r?.report_status ?? 'report_pending';

    const validTransitions: Record<string, string[]> = {
      authoring: ['submitted'],
      returned: ['submitted'],
      report_pending: ['submitted'],
      draft: ['submitted'],
      submitted: ['under_review', 'authoring'],
      under_review: ['returned', 'approved_and_signed'],
      approved_and_signed: ['returned'],
    };
    const allowed = validTransitions[status];
    if (!allowed || !allowed.includes(targetStatus)) {
      return { error: `Cannot transition from "${status}" to "${targetStatus}"` };
    }

    const payload: Record<string, unknown> = {};
    if (targetStatus === 'submitted') {
      payload.report_status = 'submitted';
      payload.submitted_date = new Date().toISOString().split('T')[0];
    } else if (targetStatus === 'authoring') {
      payload.report_status = 'authoring';
      payload.submitted_date = null;
    } else if (targetStatus === 'under_review') {
      payload.report_status = 'under_review';
      payload.reviewed_at = new Date().toISOString();
      if (r?.reviewer_id == null) {
        payload.reviewer_id = profileId;
      }
    } else if (targetStatus === 'returned') {
      payload.report_status = 'returned';
      if (status === 'approved_and_signed') {
        payload.approved_by = null;
        payload.approved_date = null;
        payload.approval_signature_data = null;
        payload.approval_signed_at = null;
      }
    } else if (targetStatus === 'approved_and_signed') {
      payload.report_status = 'approved_and_signed';
      payload.approved_by = profileId;
      payload.approved_date = new Date().toISOString().split('T')[0];
      if (r?.reviewer_id == null) {
        payload.reviewer_id = profileId;
        payload.reviewed_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('trip_reports')
      .update(payload)
      .eq('id', reportId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function saveReportNarrative(reportId: string, narrative: string | null): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };
    const payload: Record<string, unknown> = { narrative: narrative ?? null };
    const { error } = await supabase.from('trip_reports').update(payload).eq('id', reportId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function linkReportToTemplate(
  reportId: string,
  templateId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };
    const { data: tmpl } = await supabase
      .from('visit_report_templates')
      .select('days_submission, days_approval, days_basis')
      .eq('id', templateId)
      .single();
    let submissionDue: string | null = null;
    let approvalDue: string | null = null;
    if (tmpl) {
      const { data: report } = await supabase
        .from('trip_reports')
        .select('visit_id')
        .eq('id', reportId)
        .single();
      const { data: visit } = report?.visit_id
        ? await supabase
            .from('monitoring_visits')
            .select('start_date')
            .eq('id', report.visit_id)
            .single()
        : { data: null };
      const startIso = visit?.start_date
        ? isoDateOnly(String(visit.start_date))
        : isoDateOnly(new Date().toISOString());
      const basis = normalizeTripReportDaysBasis(
        (tmpl as { days_basis?: string | null }).days_basis
      );
      const ds = tmpl.days_submission ?? 14;
      const da = tmpl.days_approval ?? 7;
      const due = submissionAndApprovalDueFromVisitStart(startIso, ds, da, basis);
      submissionDue = due.submissionDue;
      approvalDue = due.approvalDue;
    }
    const { error } = await supabase
      .from('trip_reports')
      .update({
        template_id: templateId,
        // Clear any previous snapshot so snapshotTemplateForReport
        // captures the freshly-linked template instead of skipping
        // because of a stale template_version_id pointing at the prior
        // template's snapshot.
        template_version_id: null,
        submission_due_date: submissionDue,
        approval_due_date: approvalDue,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
    const snap = await snapshotTemplateForReport(reportId, supabase, {
      reason: 'on_create',
      profileId,
    });
    if (snap.error) return { error: snap.error };
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function addAttendee(
  reportId: string,
  input: { first_name: string; last_name: string; role: string | null; attendee_type: 'site' | 'sponsor' }
): Promise<{ data: TripReportAttendee | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: null, error: permErr };
    const { data: max } = await supabase
      .from('trip_report_attendees')
      .select('sort_order')
      .eq('trip_report_id', reportId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = ((max as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from('trip_report_attendees')
      .insert({
        trip_report_id: reportId,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role ?? null,
        attendee_type: input.attendee_type,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { data: data as TripReportAttendee, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function removeAttendee(attendeeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const admin = createAdminClient();
    const { data: row } = await admin
      .from('trip_report_attendees')
      .select('trip_report_id')
      .eq('id', attendeeId)
      .maybeSingle();
    const rid = (row as { trip_report_id?: string } | null)?.trip_report_id;
    if (!rid) return { error: 'Attendee not found' };
    const permErr = await assertAuthorCanEditReport(supabase, profileId, rid);
    if (permErr) return { error: permErr };
    const { error } = await supabase.from('trip_report_attendees').delete().eq('id', attendeeId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, rid);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface AddCrfEntryInput {
  subject_number?: string | null;
  crf_name?: string | null;
  sdv_status?: string | null;
  /** Traceability link back to the eCRF tracking matrix. */
  subject_id?: string | null;
  subject_visit_id?: string | null;
  subject_crf_id?: string | null;
}

export async function addCrfEntry(
  reportId: string,
  input: AddCrfEntryInput
): Promise<{ data: TripReportCrfEntry | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: null, error: permErr };
    const { data: max } = await supabase
      .from('trip_report_crf_entries')
      .select('sort_order')
      .eq('trip_report_id', reportId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = ((max as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from('trip_report_crf_entries')
      .insert({
        trip_report_id: reportId,
        subject_number: input.subject_number ?? null,
        crf_name: input.crf_name ?? null,
        sdv_status: input.sdv_status ?? null,
        subject_id: input.subject_id ?? null,
        subject_visit_id: input.subject_visit_id ?? null,
        subject_crf_id: input.subject_crf_id ?? null,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { data: data as TripReportCrfEntry, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Insert several CRF entries at once. Skips items whose `subject_crf_id` is
 * already linked on this report (the partial unique index added by
 * 20260606000000 enforces uniqueness on `(trip_report_id, subject_crf_id)`).
 *
 * Returns the inserted rows and the count of skipped duplicates so the UI
 * can surface a single toast like "Added 3, skipped 1 already-linked".
 */
export async function addCrfEntriesBulk(
  reportId: string,
  entries: AddCrfEntryInput[]
): Promise<{ data: TripReportCrfEntry[]; skipped: number; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: [], skipped: 0, error: permErr };

    if (!entries || entries.length === 0) {
      return { data: [], skipped: 0, error: null };
    }

    // De-dupe against rows already linked by subject_crf_id; freetext rows
    // (no FK) are never considered duplicates.
    const candidateLinkIds = entries
      .map((e) => e.subject_crf_id)
      .filter((v): v is string => !!v);
    let alreadyLinked = new Set<string>();
    if (candidateLinkIds.length > 0) {
      const { data: existing } = await supabase
        .from('trip_report_crf_entries')
        .select('subject_crf_id')
        .eq('trip_report_id', reportId)
        .in('subject_crf_id', candidateLinkIds);
      alreadyLinked = new Set(
        (existing ?? [])
          .map((r: { subject_crf_id: string | null }) => r.subject_crf_id)
          .filter((v): v is string => !!v)
      );
    }

    const fresh = entries.filter(
      (e) => !e.subject_crf_id || !alreadyLinked.has(e.subject_crf_id)
    );
    const skipped = entries.length - fresh.length;
    if (fresh.length === 0) {
      return { data: [], skipped, error: null };
    }

    const { data: max } = await supabase
      .from('trip_report_crf_entries')
      .select('sort_order')
      .eq('trip_report_id', reportId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const baseSortOrder = ((max as { sort_order?: number } | null)?.sort_order ?? -1) + 1;

    const rows = fresh.map((e, i) => ({
      trip_report_id: reportId,
      subject_number: e.subject_number ?? null,
      crf_name: e.crf_name ?? null,
      sdv_status: e.sdv_status ?? null,
      subject_id: e.subject_id ?? null,
      subject_visit_id: e.subject_visit_id ?? null,
      subject_crf_id: e.subject_crf_id ?? null,
      sort_order: baseSortOrder + i,
    }));

    const { data, error } = await supabase
      .from('trip_report_crf_entries')
      .insert(rows)
      .select();
    if (error) return { data: [], skipped, error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { data: (data ?? []) as TripReportCrfEntry[], skipped, error: null };
  } catch (err) {
    return {
      data: [],
      skipped: 0,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Subject picker source for the trip report's "Monitored CRF(s)" section.
 * Returns subjects belonging to a single site so a CRA writing the report can
 * pick from real subjects on this visit's site, then drill into their eCRF
 * tracking matrix via `getSubjectEcrfTracking`. Caller must have report-edit
 * permissions on `reportId`.
 */
export async function loadSiteSubjectsForCrfPicker(
  reportId: string,
  siteId: string
): Promise<{
  data: { id: string; subject_number: string; status: string | null }[];
  error: string | null;
}> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: [], error: permErr };

    const { data, error } = await supabase
      .from('subjects')
      .select('id, subject_number, status')
      .eq('site_id', siteId)
      .order('subject_number', { ascending: true });
    if (error) return { data: [], error: error.message };
    return {
      data: (data ?? []) as { id: string; subject_number: string; status: string | null }[],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function removeCrfEntry(entryId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const admin = createAdminClient();
    const { data: row } = await admin
      .from('trip_report_crf_entries')
      .select('trip_report_id')
      .eq('id', entryId)
      .maybeSingle();
    const rid = (row as { trip_report_id?: string } | null)?.trip_report_id;
    if (!rid) return { error: 'Entry not found' };
    const permErr = await assertAuthorCanEditReport(supabase, profileId, rid);
    if (permErr) return { error: permErr };
    const { error } = await supabase.from('trip_report_crf_entries').delete().eq('id', entryId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, rid);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function addActionItem(
  reportId: string,
  input: { description: string; owner?: string | null; due_date?: string | null }
): Promise<{ data: TripReportActionItem | null; error: string | null }> {
  const supabase = await createClient();
  try {
    if (!input.description?.trim()) return { data: null, error: 'Description is required.' };
    if (!input.due_date) return { data: null, error: 'Due date is required.' };
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: null, error: permErr };
    const { data: max } = await supabase
      .from('trip_report_action_items')
      .select('sort_order')
      .eq('trip_report_id', reportId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = ((max as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from('trip_report_action_items')
      .insert({
        trip_report_id: reportId,
        description: input.description.trim(),
        owner: input.owner ?? null,
        due_date: input.due_date,
        status: 'open',
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { data: data as TripReportActionItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateActionItem(
  itemId: string,
  input: {
    description?: string;
    due_date?: string | null;
    status?: 'open' | 'closed';
    resolution_date?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    if (input.description !== undefined && !input.description.trim()) {
      return { error: 'Description is required.' };
    }
    if (input.due_date !== undefined && !input.due_date) {
      return { error: 'Due date is required.' };
    }
    const profileId = await getProfileId();
    const admin = createAdminClient();
    const { data: row } = await admin
      .from('trip_report_action_items')
      .select('trip_report_id')
      .eq('id', itemId)
      .maybeSingle();
    const rid = (row as { trip_report_id?: string } | null)?.trip_report_id;
    if (!rid) return { error: 'Action item not found' };
    const permErr = await assertAuthorCanEditReport(supabase, profileId, rid);
    if (permErr) return { error: permErr };
    const payload: Record<string, unknown> = {};
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.due_date !== undefined) payload.due_date = input.due_date;
    if (input.status !== undefined) payload.status = input.status;
    if (input.resolution_date !== undefined) payload.resolution_date = input.resolution_date;
    if (Object.keys(payload).length === 0) return { error: null };
    const { error } = await supabase.from('trip_report_action_items').update(payload).eq('id', itemId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, rid);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Visit Report Attachments
// =====================================================

export async function uploadVisitReportAttachment(
  reportId: string,
  formData: FormData,
  category?: string | null
): Promise<{ data: TripReportAttachment | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { data: null, error: permErr };
    const file = formData.get('file') as File | null;
    if (!file || !file.size) return { data: null, error: 'No file provided' };

    const { data: report } = await supabase
      .from('trip_reports')
      .select('id')
      .eq('id', reportId)
      .single();
    if (!report) return { data: null, error: 'Report not found' };

    // Per-report file count cap.
    const { count: existingCount, error: countErr } = await supabase
      .from('visit_report_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('trip_report_id', reportId);
    if (countErr) return { data: null, error: countErr.message };

    // Server-side size + magic-byte revalidation. We slice rather than load
    // the whole file just to read the first 16 bytes for the sniff.
    const headerBytes = new Uint8Array(
      await file.slice(0, 16).arrayBuffer(),
    );
    const validation = validateAttachmentCandidate({
      size: file.size,
      declaredMime: file.type || null,
      fileName: file.name,
      headerBytes,
      existingCount: existingCount ?? 0,
    });
    if (!validation.ok) return { data: null, error: validation.error };

    const storagePath = `${reportId}/${crypto.randomUUID()}-${encodeURIComponent(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('visit-report-attachments')
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) return { data: null, error: uploadError.message };

    const ALLOWED_ATTACHMENT_CATEGORIES = [
      'logs', 'screenshots', 'correspondence', 'regulatory', 'other',
      'Monitoring Visit Log', 'Visit Confirmation Letter', 'Visit Follow-up Letter',
    ];
    const allowedCategory = category && ALLOWED_ATTACHMENT_CATEGORIES.includes(category) ? category : null;
    const { data: row, error: insertErr } = await supabase
      .from('visit_report_attachments')
      .insert({
        trip_report_id: reportId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        category: allowedCategory,
        uploaded_by: profileId,
        scan_status: 'skipped',
        scan_status_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) return { data: null, error: insertErr.message };

    // Auto-flip the corresponding doc-availability column to 'yes' when a
    // checklist-category attachment is uploaded; clear any prior reason.
    if (allowedCategory && CATEGORY_TO_DOC_KEYS[allowedCategory]) {
      const { availabilityKey, reasonKey } = CATEGORY_TO_DOC_KEYS[allowedCategory];
      await supabase
        .from('trip_reports')
        .update({ [availabilityKey]: 'yes', [reasonKey]: null })
        .eq('id', reportId);
    }

    await revalidateAfterReportMutation(supabase, reportId);
    return { data: row as TripReportAttachment, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export async function deleteVisitReportAttachment(attachmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data: att, error: fetchErr } = await supabase
      .from('visit_report_attachments')
      .select('id, storage_path, trip_report_id, category')
      .eq('id', attachmentId)
      .single();
    if (fetchErr || !att) return { error: fetchErr?.message ?? 'Attachment not found' };
    const reportId = (att as { trip_report_id: string }).trip_report_id;
    const category = (att as { category: string | null }).category;
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };

    await supabase.storage.from('visit-report-attachments').remove([(att as { storage_path: string }).storage_path]);
    const { error: delErr } = await supabase.from('visit_report_attachments').delete().eq('id', attachmentId);
    if (delErr) return { error: delErr.message };

    // If the deleted file belongs to one of the checklist categories, count
    // remaining files in the same category for the report. If zero, reset the
    // availability column back to NULL (Pending). Reason column is left as-is
    // (it is only set when transitioning to 'no').
    if (category && CATEGORY_TO_DOC_KEYS[category]) {
      const { count } = await supabase
        .from('visit_report_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('trip_report_id', reportId)
        .eq('category', category);
      if ((count ?? 0) === 0) {
        const { availabilityKey } = CATEGORY_TO_DOC_KEYS[category];
        await supabase
          .from('trip_reports')
          .update({ [availabilityKey]: null })
          .eq('id', reportId);
      }
    }

    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  try {
    let viewerProfileId: string | null = null;
    try {
      viewerProfileId = await getProfileId();
    } catch {
      return { url: null, error: 'You must be signed in to download attachments.' };
    }

    const { data: att, error: fetchErr } = await admin
      .from('visit_report_attachments')
      .select('id, storage_path, trip_report_id, scan_status')
      .eq('id', attachmentId)
      .maybeSingle();
    if (fetchErr || !att) return { url: null, error: fetchErr?.message ?? 'Attachment not found' };

    const scanStatus = (att as { scan_status?: string | null }).scan_status ?? 'pending';
    if (scanStatus === 'pending') {
      return { url: null, error: 'Attachment is still being scanned. Please try again in a moment.' };
    }
    if (scanStatus === 'infected') {
      return { url: null, error: 'This attachment was quarantined and removed. Contact your administrator.' };
    }
    if (scanStatus === 'error') {
      return { url: null, error: 'Attachment scan failed. Contact your administrator.' };
    }

    const { data: rep } = await admin
      .from('trip_reports')
      .select('report_status, status, visit_id')
      .eq('id', (att as { trip_report_id: string }).trip_report_id)
      .maybeSingle();
    const visitId = (rep as { visit_id?: string } | null)?.visit_id;
    const { data: visitRow } = visitId
      ? await admin.from('monitoring_visits').select('study_id').eq('id', visitId).maybeSingle()
      : { data: null };
    const studyId = (visitRow as { study_id?: string } | null)?.study_id;
    if (!studyId) return { url: null, error: 'Visit not found for attachment.' };

    const { data: studyRow } = await admin.from('studies').select('company_id').eq('id', studyId).maybeSingle();
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', viewerProfileId)
      .maybeSingle();
    const studyCo = (studyRow as { company_id?: string } | null)?.company_id;
    const viewerCo = (viewerProfile as { company_id?: string } | null)?.company_id;
    if (!studyCo || !viewerCo || studyCo !== viewerCo) {
      return { url: null, error: 'You do not have permission to download this attachment.' };
    }

    const rawSt = (rep as { report_status?: string; status?: string } | null)?.report_status ?? (rep as { status?: string } | null)?.status ?? 'report_pending';
    const norm = rawSt === 'draft' ? 'report_pending' : rawSt;
    const canView = await canViewTripReportContent(supabase, viewerProfileId, norm, studyId);
    if (!canView) {
      return { url: null, error: 'You do not have permission to download this attachment.' };
    }

    const { data: signed, error: urlErr } = await supabase.storage
      .from('visit-report-attachments')
      .createSignedUrl((att as { storage_path: string }).storage_path, 3600);
    if (urlErr) return { url: null, error: urlErr.message };
    return { url: signed?.signedUrl ?? null, error: null };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Failed to get download URL' };
  }
}

/**
 * Antivirus scanning is disabled. This function is a no-op and returns
 * immediately. Kept to avoid breaking any existing callers.
 */
export async function retryPendingAttachmentScans(
  _staleMinutes = 5,
  _maxBatch = 100,
): Promise<{ enqueued: number; error: string | null }> {
  return { enqueued: 0, error: null };
}

// =====================================================
// Document Availability Checklist
// =====================================================

export type DocAvailabilityKey =
  | 'monitoring_visit_log_available'
  | 'visit_confirmation_letter_available'
  | 'visit_followup_letter_available';

export type DocReasonKey =
  | 'monitoring_visit_log_unavailable_reason'
  | 'visit_confirmation_letter_unavailable_reason'
  | 'visit_followup_letter_unavailable_reason';

const DOC_AVAILABILITY_KEYS: DocAvailabilityKey[] = [
  'monitoring_visit_log_available',
  'visit_confirmation_letter_available',
  'visit_followup_letter_available',
];

const DOC_KEY_TO_REASON_KEY: Record<DocAvailabilityKey, DocReasonKey> = {
  monitoring_visit_log_available: 'monitoring_visit_log_unavailable_reason',
  visit_confirmation_letter_available: 'visit_confirmation_letter_unavailable_reason',
  visit_followup_letter_available: 'visit_followup_letter_unavailable_reason',
};

const DOC_KEY_TO_CATEGORY: Record<DocAvailabilityKey, string> = {
  monitoring_visit_log_available: 'Monitoring Visit Log',
  visit_confirmation_letter_available: 'Visit Confirmation Letter',
  visit_followup_letter_available: 'Visit Follow-up Letter',
};

/** Reverse lookup used by upload/delete to flip the matching availability column. */
const CATEGORY_TO_DOC_KEYS: Record<string, { availabilityKey: DocAvailabilityKey; reasonKey: DocReasonKey }> = {
  'Monitoring Visit Log': {
    availabilityKey: 'monitoring_visit_log_available',
    reasonKey: 'monitoring_visit_log_unavailable_reason',
  },
  'Visit Confirmation Letter': {
    availabilityKey: 'visit_confirmation_letter_available',
    reasonKey: 'visit_confirmation_letter_unavailable_reason',
  },
  'Visit Follow-up Letter': {
    availabilityKey: 'visit_followup_letter_available',
    reasonKey: 'visit_followup_letter_unavailable_reason',
  },
};

export async function setReportDocumentAvailability(
  reportId: string,
  key: DocAvailabilityKey,
  value: 'yes' | 'no' | null,
  reason?: string | null,
): Promise<{ error: string | null }> {
  if (!DOC_AVAILABILITY_KEYS.includes(key)) {
    return { error: 'Invalid document availability key.' };
  }
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };
    const reasonKey = DOC_KEY_TO_REASON_KEY[key];
    // 'yes' and null clear any prior reason; 'no' writes the provided reason
    // (or null if not supplied).
    const reasonValue = value === 'no' ? (reason?.trim() || null) : null;
    const { error } = await supabase
      .from('trip_reports')
      .update({ [key]: value, [reasonKey]: reasonValue })
      .eq('id', reportId);
    if (error) return { error: error.message };
    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Atomically transitions a document question to "Not available":
 * 1) deletes any attachments in that question's category (storage + row),
 * 2) writes `*_available = 'no'` and `*_unavailable_reason = reason`.
 *
 * Used for both Pending -> Unavailable and Uploaded -> Unavailable so the
 * client only needs one round-trip.
 */
export async function markDocumentNotAvailable(
  reportId: string,
  key: DocAvailabilityKey,
  reason: string,
): Promise<{ error: string | null }> {
  if (!DOC_AVAILABILITY_KEYS.includes(key)) {
    return { error: 'Invalid document availability key.' };
  }
  const trimmedReason = reason.trim();
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const permErr = await assertAuthorCanEditReport(supabase, profileId, reportId);
    if (permErr) return { error: permErr };

    const category = DOC_KEY_TO_CATEGORY[key];
    const reasonKey = DOC_KEY_TO_REASON_KEY[key];

    const { data: existing } = await supabase
      .from('visit_report_attachments')
      .select('id, storage_path')
      .eq('trip_report_id', reportId)
      .eq('category', category);

    const rows = (existing ?? []) as { id: string; storage_path: string }[];
    if (rows.length > 0) {
      const paths = rows.map((r) => r.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('visit-report-attachments').remove(paths);
      }
      const ids = rows.map((r) => r.id);
      const { error: delErr } = await supabase
        .from('visit_report_attachments')
        .delete()
        .in('id', ids);
      if (delErr) return { error: delErr.message };
    }

    const { error: updErr } = await supabase
      .from('trip_reports')
      .update({ [key]: 'no', [reasonKey]: trimmedReason || null })
      .eq('id', reportId);
    if (updErr) return { error: updErr.message };

    await revalidateAfterReportMutation(supabase, reportId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function bulkUploadTemplateQuestions(
  templateId: string,
  questions: BulkUploadQuestionInput[]
): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: existing } = await supabase
      .from('visit_report_template_questions')
      .select('sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    let sortOrder = (existing?.sort_order ?? -1) + 1;

    const rows = questions.map((q) => ({
      template_id: templateId,
      question_text: q.question_text,
      report_order: q.report_order ?? 0,
      report_section: q.report_section ?? null,
      report_sub_section: q.report_sub_section ?? null,
      sort_order: sortOrder++,
    }));

    const { error } = await supabase.from('visit_report_template_questions').insert(rows);
    if (error) return { count: 0, error: error.message };
    revalidateTripReportRelatedUi();
    return { count: rows.length, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
