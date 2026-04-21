// =============================================
// Visit Report Module Types
// =============================================

export type VisitReportStatus =
  | 'report_pending'
  | 'authoring'
  | 'submitted'
  | 'under_review'
  | 'returned'
  | 'approved_and_signed';

export const VISIT_REPORT_STATUS_LABELS: Record<VisitReportStatus, string> = {
  report_pending: 'Report Pending',
  authoring: 'Authoring',
  submitted: 'Submitted',
  under_review: 'Under Review',
  returned: 'Returned',
  approved_and_signed: 'Approved and Signed',
};

/** Title-case words from snake_case (fallback for unknown status/action codes). */
function titleCaseFromSnake(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Human label for a visit report status in tables and audit trails. */
export function formatVisitReportStatusLabel(status: string | null | undefined): string {
  if (status == null || status === '') return '—';
  const mapped = VISIT_REPORT_STATUS_LABELS[status as VisitReportStatus];
  if (mapped) return mapped;
  return titleCaseFromSnake(status);
}

const TRIP_REPORT_AUDIT_ACTION_LABELS: Record<string, string> = {
  assign_reviewer: 'Assign reviewer',
};

const TRIP_REPORT_AUDIT_NOTE_MAX = 120;

/** Friendly labels for post-visit date fields in audit notes. */
const POST_VISIT_DATE_FIELD_LABELS: Record<string, string> = {
  expected_send_date_confirmation_letter: 'Expected Send Date: Confirmation Letter',
  expected_send_date_followup_letter: 'Expected Send Date: Follow-up Letter',
  date_followup_letter_uploaded: 'Date Follow-up Letter Uploaded',
  date_mvl_log_uploaded: 'Date Monitoring Visit Log Uploaded',
};

/** Render a YYYY-MM-DD value (or null) for an audit note. */
function formatAuditDateValue(raw: unknown): string {
  if (raw == null) return '—';
  const str = String(raw).trim();
  if (!str) return '—';
  return str.split('T')[0];
}

/** Note column text for `trip_report_status_events.metadata`. */
export function formatTripReportAuditEventNote(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || typeof metadata !== 'object') return '—';
  if ('void_approval' in metadata && metadata.void_approval) {
    const raw = metadata.reason;
    const reason = typeof raw === 'string' ? raw.trim() : '';
    if (!reason) return 'Void approval';
    const clipped =
      reason.length > TRIP_REPORT_AUDIT_NOTE_MAX ? `${reason.slice(0, TRIP_REPORT_AUDIT_NOTE_MAX)}…` : reason;
    return `Void approval — ${clipped}`;
  }
  if (metadata.event === 'post_visit_date_changed') {
    const fieldRaw = metadata.field;
    const field = typeof fieldRaw === 'string' ? fieldRaw : '';
    const fieldLabel = POST_VISIT_DATE_FIELD_LABELS[field] ?? titleCaseFromSnake(field || 'Post-visit date');
    const from = formatAuditDateValue(metadata.from);
    const to = formatAuditDateValue(metadata.to);
    return `${fieldLabel}: ${from} → ${to}`;
  }
  const action = metadata.action;
  if (typeof action === 'string' && action.trim() !== '') {
    return TRIP_REPORT_AUDIT_ACTION_LABELS[action] ?? titleCaseFromSnake(action);
  }
  return '—';
}

export type VisitReportType = 'sqv' | 'siv' | 'monitoring' | 'close_out' | 'training';

export const VISIT_REPORT_TYPE_LABELS: Record<VisitReportType, string> = {
  sqv: 'Site Qualification Visit',
  siv: 'Site Initiation Visit',
  monitoring: 'Interim Monitoring Visit',
  close_out: 'Close-Out Visit',
  training: 'Training Visit',
};

export type VisitLocation = 'onsite' | 'remote';

export const VISIT_LOCATION_LABELS: Record<VisitLocation, string> = {
  onsite: 'Onsite',
  remote: 'Remote',
};

export type TripReportDaysBasis = 'calendar' | 'business';

