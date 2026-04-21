import 'server-only';

import { sendEmail } from '@/lib/email';
import { ReportApproved } from '@/emails/report-approved';
import { ReportReturned } from '@/emails/report-returned';
import { ReportSubmitted } from '@/emails/report-submitted';
import { ReviewerAssigned } from '@/emails/reviewer-assigned';
import { createAdminClient } from '@/lib/server-admin';
import {
  REPORT_REVIEWER_ROLE,
} from '@/lib/visit-report-permissions';
import {
  VISIT_TYPE_LABEL,
  type MonitoringVisitType,
} from '@/lib/types/ctms';

function tripReportLink(visitId: string, studyId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const root = base.replace(/\/$/, '');
  return `${root}/protected/studies/${studyId}/trip-reports/${visitId}/author`;
}

interface ReportEmailContext {
  studyId: string;
  studyLabel: string;
  siteLabel: string;
  visitTypeLabel: string;
  visitDate: string | null;
  authorName: string | null;
  /** Optional study-specific shared mailbox; falls back to EMAIL_REPLY_TO_DEFAULT in sendEmail. */
  studyMailbox: string | null;
  reportUrl: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatVisitDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // value is a DATE column; build a Date in UTC at midnight to avoid TZ drift.
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return dateFormatter.format(d);
}

function buildVisitTypeLabel(rawType: string | null | undefined): string {
  if (!rawType) return 'Monitoring visit';
  const mapped = VISIT_TYPE_LABEL[rawType as MonitoringVisitType];
  return mapped ?? rawType;
}

function buildSiteLabel(
  siteNumber: string | null | undefined,
  siteName: string | null | undefined,
): string {
  const num = siteNumber?.trim();
  const name = siteName?.trim();
  if (num && name) return `Site ${num} - ${name}`;
  return num ? `Site ${num}` : (name ?? 'Site');
}

function buildStudyLabel(
  studyName: string | null | undefined,
  protocolNumber: string | null | undefined,
): string {
  return (studyName?.trim() || protocolNumber?.trim() || 'Study').toString();
}

/**
 * Loads the shared "what is this email about?" context for a trip-report
 * notification in a single round trip per call. Returns null when the visit
 * cannot be resolved (deleted / cross-tenant) so the caller can no-op.
 */
async function loadReportEmailContext(
  visitId: string,
  studyIdHint?: string | null,
): Promise<ReportEmailContext | null> {
  const admin = createAdminClient();
  const { data: visit } = await admin
    .from('monitoring_visits')
    .select(
      'study_id, visit_type, planned_date, actual_date, study_sites(site_number, name), studies(study_name, protocol_number)',
    )
    .eq('id', visitId)
    .maybeSingle();

  type VisitRow = {
    study_id: string;
    visit_type: string | null;
    planned_date: string | null;
    actual_date: string | null;
    study_sites: { site_number: string | null; name: string | null } | null;
    studies: { study_name: string | null; protocol_number: string | null } | null;
  };

  const v = visit as VisitRow | null;
  const studyId = v?.study_id ?? studyIdHint ?? null;
  if (!studyId) return null;

  return {
    studyId,
    studyLabel: buildStudyLabel(v?.studies?.study_name, v?.studies?.protocol_number),
    siteLabel: buildSiteLabel(v?.study_sites?.site_number, v?.study_sites?.name),
    visitTypeLabel: buildVisitTypeLabel(v?.visit_type),
    visitDate: formatVisitDate(v?.actual_date ?? v?.planned_date),
    authorName: null,
    studyMailbox: null,
    reportUrl: tripReportLink(visitId, studyId),
  };
}

async function profileNameAndEmail(
  profileId: string | null | undefined,
): Promise<{ name: string | null; email: string | null }> {
  if (!profileId) return { name: null, email: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', profileId)
    .maybeSingle();
  const row = data as
    | { first_name?: string | null; last_name?: string | null; email?: string | null }
    | null;
  if (!row) return { name: null, email: null };
  const first = row.first_name?.trim() ?? '';
  const last = row.last_name?.trim() ?? '';
  const fullName = [first, last].filter(Boolean).join(' ');
  return {
    name: fullName || row.email?.trim() || null,
    email: row.email?.trim() ?? null,
  };
}

async function profileEmailsForStudyRoles(
  studyId: string,
  roles: string[],
): Promise<string[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('study_team_members')
    .select('profile_id')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .in('role', roles);
  const ids = [...new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))];
  if (ids.length === 0) return [];
  const { data: profiles } = await admin
    .from('profiles')
    .select('email')
    .in('id', ids);
  return (
    ((profiles ?? []) as { email: string | null }[])
      .map((p) => p.email)
      .filter((e): e is string => Boolean(e))
  );
}

async function profileEmail(profileId: string): Promise<string | null> {
  const { email } = await profileNameAndEmail(profileId);
  return email;
}

