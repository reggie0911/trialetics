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
import { logTripReportStatusEvent } from '@/lib/trip-report-audit';
import {
  notifyReportApproved,
  notifyReportReturnedToAuthor,
  notifyReportSubmitted,
  notifyReviewerAssigned,
} from '@/lib/trip-report-notifications';
import { getCompanyLogoUrl } from '@/lib/actions/company';
import { buildVisitReportPdfData } from '@/lib/utils/build-visit-report-pdf-data';
import type { VisitReportPdfData } from '@/components/ctms/trip-reports/visit-report-pdf-document';

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
  visit_type: string;
  planned_date?: string | null;
  actual_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  visit_name?: string | null;
  study_sites?: { name: string; study_countries?: { country_name: string } | null } | null;
  studies?: { title: string; protocol_number?: string | null } | null;
};

type ReportRow = {
  id: string;
  report_status?: string;
  status?: string;
  created_by?: string | null;
  reviewer_id?: string | null;
};

export interface TrackerComplianceMetrics {
  submissionCompleted: number;
  submissionOverdue: number;
  submissionTotal: number;
  submissionPercent: number;
  approvalCompleted: number;
  approvalOverdue: number;
  approvalTotal: number;
  approvalPercent: number;
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

export async function getTripReportSummaryList(): Promise<TripReportSummaryRow[]> {
  const supabase = await createClient();
  let currentProfileId: string | null = null;
  try {
    currentProfileId = await getProfileId();
  } catch {
    currentProfileId = null;
  }

  const { data: visits, error } = await supabase
    .from('monitoring_visits')
    .select(`
      id,
      study_id,
      visit_type,
      planned_date,
      study_sites (
        name,
        study_countries ( country_name )
      ),
      studies ( title, protocol_number )
    `)
    .order('planned_date', { ascending: false, nullsFirst: true });

  if (error) throw new Error(error.message);

  const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
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

    let isCra = false;
    let isCpm = false;
    if (currentProfileId && studyId) {
      const flags = await getUserIsStudyCraAndCpm(supabase, currentProfileId, studyId);
      isCra = flags.isCra;
      isCpm = flags.isCpm;
    }

    const can_edit_report =
      isCra && !!report && ['report_pending', 'authoring', 'returned'].includes(status);
    const can_review_report = isCpm && !!report && ['submitted', 'under_review'].includes(status);
    const can_view_report =
      !!report &&
      (await canViewTripReportContent(supabase, currentProfileId, status, studyId));

    rows.push({
      id: v.id,
      visit_id: v.id,
      study_id: studyId ?? '',
      site_name: site?.name ?? '—',
      visit_name: vr.visit_name ?? `${vr.studies?.title ?? 'Visit'} – ${v.id.slice(0, 8)}`,
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

  return rows;
}

export async function getTripReportTrackerList(): Promise<{
  rows: TripReportTrackerRow[];
  metrics: TrackerComplianceMetrics;
}> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  let currentProfileId: string | null = null;
  try {
    currentProfileId = await getProfileId();
  } catch {
    currentProfileId = null;
  }

  const { data: visits, error } = await supabase
    .from('monitoring_visits')
    .select(`
      id,
      study_id,
      visit_type,
      planned_date,
      actual_date,
      start_date,
      end_date,
      study_sites ( name ),
      studies ( title )
    `)
    .order('planned_date', { ascending: false, nullsFirst: true });

  if (error) return { rows: [], metrics: { submissionCompleted: 0, submissionOverdue: 0, submissionTotal: 0, submissionPercent: 0, approvalCompleted: 0, approvalOverdue: 0, approvalTotal: 0, approvalPercent: 0 } };

  const visitIds = (visits ?? []).map((v: { id: string }) => v.id);
  let reportByVisit = new Map<string, Record<string, unknown>>();
  if (visitIds.length > 0) {
    const { data: reportRows } = await admin
      .from('trip_reports')
      .select(
        'id, visit_id, status, report_status, template_id, submitted_date, approved_date, reviewed_at, created_by, approved_by, reviewer_id, submission_due_date, approval_due_date, created_at'
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
    let isCra = false;
    let isCpm = false;
    if (currentProfileId && studyId) {
      const flags = await getUserIsStudyCraAndCpm(supabase, currentProfileId, studyId);
      isCra = flags.isCra;
      isCpm = flags.isCpm;
    }
    const can_edit_report =
      isCra && !!report && ['report_pending', 'authoring', 'returned'].includes(status);
    const can_review_report = isCpm && !!report && ['submitted', 'under_review'].includes(status);
    const can_view_report =
      !!report &&
      (await canViewTripReportContent(supabase, currentProfileId, status, studyId));
    const submission_overdue = !!(expectedSub && !submitted && daysSub !== null && daysSub < 0);
    const approval_overdue = !!(expectedApp && !approved && daysApp !== null && daysApp < 0);

    rows.push({
      visit_id: v.id,
      study_id: studyId ?? '',
      study_name: vr.studies?.title ?? '—',
      site_name: vr.study_sites?.name ?? '—',
      visit_type: v.visit_type,
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
      expected_send_date_confirmation_letter: null,
      expected_send_date_followup_letter: null,
      date_followup_letter_uploaded: null,
      date_mvl_log_uploaded: null,
    });
  }

  const submissionTotal = rows.filter((r) => r.days_until_submission_due !== null).length || 1;
  const approvalTotal = rows.filter((r) => r.days_until_approval_due !== null).length || 1;

  const metrics: TrackerComplianceMetrics = {
    submissionCompleted,
    submissionOverdue,
    submissionTotal,
    submissionPercent: submissionTotal ? Math.round((submissionCompleted / submissionTotal) * 100) : 100,
    approvalCompleted,
    approvalOverdue,
    approvalTotal,
    approvalPercent: approvalTotal ? Math.round((approvalCompleted / approvalTotal) * 100) : 100,
  };

  return { rows, metrics };
}

export async function getTripReportReviewQueue(): Promise<TripReportReviewQueueRow[]> {
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
  const studyIds = [...new Set((cpmStudies ?? []).map((r: { study_id: string }) => r.study_id))];
  if (studyIds.length === 0) return [];

  const { data: visits } = await supabase
    .from('monitoring_visits')
    .select('id, study_id, visit_type, study_sites(name), studies(title)')
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
      study_name: vr.studies?.title ?? '—',
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
  study_name?: string | null;
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

  const studyIds = [...new Set((templates as Record<string, unknown>[]).map((t) => t.study_id).filter(Boolean) as string[])];
  const studyNameById: Record<string, string> = {};
  if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from('studies')
      .select('id, title, protocol_number')
      .in('id', studyIds);
    (studies ?? []).forEach((s: { id: string; title: string; protocol_number?: string | null }) => {
      studyNameById[s.id] = s.protocol_number ? `${s.title} (${s.protocol_number})` : s.title;
    });
  }

  return (templates as unknown as VisitReportTemplate[]).map((t) => {
    const raw = t as unknown as Record<string, unknown>;
    const studyId = (raw.study_id as string | null | undefined) ?? null;
    return {
      ...t,
      question_count: countByTemplate[t.id] ?? 0,
      report_count: reportCountByTemplate[t.id] ?? 0,
      study_name: studyId ? (studyNameById[studyId] ?? null) : null,
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
  visit_type: 'sqv' | 'siv' | 'monitoring' | 'close_out';
  visit_location: 'onsite' | 'remote';
  visit_name?: string;
  description?: string;
  start_date: string;
  end_date: string;
  template_id?: string | null;
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

    const { data: visit, error: visitError } = await supabase
      .from('monitoring_visits')
      .insert({
        study_id: input.study_id,
        site_id: input.site_id,
        visit_type: input.visit_type,
        visit_name: input.visit_name ?? null,
        visit_location: input.visit_location,
        start_date: input.start_date,
        end_date: input.end_date,
        description: input.description ?? null,
        planned_date: input.start_date,
        status: 'planned',
      })
      .select('id')
      .single();

    if (visitError || !visit) return { visitId: null, error: visitError?.message ?? 'Failed to create visit' };

    const { error: reportError } = await supabase.from('trip_reports').insert({
      visit_id: visit.id,
      created_by: profileId,
      report_status: 'report_pending',
      template_id: input.template_id ?? null,
      submission_due_date: submissionDue,
      approval_due_date: approvalDue,
    });

    if (reportError) return { visitId: null, error: reportError.message };

    revalidatePath('/protected/trip-reports');
    revalidatePath('/protected/visits');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    .select('*, study_sites(name, site_number, address, city, state, postal_code, pi_name, pi_email, study_countries(country_name)), studies(id, title, protocol_number)')
    .eq('id', visitId)
    .single();
  if (ve || !visit) return null;

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

  let template: VisitReportTemplate | null = null;
  let questions: VisitReportTemplateQuestion[] = [];
  if (report.template_id) {
    const { data: t, error: te } = await supabase.from('visit_report_templates').select('*').eq('id', report.template_id).single();
    template = t as VisitReportTemplate | null;
    if (template) {
      const { data: q, error: qe } = await supabase
        .from('visit_report_template_questions')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order', { ascending: true });
      questions = (q as VisitReportTemplateQuestion[]) ?? [];
      // TODO: Remove after investigation - temporary diagnostic logging for missing questions
      if (process.env.NODE_ENV === 'development') {
        console.info('[TripReportDebug] getTripReportWithDetails', {
          visitId,
          reportId: report.id,
          templateId: report.template_id,
          templateFound: !!template,
          templateFetchError: te?.message ?? null,
          questionsCount: questions.length,
          questionsFetchError: qe?.message ?? null,
        });
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.info('[TripReportDebug] getTripReportWithDetails - template not found', {
        visitId,
        reportId: report.id,
        templateId: report.template_id,
        templateFetchError: te?.message ?? null,
      });
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.info('[TripReportDebug] getTripReportWithDetails - no template_id on report', {
      visitId,
      reportId: report.id,
      templateId: report.template_id,
    });
  }

  const { data: resRows } = await supabase
    .from('trip_report_question_responses')
    .select('template_question_id, response, comments, reviewer_comments')
    .eq('trip_report_id', report.id);
  const responses: Record<string, { response: string | null; comments: string | null; reviewer_comments: string | null }> = {};
  (resRows ?? []).forEach((r: {
    template_question_id: string;
    response: string | null;
    comments: string | null;
    reviewer_comments: string | null;
  }) => {
    responses[r.template_question_id] = {
      response: r.response ?? null,
      comments: r.comments ?? null,
      reviewer_comments: r.reviewer_comments ?? null,
    };
  });

  let attendees: TripReportAttendee[] = [];
  let crfEntries: TripReportCrfEntry[] = [];
  let actionItems: TripReportActionItem[] = [];
  let attachments: TripReportAttachment[] = [];
  try {
    const [attRes, crfRes, actRes] = await Promise.all([
      supabase.from('trip_report_attendees').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_crf_entries').select('*').eq('trip_report_id', report.id).order('sort_order'),
      supabase.from('trip_report_action_items').select('*').eq('trip_report_id', report.id).order('sort_order'),
    ]);
    attendees = (attRes.data ?? []) as TripReportAttendee[];
    crfEntries = (crfRes.data ?? []) as TripReportCrfEntry[];
    actionItems = (actRes.data ?? []) as TripReportActionItem[];
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
  });
  return { data };
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
      const { error: upsertErr } = await supabase.from('trip_report_question_responses').upsert(
        {
          trip_report_id: reportId,
          template_question_id: r.template_question_id,
          response: r.response,
          comments: r.comments,
          reviewer_comments: r.reviewer_comments,
          sort_order: 0,
        },
        { onConflict: 'trip_report_id,template_question_id' }
      );
      if (upsertErr) return { error: upsertErr.message };
    }
    revalidatePath('/protected/trip-reports');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function submitReport(
  reportId: string,
  options: { signatureData: string; signedAt: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const sig = options?.signatureData?.trim() ?? '';
    const signedAt = options?.signedAt?.trim() ?? '';
    if (!sig || !signedAt) {
      return { error: 'Electronic signature is required to submit the report.' };
    }

    const profileId = await getProfileId();
    const roleErr = await assertReportAuthorPermission(supabase, profileId, reportId);
    if (roleErr) return { error: roleErr };

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
    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'submitted',
        submitted_date: new Date().toISOString().split('T')[0],
        author_submission_signature_data: sig,
        author_submission_signed_at: signedAt,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
      const { error: upsertErr } = await supabase.from('trip_report_question_responses').upsert(
        {
          trip_report_id: reportId,
          template_question_id: row.template_question_id,
          response: row.response,
          comments: row.comments,
          reviewer_comments: row.reviewer_comments,
          sort_order: 0,
        },
        { onConflict: 'trip_report_id,template_question_id' }
      );
      if (upsertErr) return { error: upsertErr.message };
    }
    const { error: reportUpErr } = await supabase.from('trip_reports').update(sectionComments).eq('id', reportId);
    if (reportUpErr) return { error: reportUpErr.message };
    revalidatePath('/protected/trip-reports');
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
        await supabase
          .from('trip_report_question_responses')
          .upsert(
            {
              trip_report_id: reportId,
              template_question_id: res.template_question_id,
              reviewer_comments: res.reviewer_comments,
              sort_order: 0,
            },
            { onConflict: 'trip_report_id,template_question_id' }
          );
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
    if (r.created_by && r.visit_id) {
      await notifyReportReturnedToAuthor({ authorProfileId: r.created_by, visitId: r.visit_id });
    }
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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

    const { error } = await supabase
      .from('trip_reports')
      .update({
        report_status: 'returned',
        approved_by: null,
        approved_date: null,
        approval_signature_data: null,
        approval_signed_at: null,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
    await logTripReportStatusEvent({
      tripReportId: reportId,
      fromStatus: 'approved_and_signed',
      toStatus: 'returned',
      actorProfileId: profileId,
      metadata: { void_approval: true, reason: trimmedReason },
    });
    revalidatePath('/protected/trip-reports');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function approveReport(
  reportId: string,
  options?: { signatureData?: string; signedAt?: string }
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
      reviewer_id?: string | null;
      created_by?: string;
      visit_id?: string;
    } | null;
    if (!r || r.report_status !== 'under_review') {
      return { error: 'Report must be under review to approve' };
    }
    const profileId = await getProfileId();
    const revErr = await assertReportReviewerPermission(supabase, profileId, reportId, r.reviewer_id);
    if (revErr) return { error: revErr };
    const payload: Record<string, unknown> = {
      report_status: 'approved_and_signed',
      approved_by: profileId,
      approved_date: new Date().toISOString().split('T')[0],
    };
    if (r.reviewer_id == null) {
      payload.reviewer_id = profileId;
      payload.reviewed_at = new Date().toISOString();
    }
    if (options?.signatureData != null) {
      payload.approval_signature_data = options.signatureData;
      payload.approval_signed_at = options.signedAt ?? new Date().toISOString();
    }
    const { error } = await supabase
      .from('trip_reports')
      .update(payload)
      .eq('id', reportId);
    if (error) return { error: error.message };
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
    revalidatePath('/protected/trip-reports');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
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
      await notifyReviewerAssigned({ reviewerProfileId, visitId });
    }
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
        submission_due_date: submissionDue,
        approval_due_date: approvalDue,
      })
      .eq('id', reportId);
    if (error) return { error: error.message };
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
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
    revalidatePath('/protected/trip-reports');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function addCrfEntry(
  reportId: string,
  input: { subject_number?: string | null; crf_name?: string | null; sdv_status?: string | null }
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
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/trip-reports');
    return { data: data as TripReportCrfEntry, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
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
    revalidatePath('/protected/trip-reports');
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
        description: input.description,
        owner: input.owner ?? null,
        due_date: input.due_date ?? null,
        status: 'open',
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/trip-reports');
    return { data: data as TripReportActionItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateActionItem(
  itemId: string,
  input: { status?: 'open' | 'closed'; resolution_date?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
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
    if (input.status !== undefined) payload.status = input.status;
    if (input.resolution_date !== undefined) payload.resolution_date = input.resolution_date;
    if (Object.keys(payload).length === 0) return { error: null };
    const { error } = await supabase.from('trip_report_action_items').update(payload).eq('id', itemId);
    if (error) return { error: error.message };
    revalidatePath('/protected/trip-reports');
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

    const storagePath = `${reportId}/${crypto.randomUUID()}-${encodeURIComponent(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('visit-report-attachments')
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) return { data: null, error: uploadError.message };

    const allowedCategory = category && ['logs', 'screenshots', 'correspondence', 'regulatory', 'other'].includes(category) ? category : null;
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
      })
      .select()
      .single();

    if (insertErr) return { data: null, error: insertErr.message };
    revalidatePath('/protected/trip-reports');
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
      .select('id, storage_path, trip_report_id')
      .eq('id', attachmentId)
      .single();
    if (fetchErr || !att) return { error: fetchErr?.message ?? 'Attachment not found' };
    const permErr = await assertAuthorCanEditReport(supabase, profileId, (att as { trip_report_id: string }).trip_report_id);
    if (permErr) return { error: permErr };

    await supabase.storage.from('visit-report-attachments').remove([(att as { storage_path: string }).storage_path]);
    const { error: delErr } = await supabase.from('visit_report_attachments').delete().eq('id', attachmentId);
    if (delErr) return { error: delErr.message };
    revalidatePath('/protected/trip-reports');
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
      .select('id, storage_path, trip_report_id')
      .eq('id', attachmentId)
      .maybeSingle();
    if (fetchErr || !att) return { url: null, error: fetchErr?.message ?? 'Attachment not found' };

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
    revalidatePath('/protected/trip-reports');
    return { count: rows.length, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
