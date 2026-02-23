export type TMFArtifactStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'not_applicable';

export const TMF_ARTIFACT_STATUS_LABELS: Record<TMFArtifactStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
  not_applicable: 'N/A',
};

export interface TMFZone {
  id: string;
  company_id: string;
  zone_number: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sections?: TMFSection[];
}

export interface TMFSection {
  id: string;
  zone_id: string;
  company_id: string;
  section_number: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  artifacts?: TMFArtifact[];
}

export interface TMFArtifact {
  id: string;
  section_id: string;
  company_id: string;
  protocol_id: string;
  artifact_number: string | null;
  name: string;
  description: string | null;
  is_required: boolean;
  is_country_specific: boolean;
  is_site_specific: boolean;
  status: TMFArtifactStatus;
  responsible_role: string | null;
  target_date: string | null;
  completion_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  files?: TMFArtifactFile[];
}

export interface TMFArtifactFile {
  id: string;
  artifact_id: string;
  company_id: string;
  document_upload_id: string | null;
  file_name: string | null;
  file_path: string | null;
  version: string | null;
  uploaded_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMFCompletenessCheck {
  id: string;
  company_id: string;
  protocol_id: string;
  checked_by_id: string | null;
  check_date: string;
  total_artifacts: number;
  completed_artifacts: number;
  not_applicable_artifacts: number;
  completeness_percentage: number;
  notes: string | null;
  zone_breakdown: Record<string, { total: number; complete: number; pct: number }> | null;
  created_at: string;
}
