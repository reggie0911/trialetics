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
  const action = metadata.action;
  if (typeof action === 'string' && action.trim() !== '') {
    return TRIP_REPORT_AUDIT_ACTION_LABELS[action] ?? titleCaseFromSnake(action);
  }
  return '—';
}

export type VisitReportType = 'sqv' | 'siv' | 'monitoring' | 'close_out';

export const VISIT_REPORT_TYPE_LABELS: Record<VisitReportType, string> = {
  sqv: 'Site Qualification Visit',
  siv: 'Site Initiation Visit',
  monitoring: 'Interim Monitoring Visit',
  close_out: 'Closeout Visit',
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

export const VISIT_REPORT_TYPE_OPTIONS: { value: VisitReportType; label: string }[] = [
  { value: 'sqv', label: 'Site Qualification Visit' },
  { value: 'siv', label: 'Site Initiation Visit' },
  { value: 'monitoring', label: 'Interim Monitoring Visit' },
  { value: 'close_out', label: 'Closeout Visit' },
];

export const VISIT_LOCATION_OPTIONS: { value: VisitLocation; label: string }[] = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
];
