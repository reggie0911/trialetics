export type EisfDocumentStatus =
  | 'missing'
  | 'uploaded'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export type EisfRequestStatus = 'open' | 'in_progress' | 'fulfilled' | 'cancelled' | 'declined';

export type EisfRequestPriority = 'low' | 'normal' | 'high';

export type EisfReviewDecision = 'approved' | 'rejected' | 'request_changes';

export interface EisfDocumentCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface EisfSiteFolder {
  id: string;
  company_id: string;
  study_id: string;
  study_site_id: string;
  study_country_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  study_sites?: { id: string; name: string; site_number: string };
  studies?: { id: string; protocol_number: string; title: string };
  study_countries?: { id: string; country_name: string; country_code: string };
}

export interface EisfDocumentVersion {
  id: string;
  company_id: string;
  document_id: string;
  version_label: string;
  storage_path: string | null;
  file_name: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface EisfDocument {
  id: string;
  company_id: string;
  folder_id: string;
  study_id: string;
  category_id: string | null;
  tmf_ref_id: string | null;
  title: string;
  status: EisfDocumentStatus;
  primary_staff_member_id: string | null;
  primary_site_contact_id: string | null;
  expires_on: string | null;
  current_version_id: string | null;
  etmf_document_id: string | null;
  source_request_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: EisfDocumentCategory | null;
  tmf_reference?: { id: string; artifact_name: string; artifact_number: string } | null;
  current_version?: EisfDocumentVersion | null;
}

export interface EisfRequiredDocumentRule {
  id: string;
  company_id: string;
  study_id: string;
  study_site_id: string | null;
  role_name: string | null;
  category_id: string | null;
  tmf_ref_id: string | null;
  rule_label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EisfDocumentRequest {
  id: string;
  company_id: string;
  study_id: string;
  folder_id: string;
  requested_by: string;
  title: string;
  instructions: string;
  category_id: string | null;
  tmf_ref_id: string | null;
  due_date: string | null;
  priority: EisfRequestPriority;
  status: EisfRequestStatus;
  assigned_to: string | null;
  fulfilled_document_id: string | null;
  fulfilled_version_id: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

export interface EisfReviewEvent {
  id: string;
  company_id: string;
  document_id: string;
  version_id: string;
  reviewer_id: string | null;
  decision: EisfReviewDecision;
  comment: string | null;
  created_at: string;
}

export interface EisfAuditLogRow {
  id: string;
  company_id: string;
  eisf_document_id: string | null;
  eisf_document_version_id: string | null;
  eisf_document_request_id: string | null;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
}

export interface EisfDashboardStats {
  by_status: Record<string, number>;
  by_site: Array<{
    folder_id: string;
    site_id: string;
    site_name: string;
    site_number: string;
    total_docs: number;
    approved_docs: number;
    completeness_pct: number;
  }>;
  requests: { open: number; fulfilled: number; overdue: number };
  expiring_buckets: Array<{ bucket: string; cnt: number }>;
}
