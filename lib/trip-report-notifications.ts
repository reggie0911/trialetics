import { createAdminClient } from '@/lib/server-admin';
import { resend } from '@/lib/email';
import {
  REPORT_AUTHOR_ROLE,
  REPORT_REVIEWER_ROLE,
} from '@/lib/visit-report-permissions';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tripReportLink(visitId: string, studyId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const root = base.replace(/\/$/, '');
  return `${root}/protected/studies/${studyId}/trip-reports/${visitId}/author`;
}

async function profileEmailsForStudyRoles(
  studyId: string,
  roles: string[]
): Promise<{ id: string; email: string | null }[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('study_team_members')
    .select('profile_id')
    .eq('study_id', studyId)
    .eq('is_active', true)
    .in('role', roles);
  const ids = [...new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))];
  if (ids.length === 0) return [];
  const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ids);
  return (profiles ?? []) as { id: string; email: string | null }[];
}

async function profileEmail(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('email').eq('id', profileId).maybeSingle();
  return (data as { email?: string | null } | null)?.email ?? null;
}

async function sendIfConfigured(to: string[], subject: string, html: string) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Trialetics <noreply@trialetics.io>';
  if (!resend || to.length === 0) return;
  const unique = [...new Set(to.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await resend.emails.send({ from: fromEmail, to: unique, subject, html });
  } catch (e) {
    console.error('trip report notification email failed:', e);
  }
}

/** After CRA submits: notify CPMs on study (and assigned reviewer if set). */
export async function notifyReportSubmitted(params: {
  studyId: string;
  visitId: string;
  reviewerId?: string | null;
}): Promise<void> {
  const { studyId, visitId, reviewerId } = params;
  const cpms = await profileEmailsForStudyRoles(studyId, [REPORT_REVIEWER_ROLE]);
  const emails = cpms.map((p) => p.email).filter(Boolean) as string[];
  if (reviewerId) {
    const rEmail = await profileEmail(reviewerId);
    if (rEmail) emails.push(rEmail);
  }
  const link = tripReportLink(visitId, studyId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>A trip report has been submitted for review.</p>
    <p><a href="${escapeHtml(link)}">Open report</a></p>
  </body></html>`;
  await sendIfConfigured(emails, 'Trip report submitted for review', html);
}

export async function notifyReportReturnedToAuthor(params: {
  authorProfileId: string;
  visitId: string;
  studyId: string;
}): Promise<void> {
  const email = await profileEmail(params.authorProfileId);
  const link = tripReportLink(params.visitId, params.studyId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>Your trip report was returned for corrections.</p>
    <p><a href="${escapeHtml(link)}">Open report</a></p>
  </body></html>`;
  await sendIfConfigured(email ? [email] : [], 'Trip report returned for corrections', html);
}

export async function notifyReportApproved(params: {
  studyId: string;
  authorProfileId: string;
  visitId: string;
}): Promise<void> {
  const authorEmail = await profileEmail(params.authorProfileId);
  const cpms = await profileEmailsForStudyRoles(params.studyId, [REPORT_REVIEWER_ROLE]);
  const emails = [
    ...(authorEmail ? [authorEmail] : []),
    ...cpms.map((p) => p.email).filter(Boolean),
  ] as string[];
  const link = tripReportLink(params.visitId, params.studyId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>A trip report has been approved and signed.</p>
    <p><a href="${escapeHtml(link)}">View report</a></p>
  </body></html>`;
  await sendIfConfigured(emails, 'Trip report approved', html);
}

export async function notifyReviewerAssigned(params: {
  reviewerProfileId: string;
  visitId: string;
  studyId: string;
}): Promise<void> {
  const email = await profileEmail(params.reviewerProfileId);
  const link = tripReportLink(params.visitId, params.studyId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <p>You have been assigned as reviewer for a trip report.</p>
    <p><a href="${escapeHtml(link)}">Open report</a></p>
  </body></html>`;
  await sendIfConfigured(email ? [email] : [], 'You were assigned as trip report reviewer', html);
}
