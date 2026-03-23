// =====================================================
// eTMF Module Types
// CDISC TMF Reference Model v3.3.1 Compliant
// =====================================================

export type EtmfDocumentStatus = 'placeholder' | 'qc_review' | 'rejected' | 'approved';

export interface TmfReferenceModel {
  id: string;
  zone_number: number;
  zone_name: string;
  section_number: string;
  section_name: string;
  artifact_number: string;
  artifact_name: string;
  definition_purpose: string | null;
  recommended_sub_artifact: string | null;
  core_or_recommended: 'Core' | 'Recommended' | 'Core ' | null;
  ich_code: boolean;
  iso_14155: boolean;
  trial_level_document: boolean;
  trial_level_milestone: string | null;
  country_level_document: boolean;
  country_level_milestone: string | null;
  site_level_document: boolean;
  dating_convention: string | null;
  process_number: number | null;
  process_name: string | null;
  created_at: string;
}

export interface EtmfExpectedDocument {
  id: string;
  company_id: string;
  study_id: string;
  tmf_ref_id: string;
  edl_yes: boolean;
  site_level_yes: boolean;
  country_level_yes: boolean;
  created_at: string;
  updated_at: string;
  tmf_reference?: TmfReferenceModel;
}

export interface EtmfStaffExpectedDocument {
  id: string;
  company_id: string;
  study_id: string;
  site_id: string;
  tmf_ref_id: string;
  role_name: string;
  required: boolean;
  created_at: string;
  updated_at: string;
  tmf_reference?: TmfReferenceModel;
}

export interface EtmfDocument {
  id: string;
  company_id: string;
  study_id: string;
  study_country_id: string | null;
  site_id: string | null;
  staff_member_id: string | null;
  tmf_ref_id: string | null;
  document_name: string;
  document_status: EtmfDocumentStatus;
  storage_path: string | null;
  file_name: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  version: string | null;
  version_type: string | null;
  language: string | null;
  document_date: string | null;
  document_signed_date: string | null;
  approval_date: string | null;
  expiration_date: string | null;
  version_date: string | null;
  submitter_id: string | null;
  qc_reviewer_id: string | null;
  qc_review_date: string | null;
  rejection_reason: string | null;
  initial_submission_date: string | null;
  created_at: string;
  updated_at: string;
  tmf_reference?: TmfReferenceModel;
  study_country?: { id: string; country_name: string; country_code: string };
  site?: { id: string; name: string; site_number: string };
  staff_member?: { id: string; role: string; profile: { first_name: string | null; last_name: string | null; email: string | null } };
  submitter?: { id: string; first_name: string | null; last_name: string | null };
  qc_reviewer?: { id: string; first_name: string | null; last_name: string | null };
}

export interface EtmfAuditLog {
  id: string;
  company_id: string;
  etmf_document_id: string;
  action: 'upload' | 'edit' | 'status_change' | 'delete';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
  performer?: { id: string; first_name: string | null; last_name: string | null };
}

// Overview stats types
export interface EtmfStaffStats {
  staff_member_id: string;
  staff_name: string;
  role: string;
  total_documents: number;
  placeholders: number;
  qc_review: number;
  rejected: number;
  approved: number;
  completeness_pct: number;
}

export interface EtmfSiteStats {
  site_id: string;
  site_name: string;
  site_number: string;
  total_documents: number;
  placeholders: number;
  qc_review: number;
  rejected: number;
  approved: number;
  completeness_pct: number;
  staff_members: EtmfStaffStats[];
}

export interface EtmfCountryStats {
  country_id: string;
  country_name: string;
  country_code: string;
  total_documents: number;
  placeholders: number;
  qc_review: number;
  rejected: number;
  approved: number;
  completeness_pct: number;
  sites: EtmfSiteStats[];
}

export interface EtmfOverviewStats {
  total_documents: number;
  placeholders: number;
  qc_review: number;
  rejected: number;
  approved: number;
  countries: EtmfCountryStats[];
}

// TMF tree structure for folder navigation
export interface TmfArtifactNode {
  artifact_number: string;
  artifact_name: string;
  sub_artifacts: string[] | null;
}

export interface TmfSectionNode {
  section_number: string;
  section_name: string;
  artifacts: TmfArtifactNode[];
}

export interface TmfZoneNode {
  zone_number: number;
  zone_name: string;
  sections: TmfSectionNode[];
}

// Document filters
export interface EtmfDocumentFilters {
  search?: string;
  document_status?: EtmfDocumentStatus[];
  country_id?: string;
  site_id?: string;
  staff_member_id?: string;
  study_role?: string;
  zone_number?: number;
  section_number?: string;
  artifact_number?: string;
  sub_artifact?: string;
}

// EDL filters
export interface EtmfEdlFilters {
  search?: string;
  zone_number?: number;
  section_number?: string;
  artifact_number?: string;
  core_or_recommended?: 'Core' | 'Recommended';
  edl_yes?: boolean;
  site_level_yes?: boolean;
  country_level_yes?: boolean;
}

// Staff EDL filters
export interface EtmfStaffEdlFilters {
  search?: string;
  artifact_name?: string;
  sub_artifact?: string;
}

// Input types for creating/updating
export interface CreateEtmfDocumentInput {
  study_id: string;
  study_country_id?: string | null;
  site_id?: string | null;
  staff_member_id?: string | null;
  tmf_ref_id?: string | null;
  document_name: string;
  version?: string | null;
  version_type?: string | null;
  language?: string | null;
  document_date?: string | null;
  document_signed_date?: string | null;
  approval_date?: string | null;
  expiration_date?: string | null;
  version_date?: string | null;
}

export interface UpdateEtmfDocumentInput {
  id: string;
  document_name?: string;
  version?: string | null;
  version_type?: string | null;
  language?: string | null;
  document_date?: string | null;
  document_signed_date?: string | null;
  approval_date?: string | null;
  expiration_date?: string | null;
  version_date?: string | null;
}

export interface UpdateEtmfDocumentStatusInput {
  id: string;
  document_status: EtmfDocumentStatus;
  rejection_reason?: string | null;
}

export interface ToggleEdlInput {
  study_id: string;
  tmf_ref_id: string;
  field: 'edl_yes' | 'site_level_yes' | 'country_level_yes';
  value: boolean;
}

export interface ToggleStaffEdlInput {
  site_id: string;
  tmf_ref_id: string;
  role_name: string;
  required: boolean;
}

// Bulk upload types
export interface BulkUploadDocument {
  id: string;
  document_name: string;
  file_name: string;
  document_status: EtmfDocumentStatus;
  creator_name: string;
  upload_date: string;
  days_since_upload: number;
}

// Study and site info for dropdowns
export interface EtmfStudyOption {
  id: string;
  protocol_number: string;
  title: string;
}

export interface EtmfCountryOption {
  id: string;
  country_name: string;
  country_code: string;
}

export interface EtmfSiteOption {
  id: string;
  name: string;
  site_number: string;
  study_country_id: string | null;
}

export interface EtmfStaffMemberOption {
  id: string;
  profile_id: string;
  role: string;
  name: string;
  site_id: string | null;
}

// Role options for staff EDL matrix
export interface EtmfRoleColumn {
  role_name: string;
  display_name: string;
  count: number;
}

// Staff EDL matrix row (document with role toggles)
export interface EtmfStaffEdlMatrixRow {
  tmf_ref_id: string;
  artifact_name: string;
  recommended_sub_artifact: string | null;
  version_date: string | null;
  role_toggles: Record<string, boolean>;
}
