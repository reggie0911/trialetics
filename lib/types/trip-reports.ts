// =============================================
// Trip Reports Module Types
// Per Oracle CTMS: Administering and Using Clinical Trip Reports
// =============================================

import type { SiteVisitType } from './contacts-organizations';

// =============================================
// Trip Report Status
// =============================================

export type TripReportStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'submitted'
  | 'reviewed_with_comments'
  | 'rejected'
  | 'revised'
  | 'submitted_for_approval'
  | 'approved'
  | 'obsolete';

export const TRIP_REPORT_STATUS_LABELS: Record<TripReportStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  submitted: 'Submitted',
  reviewed_with_comments: 'Reviewed with Comments',
  rejected: 'Rejected',
  revised: 'Revised',
  submitted_for_approval: 'Submitted for Approval',
  approved: 'Approved',
  obsolete: 'Obsolete',
};

// =============================================
// Template Activity Types
// =============================================

export type TemplateActivityType = 'checklist' | 'follow_up';

export const TEMPLATE_ACTIVITY_TYPE_LABELS: Record<TemplateActivityType, string> = {
  checklist: 'Question',
  follow_up: 'Action Item',
};

export type TemplatePriority = 'low' | 'medium' | 'high';

export const TEMPLATE_PRIORITY_LABELS: Record<TemplatePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// =============================================
// Checklist Status
// =============================================

export type ChecklistItemStatus = 'pending' | 'in_progress' | 'done' | 'completed';

export const CHECKLIST_ITEM_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  completed: 'Completed',
};

// =============================================
// Follow-up Status
// =============================================

export type FollowUpItemStatus = 'open' | 'done';

export const FOLLOW_UP_ITEM_STATUS_LABELS: Record<FollowUpItemStatus, string> = {
  open: 'Open',
  done: 'Done',
};

// =============================================
// Checklist Response (Yes/No/N/D/N/A)
// =============================================

export type ChecklistResponse = 'yes' | 'no' | 'nd' | 'na';

export const CHECKLIST_RESPONSE_LABELS: Record<ChecklistResponse, string> = {
  yes: 'Yes',
  no: 'No',
  nd: 'N/D',
  na: 'N/A',
};

// =============================================
// Attendee Type (Site vs Sponsor)
// =============================================

export type AttendeeType = 'site' | 'sponsor';

export const ATTENDEE_TYPE_LABELS: Record<AttendeeType, string> = {
  site: 'Site',
  sponsor: 'Sponsor',
};

// =============================================
// Action Item Categories
// =============================================

export const ACTION_ITEM_CATEGORIES = [
  'Case Report Form (CRF)',
  'Investigational Product',
  'Regulatory',
  'Informed Consent',
  'Safety',
  'Protocol Compliance',
  'Site Management',
  'Other',
] as const;

export type ActionItemCategory = (typeof ACTION_ITEM_CATEGORIES)[number];

// =============================================
// Core Entity Interfaces
// =============================================

export interface TripReportTemplate {
  id: string;
  company_id: string;
  name: string;
  visit_type: SiteVisitType;
  project_id: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripReportTemplateDetail {
  id: string;
  template_id: string;
  activity_type: TemplateActivityType;
  activity: string;
  priority: TemplatePriority | null;
  sort_order: number;
  report_order?: number;
  report_sub_section?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripReport {
  id: string;
  site_visit_id: string;
  template_id: string | null;
  status: TripReportStatus;
  version: number;
  completed_date: string | null;
  trip_report_completed_date: string | null;
  reviewer_id: string | null;
  approver_id: string | null;
  reviewer_comments: string | null;
  approver_comments: string | null;
  assigned_to_id: string | null;
  notes: string | null;
  narrative: string | null;
  study_info_reviewer_comments: string | null;
  site_attendees_reviewer_comments: string | null;
  sponsor_attendees_reviewer_comments: string | null;
  crf_reviewer_comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripReportChecklistItem {
  id: string;
  trip_report_id: string;
  activity: string;
  status: ChecklistItemStatus;
  comments: string | null;
  response: ChecklistResponse | null;
  reviewer_comments: string | null;
  sort_order: number;
  report_order?: number;
  report_sub_section?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripReportFollowUpItem {
  id: string;
  trip_report_id: string;
  activity: string;
  status: FollowUpItemStatus;
  completed_date: string | null;
  category: string | null;
  description: string | null;
  date_opened: string | null;
  action_due_date: string | null;
  date_resolved: string | null;
  reviewer_comments: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TripReportAttendee {
  id: string;
  trip_report_id: string;
  contact_id: string;
  attendee_type: AttendeeType;
  role: string | null;
  created_at: string;
}

export interface TripReportCrfTracking {
  id: string;
  trip_report_id: string;
  subject_visit_id: string | null;
  subject_identifier: string | null;
  visit_name: string | null;
  crf_name: string | null;
  source_verified: boolean;
  retrieved: boolean;
  sdv_type: 'partial' | 'complete' | null;
  page_numbers_verified: string | null;
  charts_reviewed_date: string | null;
  forms_signed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripReportApproval {
  id: string;
  trip_report_id: string;
  login: string | null;
  old_status: string | null;
  new_status: string;
  updated_at: string;
}

// =============================================
// Extended Interfaces with Relations
// =============================================

export interface TripReportTemplateWithDetails extends TripReportTemplate {
  details?: TripReportTemplateDetail[];
}

export interface TripReportWithRelations extends TripReport {
  site_visit?: {
    id: string;
    visit_name: string;
    visit_type: SiteVisitType;
    visit_start: string;
    visit_end?: string | null;
    visit_status: string;
    organization_id: string;
    project_id?: string | null;
    project?: { id: string; protocol_number: string; protocol_name: string } | null;
  };
  organization?: {
    id: string;
    name: string;
  };
  template?: TripReportTemplate | null;
  reviewer?: { id: string; first_name: string | null; email: string | null } | null;
  approver?: { id: string; first_name: string | null; email: string | null } | null;
  assigned_to?: { id: string; first_name: string | null; email: string | null } | null;
  checklist_items?: TripReportChecklistItem[];
  follow_up_items?: TripReportFollowUpItem[];
  attendees?: TripReportAttendeeWithContact[];
  crf_tracking?: TripReportCrfTracking[];
  approvals?: TripReportApproval[];
}

export interface TripReportAttendeeWithContact extends TripReportAttendee {
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

// Extended site_visit for Study Information (includes project)
export interface TripReportSiteVisitWithProject {
  id: string;
  visit_name: string;
  visit_type: SiteVisitType;
  visit_start: string;
  visit_end?: string | null;
  visit_status: string;
  organization_id: string;
  project_id?: string | null;
  project?: { id: string; protocol_number: string; protocol_name: string } | null;
}

// =============================================
// Summary View Types
// =============================================

export interface TripReportSummary {
  checklists_completed: number;
  checklists_total: number;
  follow_ups_completed: number;
  follow_ups_total: number;
  current_follow_ups_completed: number;
  current_follow_ups_total: number;
  crf_completed: number;
  crf_total: number;
  attendees_count: number;
}
