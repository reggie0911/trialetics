/**
 * Server-side helpers for the trip-report 21 CFR Part 11 electronic
 * signature flow.
 *
 * - Canonical attestation strings (sent to the server verbatim and
 *   persisted on `trip_reports.*_attestation_text`).
 * - `normalizeName` / `namesMatch` for printed-name validation against
 *   the signer's profile.
 * - `assertPasswordReverified` for server-side password reverification
 *   (11.300 re-authentication).
 * - `computeReportContentHash` for SHA-256 record-signature linking
 *   (11.70 / 11.10(e)).
 *
 * Pure helpers (`normalizeName`, `namesMatch`) carry no Supabase
 * dependency so they remain trivially unit-testable. The async helpers
 * accept a Supabase client and use only the stable supabase-js API
 * surface so they can be exercised by the same in-memory mock used by
 * `lib/visit-report-permissions.test.ts`.
 *
 * @see docs/PART11_CONTROLS.md
 */

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Canonical attestation strings live in a node-import-free module so
// the client-side signature capture modal can render the same byte
// sequence the server validates. Re-exported here for convenience.
export {
  TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_AUTHOR_ATTESTATION,
  TRIP_REPORT_VOID_ATTESTATION,
} from '@/lib/visit-report-signature-attestations';

export interface SignatureManifestation {
  printedName: string;
  attestationText: string;
  password: string;
}

// =====================================================================
// Name validation
// =====================================================================

