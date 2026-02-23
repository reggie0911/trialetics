export type IrbSubmissionType =
  | 'initial'
  | 'amendment'
  | 'continuing_review'
  | 'safety_report'
  | 'closure';

export type IrbSubmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'approved_with_conditions'
  | 'disapproved'
  | 'withdrawn';

export type IrbContinuingReviewStatus = 'pending' | 'submitted' | 'approved' | 'lapsed';

export type IrbAmendmentType = 'protocol' | 'consent' | 'ib' | 'other';

export const IRB_SUBMISSION_TYPE_LABELS: Record<IrbSubmissionType, string> = {
  initial: 'Initial',
  amendment: 'Amendment',
  continuing_review: 'Continuing Review',
  safety_report: 'Safety Report',
  closure: 'Closure',
};

export const IRB_SUBMISSION_STATUS_LABELS: Record<IrbSubmissionStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  approved_with_conditions: 'Approved with Conditions',
  disapproved: 'Disapproved',
  withdrawn: 'Withdrawn',
};

export const IRB_CONTINUING_REVIEW_STATUS_LABELS: Record<IrbContinuingReviewStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Approved',
  lapsed: 'Lapsed',
};

export const IRB_AMENDMENT_TYPE_LABELS: Record<IrbAmendmentType, string> = {
  protocol: 'Protocol',
  consent: 'Consent',
  ib: 'Investigator Brochure',
  other: 'Other',
};

export interface IrbSubmission {
  id: string;
  company_id: string;
  protocol_id: string | null;
  site_id: string | null;
  irb_organization_id: string | null;
  submission_type: IrbSubmissionType;
  submission_date: string | null;
  reference_number: string | null;
  status: IrbSubmissionStatus;
  response_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  protocol?: { id: string; protocol_number?: string | null; title?: string | null } | null;
  irb_organization?: { id: string; name: string } | null;
}

export interface IrbApproval {
  id: string;
  submission_id: string;
  company_id: string;
  approval_date: string | null;
  expiration_date: string | null;
  approval_number: string | null;
  conditions: string | null;
  approved_consent_version: string | null;
  approved_protocol_version: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submission?: IrbSubmission | null;
}

export interface IrbAmendment {
  id: string;
  company_id: string;
  protocol_id: string | null;
  submission_id: string | null;
  amendment_number: string | null;
  amendment_type: IrbAmendmentType | null;
  description: string | null;
  submitted_date: string | null;
  approved_date: string | null;
  implementation_date: string | null;
  status: string;
  affected_sites: string[] | null;
  created_at: string;
  updated_at: string;
  protocol?: { id: string; protocol_number?: string | null; title?: string | null } | null;
}

export interface IrbContinuingReview {
  id: string;
  company_id: string;
  protocol_id: string | null;
  submission_id: string | null;
  review_period_start: string | null;
  review_period_end: string | null;
  due_date: string | null;
  submitted_date: string | null;
  approved_date: string | null;
  status: IrbContinuingReviewStatus;
  subject_enrollment_summary: string | null;
  adverse_event_summary: string | null;
  protocol_deviation_summary: string | null;
  created_at: string;
  updated_at: string;
  protocol?: { id: string; protocol_number?: string | null; title?: string | null } | null;
}