function truncate(input: string | null | undefined, max = 240): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}\u2026`;
}

/** After CRA submits: notify CPMs on study (and assigned reviewer if set). */
export async function notifyReportSubmitted(params: {
  studyId: string;
  visitId: string;
  reviewerId?: string | null;
  authorProfileId?: string | null;
}): Promise<void> {
  const { studyId, visitId, reviewerId, authorProfileId } = params;
  const ctx = await loadReportEmailContext(visitId, studyId);
  if (!ctx) return;

  const cpmEmails = await profileEmailsForStudyRoles(studyId, [REPORT_REVIEWER_ROLE]);
  const reviewerEmail = reviewerId ? await profileEmail(reviewerId) : null;
  const authorMeta = await profileNameAndEmail(authorProfileId);

  const primary = reviewerEmail ? [reviewerEmail] : cpmEmails;
  const bcc = reviewerEmail
    ? cpmEmails.filter((e) => e !== reviewerEmail)
    : [];

  if (primary.length === 0) return;

  await sendEmail({
    to: primary,
    bcc,
    category: 'report-submitted',
    idempotencyKey: `${visitId}:report-submitted`,
    subject: `Trip report submitted - ${ctx.studyLabel} / ${ctx.siteLabel}`,
    template: (
      <ReportSubmitted
        studyLabel={ctx.studyLabel}
        siteLabel={ctx.siteLabel}
        visitTypeLabel={ctx.visitTypeLabel}
        visitDate={ctx.visitDate}
        authorName={authorMeta.name}
        reportUrl={ctx.reportUrl}
      />
    ),
  });
}

export async function notifyReportReturnedToAuthor(params: {
  authorProfileId: string;
  visitId: string;
  studyId: string;
  returnedByProfileId?: string | null;
  reviewerComment?: string | null;
}): Promise<void> {
  const ctx = await loadReportEmailContext(params.visitId, params.studyId);
  if (!ctx) return;
  const author = await profileNameAndEmail(params.authorProfileId);
  if (!author.email) return;
  const returnedBy = params.returnedByProfileId
    ? await profileNameAndEmail(params.returnedByProfileId)
    : { name: null, email: null };

  await sendEmail({
    to: [author.email],
    category: 'report-returned',
    idempotencyKey: `${params.visitId}:report-returned`,
    subject: `Trip report returned - ${ctx.studyLabel} / ${ctx.siteLabel}`,
    template: (
      <ReportReturned
        studyLabel={ctx.studyLabel}
        siteLabel={ctx.siteLabel}
        visitTypeLabel={ctx.visitTypeLabel}
        visitDate={ctx.visitDate}
        returnedByName={returnedBy.name}
        reviewerComment={truncate(params.reviewerComment)}
        reportUrl={ctx.reportUrl}
      />
    ),
  });
}

export async function notifyReportApproved(params: {
  studyId: string;
  authorProfileId: string;
  visitId: string;
}): Promise<void> {
  const ctx = await loadReportEmailContext(params.visitId, params.studyId);
  if (!ctx) return;
  const author = await profileNameAndEmail(params.authorProfileId);
  const cpmEmails = await profileEmailsForStudyRoles(params.studyId, [REPORT_REVIEWER_ROLE]);

  const primary = author.email ? [author.email] : cpmEmails;
  const bcc = author.email
    ? cpmEmails.filter((e) => e !== author.email)
    : [];
  if (primary.length === 0) return;

  await sendEmail({
    to: primary,
    bcc,
    category: 'report-approved',
    idempotencyKey: `${params.visitId}:report-approved`,
    subject: `Trip report approved - ${ctx.studyLabel} / ${ctx.siteLabel}`,
    template: (
      <ReportApproved
        studyLabel={ctx.studyLabel}
        siteLabel={ctx.siteLabel}
        visitTypeLabel={ctx.visitTypeLabel}
        visitDate={ctx.visitDate}
        authorName={author.name}
        approvedAt={dateFormatter.format(new Date())}
        reportUrl={ctx.reportUrl}
      />
    ),
  });
}

export async function notifyReviewerAssigned(params: {
  reviewerProfileId: string;
  visitId: string;
  studyId: string;
  authorProfileId?: string | null;
}): Promise<void> {
  const ctx = await loadReportEmailContext(params.visitId, params.studyId);
  if (!ctx) return;
  const reviewerEmail = await profileEmail(params.reviewerProfileId);
  if (!reviewerEmail) return;
  const author = await profileNameAndEmail(params.authorProfileId);

  await sendEmail({
    to: [reviewerEmail],
    category: 'reviewer-assigned',
    idempotencyKey: `${params.visitId}:reviewer-assigned:${params.reviewerProfileId}`,
    subject: `You were assigned as reviewer - ${ctx.studyLabel} / ${ctx.siteLabel}`,
    template: (
      <ReviewerAssigned
        studyLabel={ctx.studyLabel}
        siteLabel={ctx.siteLabel}
        visitTypeLabel={ctx.visitTypeLabel}
        visitDate={ctx.visitDate}
        authorName={author.name}
        reportUrl={ctx.reportUrl}
      />
    ),
  });
}