/** Lowercase, trim, collapse internal whitespace. */
export function normalizeName(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Case- and whitespace-insensitive comparison of a typed printed name
 * against the signer's profile (`first_name + ' ' + last_name`). Empty
 * profile names always reject so we never silently accept a blank
 * signature.
 */
export function namesMatch(
  typed: string | null | undefined,
  profile: { first_name: string | null | undefined; last_name: string | null | undefined }
): boolean {
  const expected = normalizeName(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`);
  if (!expected) return false;
  const actual = normalizeName(typed);
  if (!actual) return false;
  return actual === expected;
}

// =====================================================================
// Password re-authentication (11.300)
// =====================================================================

/**
 * Server-side password reverification. Returns `null` on success and a
 * generic, non-leaky error string on any failure (invalid password,
 * unknown account, SSO-only user, etc.).
 *
 * Uses the user-scoped `supabase` client so the call counts against the
 * signer's auth session, not service-role; the existing client-side
 * verification in `signature-capture-modal.tsx` is kept as a UX nicety
 * but is no longer the source of truth.
 */
export async function assertPasswordReverified(
  supabase: SupabaseClient,
  email: string | null | undefined,
  password: string | null | undefined
): Promise<string | null> {
  if (!email || !password) {
    return 'Password is required.';
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: String(email),
    password: String(password),
  });
  if (error) {
    // Intentionally generic to avoid information leak about which
    // accounts exist or whether they are SSO-only.
    return 'Incorrect password or this account cannot re-authenticate with a password.';
  }
  return null;
}

// =====================================================================
// Content hash (11.70 / 11.10(e))
// =====================================================================

/**
 * Stable, recursive ordering for the canonical content payload. Sorts
 * object keys alphabetically and serializes arrays as-is (callers are
 * responsible for sorting array entries by a stable key before passing
 * them in).
 */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

interface ReportRow {
  id: string;
  report_status: string | null;
  narrative: string | null;
  reviewer_comments_site_attendees: string | null;
  reviewer_comments_sponsor_attendees: string | null;
  reviewer_comments_monitored_crfs: string | null;
  reviewer_comments_narrative: string | null;
  reviewer_comments_open_actions: string | null;
  reviewer_comments_attachments: string | null;
  expected_send_date_confirmation_letter: string | null;
  expected_send_date_followup_letter: string | null;
  date_followup_letter_uploaded: string | null;
  date_mvl_log_uploaded: string | null;
  template_id: string | null;
  template_version_id: string | null;
}

/**
 * Compute a SHA-256 over a canonical serialization of the signed
 * payload for the given trip report. Re-rendering the report later and
 * re-running this helper must produce the same hash if and only if the
 * signed content has not changed; this is the technical control that
 * implements 21 CFR 11.70 (signature/record linking) for trip reports.
 *
 * Inputs:
 * - report row (narrative, reviewer section comments, post-visit dates,
 *   template references)
 * - question responses (sorted by question id)
 * - site/sponsor attendees (sorted by sort_order, then id)
 * - monitored CRF entries (sorted by sort_order, then id)
 * - action items (sorted by sort_order, then id)
 * - attachments (sorted by id; storage_path included so attachment
 *   replacement is detectable even if file_name is reused)
 *
 * Excluded: row created_at / updated_at (intentionally — those move
 * with reads), reviewer/approver identities (those are tracked by the
 * separate audit row), signature columns themselves (the hash IS the
 * thing being signed).
 */
export async function computeReportContentHash(
  supabase: SupabaseClient,
  reportId: string
): Promise<{ hash: string | null; error: string | null }> {
  if (!reportId) return { hash: null, error: 'Missing trip report id.' };

  const { data: reportRaw, error: reportErr } = await supabase
    .from('trip_reports')
    .select(
      [
        'id',
        'report_status',
        'narrative',
        'reviewer_comments_site_attendees',
        'reviewer_comments_sponsor_attendees',
        'reviewer_comments_monitored_crfs',
        'reviewer_comments_narrative',
        'reviewer_comments_open_actions',
        'reviewer_comments_attachments',
        'expected_send_date_confirmation_letter',
        'expected_send_date_followup_letter',
        'date_followup_letter_uploaded',
        'date_mvl_log_uploaded',
        'template_id',
        'template_version_id',
      ].join(', ')
    )
    .eq('id', reportId)
    .maybeSingle();
  if (reportErr) return { hash: null, error: reportErr.message };
  const report = reportRaw as ReportRow | null;
  if (!report) return { hash: null, error: 'Trip report not found.' };

  const [responsesRes, attendeesRes, crfRes, actionsRes, attachmentsRes] = await Promise.all([
    supabase
      .from('trip_report_question_responses')
      .select('template_question_id, template_question_version_id, response, comments, sort_order')
      .eq('trip_report_id', reportId),
    supabase
      .from('trip_report_attendees')
      .select('id, first_name, last_name, role, attendee_type, sort_order')
      .eq('trip_report_id', reportId),
    supabase
      .from('trip_report_crf_entries')
      .select('id, subject_number, crf_name, sdv_status, sort_order')
      .eq('trip_report_id', reportId),
    supabase
      .from('trip_report_action_items')
      .select('id, description, owner, due_date, resolution_date, status, sort_order')
      .eq('trip_report_id', reportId),
    supabase
      .from('visit_report_attachments')
      .select('id, file_name, storage_path, file_size, mime_type, category')
      .eq('trip_report_id', reportId),
  ]);

  const firstErr =
    responsesRes.error ||
    attendeesRes.error ||
    crfRes.error ||
    actionsRes.error ||
    attachmentsRes.error;
  if (firstErr) return { hash: null, error: firstErr.message };

  type Resp = {
    template_question_id: string | null;
    template_question_version_id: string | null;
    response: string | null;
    comments: string | null;
    sort_order: number | null;
  };
  type Att = {
    id: string;
    first_name: string;
    last_name: string;
    role: string | null;
    attendee_type: string;
    sort_order: number | null;
  };
  type Crf = {
    id: string;
    subject_number: string | null;
    crf_name: string | null;
    sdv_status: string | null;
    sort_order: number | null;
  };
  type Action = {
    id: string;
    description: string;
    owner: string | null;
    due_date: string | null;
    resolution_date: string | null;
    status: string;
    sort_order: number | null;
  };
  type Attachment = {
    id: string;
    file_name: string;
    storage_path: string;
    file_size: number | null;
    mime_type: string | null;
    category: string | null;
  };

  const responses = ((responsesRes.data as Resp[] | null) ?? [])
    .map((r) => ({
      // Snapshot reports use template_question_version_id; legacy
      // reports use template_question_id. Use whichever is set as the
      // hash key (collisions are impossible because the per-report
      // partial unique indexes guarantee at most one row per question).
      question_key: r.template_question_version_id ?? r.template_question_id ?? '',
      response: r.response ?? null,
      comments: r.comments ?? null,
    }))
    .sort((a, b) => a.question_key.localeCompare(b.question_key));

  const cmpSortThenId = <T extends { sort_order: number | null; id: string }>(a: T, b: T) => {
    const sa = a.sort_order ?? 0;
    const sb = b.sort_order ?? 0;
    if (sa !== sb) return sa - sb;
    return a.id.localeCompare(b.id);
  };

  const attendees = ((attendeesRes.data as Att[] | null) ?? [])
    .slice()
    .sort(cmpSortThenId)
    .map(({ id: _id, ...rest }) => {
      void _id;
      return rest;
    });
  const crfs = ((crfRes.data as Crf[] | null) ?? [])
    .slice()
    .sort(cmpSortThenId)
    .map(({ id: _id, ...rest }) => {
      void _id;
      return rest;
    });
  const actions = ((actionsRes.data as Action[] | null) ?? [])
    .slice()
    .sort(cmpSortThenId)
    .map(({ id: _id, ...rest }) => {
      void _id;
      return rest;
    });
  const attachments = ((attachmentsRes.data as Attachment[] | null) ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id: _id, ...rest }) => {
      void _id;
      return rest;
    });

  const payload = {
    schema_version: 1 as const,
    report_id: report.id,
    template_id: report.template_id,
    template_version_id: report.template_version_id,
    narrative: report.narrative,
    reviewer_section_comments: {
      site_attendees: report.reviewer_comments_site_attendees,
      sponsor_attendees: report.reviewer_comments_sponsor_attendees,
      monitored_crfs: report.reviewer_comments_monitored_crfs,
      narrative: report.reviewer_comments_narrative,
      open_actions: report.reviewer_comments_open_actions,
      attachments: report.reviewer_comments_attachments,
    },
    post_visit_dates: {
      expected_send_date_confirmation_letter: report.expected_send_date_confirmation_letter,
      expected_send_date_followup_letter: report.expected_send_date_followup_letter,
      date_followup_letter_uploaded: report.date_followup_letter_uploaded,
      date_mvl_log_uploaded: report.date_mvl_log_uploaded,
    },
    responses,
    attendees,
    crf_entries: crfs,
    action_items: actions,
    attachments,
  };

  const json = JSON.stringify(canonicalize(payload));
  return { hash: sha256Hex(json), error: null };
}