export const TRIP_REPORT_DAYS_BASIS_LABELS: Record<TripReportDaysBasis, string> = {
  calendar: 'Calendar days',
  business: 'Business days',
};

export type TemplateStatus = 'active' | 'inactive';

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export type QuestionResponse = 'yes' | 'no' | 'nd' | 'na';

export const QUESTION_RESPONSE_LABELS: Record<QuestionResponse, string> = {
  yes: 'Yes',
  no: 'No',
  nd: '—', // Legacy: no longer offered; display existing as em-dash
  na: 'N/A',
};

export interface VisitReportTemplate {
  id: string;
  company_id: string;
  study_id: string | null;
  name: string;
  visit_report_type: VisitReportType;
  days_submission: number;
  days_approval: number;
  days_basis: TripReportDaysBasis;
  template_status: TemplateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitReportTemplateQuestion {
  id: string;
  template_id: string;
  report_order: number;
  report_section: string | null;
  report_sub_section: string | null;
  question_text: string;
  sort_order: number;
  created_at: string;
}

export interface TripReportQuestionResponse {
  id: string;
  trip_report_id: string;
  template_question_id: string;
  response: QuestionResponse | null;
  comments: string | null;
  reviewer_comments: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VisitReportTemplateWithQuestionCount extends VisitReportTemplate {
  question_count?: number;
}

/**
 * Reason a `visit_report_template_versions` row was created. `on_create`
 * snapshots the template at report-create time; `on_first_edit` re-snapshots
 * the template on the first author edit while the report is still
 * `report_pending` if the underlying template has changed since the
 * create-snapshot. See `lib/actions/visit-report-template-versions.ts`.
 */
export type VisitReportTemplateSnapshotReason = 'on_create' | 'on_first_edit';

/**
 * Immutable snapshot of a `visit_report_templates` row taken at report
 * create or first-edit time so editing the live template never silently
 * mutates historical trip reports.
 */
export interface VisitReportTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  name: string;
  visit_report_type: VisitReportType;
  days_submission: number;
  days_approval: number;
  snapshot_reason: VisitReportTemplateSnapshotReason;
  snapshot_taken_by: string | null;
  created_at: string;
}

/**
 * Snapshotted question rows for a `visit_report_template_versions` row.
 * `source_question_id` preserves the original
 * `visit_report_template_questions.id` so pre-snapshot responses can be
 * migrated to the new snapshot's question ids on the on_first_edit path.
 */
export interface VisitReportTemplateQuestionVersion {
  id: string;
  template_version_id: string;
  source_question_id: string | null;
  report_order: number;
  report_section: string | null;
  report_sub_section: string | null;
  question_text: string;
  sort_order: number;
  created_at: string;
}

/**
 * Discriminator returned by `loadTemplateForReport`. Lets callers tell
 * whether a report is reading from a locked-in snapshot vs. lazily
 * falling back to the live template.
 */
export type VisitReportTemplateSource =
  | { kind: 'live'; templateId: string }
  | { kind: 'snapshot'; versionId: string };

/**
 * Trip-report template types kept in lockstep with the active monitoring
 * visit set in `lib/types/ctms.ts` so a visit's `visit_type` always has a
 * matching template via the equality match in
 * `components/ctms/trip-reports/visit-report-authoring.tsx`. Each option's
 * label embeds the same `(ABBREV)` suffix used by `VISIT_TYPE_OPTIONS`.
 */
export const VISIT_REPORT_TYPE_OPTIONS: { value: VisitReportType; label: string }[] = [
  { value: 'sqv',        label: 'Site Qualification Visit (SQV)' },
  { value: 'siv',        label: 'Site Initiation Visit (SIV)' },
  { value: 'monitoring', label: 'Interim Monitoring Visit (IMV)' },
  { value: 'close_out',  label: 'Close-Out Visit (COV)' },
  { value: 'training',   label: 'Training Visit (TV)' },
];

export const VISIT_LOCATION_OPTIONS: { value: VisitLocation; label: string }[] = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
];
