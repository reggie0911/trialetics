// =============================================
// Clinical Trials Module Types
// Phase 1: Core Hierarchy (Programs, Protocols, Regions, Sites)
// Phase 2: Teams, Accounts, Protocol Versions
// =============================================

// =============================================
// ENUM Types
// =============================================

export type ProtocolPhase = 'phase_i' | 'phase_ii' | 'phase_iii' | 'phase_iv' | 'observational';

export type ProtocolStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'terminated';

export type ProtocolDesign = 
  | 'randomized' 
  | 'open_label' 
  | 'double_blind' 
  | 'single_blind' 
  | 'crossover' 
  | 'parallel'
  | 'observational';

export type SiteStatus = 
  | 'planned' 
  | 'not_initiated' 
  | 'initiated' 
  | 'enrolling' 
  | 'closed' 
  | 'terminated';

export type TeamRole =
  | 'study_manager'
  | 'clinical_director'
  | 'cra'
  | 'data_manager'
  | 'medical_monitor'
  | 'regulatory_specialist'
  | 'quality_assurance'
  | 'biostatistician'
  | 'pharmacovigilance'
  | 'site_coordinator';

export type AccountType =
  | 'irb'
  | 'central_irb'
  | 'cro'
  | 'regional_cro'
  | 'laboratory'
  | 'central_laboratory'
  | 'vendor'
  | 'pharmacy'
  | 'imaging_center';

export type TeamAssignmentStatus = 'active' | 'inactive';

export type EntityType = 'protocol' | 'region' | 'site';

export type SdvPolicy = 'complete' | 'partial' | 'external';

export type SdvLastUpdatedSource = 'manual' | 'site' | 'subject_status' | 'external';

export const SDV_POLICY_LABELS: Record<SdvPolicy, string> = {
  complete: 'Complete',
  partial: 'Partial',
  external: 'External',
};

export const SDV_LAST_UPDATED_SOURCE_LABELS: Record<SdvLastUpdatedSource, string> = {
  manual: 'Manual',
  site: 'Site',
  subject_status: 'Subject Status',
  external: 'External',
};

// =============================================
// Core Entity Interfaces
// =============================================

export interface ClinicalProgram {
  id: string;
  company_id: string;
  name: string;
  mechanism: string | null;
  application_id: string | null;
  status: ProtocolStatus;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalProtocol {
  id: string;
  company_id: string;
  program_id: string | null;
  project_id: string | null;
  protocol_number: string;
  title: string;
  phase: ProtocolPhase | null;
  objective: string | null;
  design: ProtocolDesign | null;
  type: string | null;
  sponsor: string | null;
  status: ProtocolStatus;
  regions_required: boolean;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  planned_sites_count: number | null;
  planned_subjects_count: number | null;
  currency_code: string;
  exchange_date: string | null;
  withholding_amount: number | null;
  withholding_percent: number | null;
  approval_date: string | null;
  psdv_initial_subjects_count: number | null;
  psdv_subject_auto_select_rate: number | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalRegion {
  id: string;
  company_id: string;
  protocol_id: string;
  region_name: string;
  planned_sites_count: number | null;
  planned_subjects_count: number | null;
  no_site_info: boolean;
  currency_code: string;
  exchange_date: string | null;
  withholding_amount: number | null;
  withholding_percent: number | null;
  psdv_initial_subjects_count: number | null;
  psdv_subject_auto_select_rate: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClinicalSite {
  id: string;
  company_id: string;
  protocol_id: string;
  region_id: string | null;
  organization_id: string | null;
  principal_investigator_id: string | null;
  site_number: string | null;
  status: SiteStatus;
  no_subject_info: boolean;
  last_completed_visit_date: string | null;
  currency_code: string;
  exchange_date: string | null;
  withholding_amount: number | null;
  withholding_percent: number | null;
  site_initiated_date: string | null;
  site_terminated_date: string | null;
  // Site milestones
  site_qualification_date: string | null;
  irb_approval_date: string | null;
  irb_expiration_date: string | null;
  irb_approval_number: string | null;
  irb_institution_name: string | null;
  close_out_date: string | null;
  first_subject_enrolled_date: string | null;
  last_subject_enrolled_date: string | null;
  planned_subject_count: number | null;
  enrolled_subject_count: number;
  screen_failure_count: number;
  completed_subject_count: number;
  early_terminated_count: number;
  sdv_policy: SdvPolicy;
  psdv_initial_subjects_count: number | null;
  psdv_subject_auto_select_rate: number | null;
  total_subjects_requiring_sdv: number | null;
  use_cdms_auto_select_rule: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================
// Extended Interfaces with Relations
// =============================================

export interface ClinicalProgramWithRelations extends ClinicalProgram {
  protocols?: ClinicalProtocol[];
  protocols_count?: number;
}

export interface ClinicalProtocolWithRelations extends ClinicalProtocol {
  program?: ClinicalProgram | null;
  regions?: ClinicalRegion[];
  sites?: ClinicalSiteWithRelations[];
  regions_count?: number;
  sites_count?: number;
}

export interface ClinicalRegionWithRelations extends ClinicalRegion {
  protocol?: ClinicalProtocol;
  sites?: ClinicalSiteWithRelations[];
  sites_count?: number;
}

export interface ClinicalSiteWithRelations extends ClinicalSite {
  protocol?: ClinicalProtocol;
  region?: ClinicalRegion | null;
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  } | null;
  principal_investigator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

// =============================================
// Form Data Types
// =============================================

export interface CreateClinicalProgramData {
  name: string;
  mechanism?: string | null;
  application_id?: string | null;
  status?: ProtocolStatus;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicalProgramData extends Partial<CreateClinicalProgramData> {
  id: string;
}

export interface CreateClinicalProtocolData {
  program_id?: string | null;
  project_id?: string | null;
  protocol_number: string;
  title: string;
  phase?: ProtocolPhase | null;
  objective?: string | null;
  design?: ProtocolDesign | null;
  type?: string | null;
  sponsor?: string | null;
  status?: ProtocolStatus;
  regions_required?: boolean;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  planned_sites_count?: number | null;
  planned_subjects_count?: number | null;
  currency_code?: string;
  exchange_date?: string | null;
  withholding_amount?: number | null;
  withholding_percent?: number | null;
  approval_date?: string | null;
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicalProtocolData extends Partial<CreateClinicalProtocolData> {
  id: string;
}

export interface CreateClinicalRegionData {
  protocol_id: string;
  region_name: string;
  planned_sites_count?: number | null;
  planned_subjects_count?: number | null;
  no_site_info?: boolean;
  currency_code?: string;
  exchange_date?: string | null;
  withholding_amount?: number | null;
  withholding_percent?: number | null;
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicalRegionData extends Partial<Omit<CreateClinicalRegionData, 'protocol_id'>> {
  id: string;
}

export interface CreateClinicalSiteData {
  protocol_id: string;
  region_id?: string | null;
  organization_id?: string | null;
  principal_investigator_id?: string | null;
  site_number?: string | null;
  status?: SiteStatus;
  no_subject_info?: boolean;
  currency_code?: string;
  exchange_date?: string | null;
  withholding_amount?: number | null;
  withholding_percent?: number | null;
  site_initiated_date?: string | null;
  site_terminated_date?: string | null;
  site_qualification_date?: string | null;
  irb_approval_date?: string | null;
  irb_expiration_date?: string | null;
  irb_approval_number?: string | null;
  irb_institution_name?: string | null;
  planned_subject_count?: number | null;
  sdv_policy?: SdvPolicy;
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
  use_cdms_auto_select_rule?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateClinicalSiteData extends Partial<Omit<CreateClinicalSiteData, 'protocol_id'>> {
  id: string;
}

// =============================================
// Filter Types
// =============================================

export interface ClinicalProgramFilters {
  search?: string;
  status?: ProtocolStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface ClinicalProtocolFilters {
  search?: string;
  program_id?: string;
  phase?: ProtocolPhase | 'all';
  status?: ProtocolStatus | 'all';
  regions_required?: boolean | 'all';
  page?: number;
  pageSize?: number;
}

export interface ClinicalRegionFilters {
  search?: string;
  protocol_id?: string;
  page?: number;
  pageSize?: number;
}

export interface ClinicalSiteFilters {
  search?: string;
  protocol_id?: string;
  region_id?: string;
  status?: SiteStatus | 'all';
  organization_id?: string;
  page?: number;
  pageSize?: number;
}

// =============================================
// Stats Types
// =============================================

export interface ClinicalTrialsStats {
  total_programs: number;
  total_protocols: number;
  total_regions: number;
  total_sites: number;
  active_protocols: number;
  enrolling_sites: number;
  protocols_by_phase: Record<string, number>;
  protocols_by_status: Record<string, number>;
  sites_by_status: Record<string, number>;
}

// =============================================
// Label Constants
// =============================================

export const PROTOCOL_PHASE_LABELS: Record<ProtocolPhase, string> = {
  phase_i: 'Phase I',
  phase_ii: 'Phase II',
  phase_iii: 'Phase III',
  phase_iv: 'Phase IV',
  observational: 'Observational',
};

export const PROTOCOL_STATUS_LABELS: Record<ProtocolStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  terminated: 'Terminated',
};

export const PROTOCOL_DESIGN_LABELS: Record<ProtocolDesign, string> = {
  randomized: 'Randomized',
  open_label: 'Open Label',
  double_blind: 'Double Blind',
  single_blind: 'Single Blind',
  crossover: 'Crossover',
  parallel: 'Parallel',
  observational: 'Observational',
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  planned: 'Planned',
  not_initiated: 'Not Initiated',
  initiated: 'Initiated',
  enrolling: 'Enrolling',
  closed: 'Closed',
  terminated: 'Terminated',
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  study_manager: 'Study Manager',
  clinical_director: 'Clinical Director',
  cra: 'CRA',
  data_manager: 'Data Manager',
  medical_monitor: 'Medical Monitor',
  regulatory_specialist: 'Regulatory Specialist',
  quality_assurance: 'Quality Assurance',
  biostatistician: 'Biostatistician',
  pharmacovigilance: 'Pharmacovigilance',
  site_coordinator: 'Site Coordinator',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  irb: 'IRB',
  central_irb: 'Central IRB',
  cro: 'CRO',
  regional_cro: 'Regional CRO',
  laboratory: 'Laboratory',
  central_laboratory: 'Central Laboratory',
  vendor: 'Vendor',
  pharmacy: 'Pharmacy',
  imaging_center: 'Imaging Center',
};

// =============================================
// Phase 3: Subject Management Types
// =============================================

export type SubjectStatus = 'screening' | 'enrolled' | 'completed' | 'terminated' | 'screen_failure' | 'rescreened' | 'randomized' | 'withdrawn' | 'early_terminated';

export type VisitStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export type VisitType = 'screening' | 'rescreening' | 'enrollment' | 'baseline' | 'treatment' | 'follow_up' | 'early_termination' | 'end_of_study' | 'unscheduled';

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'not_applicable';

export const SUBJECT_STATUS_LABELS: Record<SubjectStatus, string> = {
  screening: 'Screening',
  enrolled: 'Enrolled',
  completed: 'Completed',
  terminated: 'Terminated',
  screen_failure: 'Screen Failure',
  rescreened: 'Re-screened',
  randomized: 'Randomized',
  withdrawn: 'Withdrawn',
  early_terminated: 'Early Terminated',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  screening: 'Screening',
  rescreening: 'Re-screening',
  enrollment: 'Enrollment',
  baseline: 'Baseline',
  treatment: 'Treatment',
  follow_up: 'Follow-up',
  early_termination: 'Early Termination',
  end_of_study: 'End of Study',
  unscheduled: 'Unscheduled',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  not_applicable: 'Not Applicable',
};

// =============================================
// Phase 3: Entity Interfaces
// =============================================

export interface Subject {
  id: string;
  company_id: string;
  site_id: string;
  screening_number: string | null;
  subject_number: string | null;
  status: SubjectStatus;
  enrollment_date: string | null;
  screening_date: string | null;
  completion_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  screen_failure_reason: string | null;
  demographic_data: Record<string, unknown>;
  sdv_required: boolean | null;
  sdv_last_updated_source: SdvLastUpdatedSource | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectVisitTemplate {
  id: string;
  company_id: string;
  protocol_id: string;
  version_number: string;
  name: string;
  description: string | null;
  is_active: boolean;
  irb_approval_date: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVisit {
  id: string;
  company_id: string;
  template_id: string;
  visit_name: string;
  visit_type: VisitType;
  sequence: number;
  day_from_baseline: number;
  visit_window_before: number;
  visit_window_after: number;
  description: string | null;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TemplateActivity {
  id: string;
  company_id: string;
  template_visit_id: string;
  activity_name: string;
  activity_type: string | null;
  is_required: boolean;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubjectVisit {
  id: string;
  company_id: string;
  subject_id: string;
  site_id: string;
  template_visit_id: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  status: VisitStatus;
  visit_type: VisitType;
  visit_name: string;
  sequence: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectActivity {
  id: string;
  company_id: string;
  subject_visit_id: string;
  template_activity_id: string | null;
  activity_name: string;
  activity_type: string | null;
  status: ActivityStatus;
  completed_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================
// Phase 3: Extended Interfaces with Relations
// =============================================

export interface SubjectWithRelations extends Subject {
  site?: ClinicalSiteWithRelations;
  visits?: SubjectVisitWithRelations[];
  visits_count?: number;
}

export interface SubjectVisitTemplateWithRelations extends SubjectVisitTemplate {
  protocol?: ClinicalProtocol;
  visits?: TemplateVisitWithRelations[];
  visits_count?: number;
}

export interface TemplateVisitWithRelations extends TemplateVisit {
  template?: SubjectVisitTemplate;
  activities?: TemplateActivity[];
  activities_count?: number;
}

export interface SubjectVisitWithRelations extends SubjectVisit {
  subject?: Subject;
  site?: ClinicalSiteWithRelations;
  template_visit?: TemplateVisit | null;
  activities?: SubjectActivityWithRelations[];
  activities_count?: number;
}

export interface SubjectActivityWithRelations extends SubjectActivity {
  visit?: SubjectVisit;
  template_activity?: TemplateActivity | null;
  assigned_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

// =============================================
// Phase 3: Form Data Types
// =============================================

export interface CreateSubjectData {
  site_id: string;
  screening_number?: string | null;
  subject_number?: string | null;
  encounter_date?: string | null;
  status?: SubjectStatus;
  enrollment_date?: string | null;
  screening_date?: string | null;
  completion_date?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  screen_failure_reason?: string | null;
  demographic_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectData extends Partial<CreateSubjectData> {
  id: string;
  enrollment_id?: string | null;
  status?: SubjectStatus;
  enrollment_date?: string | null;
  screening_date?: string | null;
  completion_date?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  screen_failure_reason?: string | null;
  screen_failure_date?: string | null;
  randomization_id?: string | null;
  randomization_date?: string | null;
  withdrawn_reason?: string | null;
  withdrawn_date?: string | null;
  early_termination_reason?: string | null;
  early_terminated_date?: string | null;
  rescreening_date?: string | null;
  use_last_completed_visit_for_reschedule?: boolean;
  sdv_required?: boolean | null;
  sdv_last_updated_source?: SdvLastUpdatedSource | null;
}

export interface CreateSubjectVisitTemplateData {
  protocol_id: string;
  version_number: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  irb_approval_date?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectVisitTemplateData extends Partial<Omit<CreateSubjectVisitTemplateData, 'protocol_id'>> {
  id: string;
}

export interface CreateTemplateVisitData {
  template_id: string;
  visit_name: string;
  visit_type: VisitType;
  sequence: number;
  day_from_baseline?: number;
  visit_window_before?: number;
  visit_window_after?: number;
  description?: string | null;
  sdv_required?: boolean;
  page_numbers_to_verify?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateVisitData extends Partial<Omit<CreateTemplateVisitData, 'template_id'>> {
  id: string;
}

export interface CreateTemplateActivityData {
  template_visit_id: string;
  activity_name: string;
  activity_type?: string | null;
  is_required?: boolean;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateActivityData extends Partial<Omit<CreateTemplateActivityData, 'template_visit_id'>> {
  id: string;
}

export interface CreateSubjectVisitData {
  subject_id: string;
  site_id: string;
  template_visit_id?: string | null;
  scheduled_date?: string | null;
  actual_date?: string | null;
  status?: VisitStatus;
  visit_type: VisitType;
  visit_name: string;
  sequence: number;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectVisitData extends Partial<Omit<CreateSubjectVisitData, 'subject_id' | 'site_id'>> {
  id: string;
}

export interface CreateSubjectActivityData {
  subject_visit_id: string;
  template_activity_id?: string | null;
  activity_name: string;
  activity_type?: string | null;
  status?: ActivityStatus;
  completed_date?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectActivityData extends Partial<Omit<CreateSubjectActivityData, 'subject_visit_id'>> {
  id: string;
}

// =============================================
// Phase 3: Filter Types
// =============================================

export interface SubjectFilters {
  search?: string;
  site_id?: string;
  status?: SubjectStatus | 'all';
  enrollment_date_from?: string;
  enrollment_date_to?: string;
  page?: number;
  pageSize?: number;
}

export interface SubjectVisitTemplateFilters {
  protocol_id?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SubjectVisitFilters {
  subject_id?: string;
  site_id?: string;
  status?: VisitStatus | 'all';
  visit_type?: VisitType | 'all';
  scheduled_date_from?: string;
  scheduled_date_to?: string;
  page?: number;
  pageSize?: number;
}

export interface SubjectActivityFilters {
  subject_visit_id?: string;
  status?: ActivityStatus | 'all';
  assigned_to?: string;
  page?: number;
  pageSize?: number;
}

// =============================================
// Phase 2: Team Management Types
// =============================================

export interface ProtocolVersion {
  id: string;
  company_id: string;
  protocol_id: string;
  version_number: string;
  is_original: boolean;
  amendment_version: string | null;
  approval_date: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtocolTeam {
  id: string;
  company_id: string;
  protocol_id: string;
  user_id: string;
  role: TeamRole;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  status: TeamAssignmentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RegionTeam {
  id: string;
  company_id: string;
  region_id: string;
  user_id: string;
  role: TeamRole;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  status: TeamAssignmentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SiteTeam {
  id: string;
  company_id: string;
  site_id: string;
  user_id: string;
  role: TeamRole;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  status: TeamAssignmentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TeamAssignmentHistory {
  id: string;
  company_id: string;
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  role: TeamRole;
  start_date: string;
  end_date: string | null;
  is_locked: boolean;
  changed_by_id: string | null;
  changed_by_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProtocolAccount {
  id: string;
  company_id: string;
  protocol_id: string;
  organization_id: string;
  account_type: AccountType;
  is_central: boolean;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RegionAccount {
  id: string;
  company_id: string;
  region_id: string;
  organization_id: string;
  account_type: AccountType;
  is_regional: boolean;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SiteAccount {
  id: string;
  company_id: string;
  site_id: string;
  organization_id: string;
  account_type: AccountType;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =============================================
// Phase 2: Extended Interfaces with Relations
// =============================================

export interface ProtocolVersionWithRelations extends ProtocolVersion {
  protocol?: ClinicalProtocol;
}

export interface ProtocolTeamWithRelations extends ProtocolTeam {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  protocol?: ClinicalProtocol;
}

export interface RegionTeamWithRelations extends RegionTeam {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  region?: ClinicalRegion;
}

export interface SiteTeamWithRelations extends SiteTeam {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  site?: ClinicalSite;
}

export interface TeamAssignmentHistoryWithRelations extends TeamAssignmentHistory {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  changed_by?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export interface ProtocolAccountWithRelations extends ProtocolAccount {
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
  protocol?: ClinicalProtocol;
}

export interface RegionAccountWithRelations extends RegionAccount {
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
  region?: ClinicalRegion;
}

export interface SiteAccountWithRelations extends SiteAccount {
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
  site?: ClinicalSite;
}

// =============================================
// Phase 2: Form Data Types
// =============================================

export interface CreateProtocolVersionData {
  protocol_id: string;
  version_number: string;
  is_original?: boolean;
  amendment_version?: string | null;
  approval_date?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateProtocolVersionData extends Partial<Omit<CreateProtocolVersionData, 'protocol_id'>> {
  id: string;
}

export interface CreateTeamAssignmentData {
  entity_type: EntityType;
  entity_id: string;
  user_id: string;
  role: TeamRole;
  is_primary?: boolean;
  start_date: string;
  end_date?: string | null;
  status?: TeamAssignmentStatus;
  with_rollup?: boolean;
  with_rolldown?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateTeamAssignmentData {
  id: string;
  entity_type: EntityType;
  is_primary?: boolean;
  end_date?: string | null;
  status?: TeamAssignmentStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateAccountAssociationData {
  entity_type: EntityType;
  entity_id: string;
  organization_id: string;
  account_type: AccountType;
  is_central?: boolean;
  is_regional?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateAccountAssociationData {
  id: string;
  entity_type: EntityType;
  is_central?: boolean;
  is_regional?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  metadata?: Record<string, unknown>;
}

// =============================================
// Phase 2: Filter Types
// =============================================

export interface ProtocolVersionFilters {
  protocol_id?: string;
  is_original?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TeamAssignmentFilters {
  entity_type?: EntityType;
  entity_id?: string;
  user_id?: string;
  role?: TeamRole | 'all';
  status?: TeamAssignmentStatus | 'all';
  is_primary?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TeamAssignmentHistoryFilters {
  entity_type?: EntityType;
  entity_id?: string;
  user_id?: string;
  role?: TeamRole | 'all';
  page?: number;
  pageSize?: number;
}

export interface AccountAssociationFilters {
  entity_type?: EntityType;
  entity_id?: string;
  organization_id?: string;
  account_type?: AccountType | 'all';
  is_central?: boolean;
  is_regional?: boolean;
  page?: number;
  pageSize?: number;
}

// =============================================
// Phase 3: Subject Management & Visit Scheduling
// =============================================

// Template status (Phase 3 addition)
export type TemplateStatus = 'in_progress' | 'approved' | 'obsolete';

// Time unit (Phase 3 addition)
export type TimeUnit = 'days' | 'weeks' | 'months';

// Label Maps (Phase 3 additions only)
export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  in_progress: 'In Progress',
  approved: 'Approved',
  obsolete: 'Obsolete',
};

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  days: 'Days',
  weeks: 'Weeks',
  months: 'Months',
};

// Core Entity Interfaces
export interface Subject {
  id: string;
  company_id: string;
  site_id: string;
  screening_number: string | null;
  subject_number: string | null;
  enrollment_id: string | null;
  status: SubjectStatus;
  encounter_date: string | null;
  enrollment_date: string | null;
  screening_date: string | null;
  completion_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  screen_failure_reason: string | null;
  screen_failure_date: string | null;
  randomization_id: string | null;
  randomization_date: string | null;
  withdrawn_reason: string | null;
  withdrawn_date: string | null;
  early_termination_reason: string | null;
  early_terminated_date: string | null;
  rescreening_date: string | null;
  informed_consent_versions: InformedConsentVersion[];
  use_last_completed_visit_for_reschedule: boolean;
  demographic_data: Record<string, unknown>;
  sdv_required: boolean | null;
  sdv_last_updated_source: SdvLastUpdatedSource | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface InformedConsentVersion {
  version_id: string;
  version_number: string;
  date: string;
}

export interface SubjectVisitTemplate {
  id: string;
  company_id: string;
  protocol_id: string;
  version_number: string;
  name: string;
  description: string | null;
  status: TemplateStatus;
  is_active: boolean;
  approval_date: string | null;
  start_date: string | null;
  end_date: string | null;
  change_summary: string | null;
  comments: string | null;
  irb_approval_date: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVisit {
  id: string;
  company_id: string;
  template_id: string;
  visit_name: string;
  visit_type: VisitType;
  sequence: number;
  is_planned: boolean;
  is_status_tracking_visit: boolean;
  day_from_baseline: number;
  lead_time_value: number | null;
  lead_time_unit: TimeUnit | null;
  visit_window_before: number;
  visit_window_after: number;
  window_unit: TimeUnit;
  crf_pages_count: number | null;
  payment_flag: boolean;
  visit_status: SubjectStatus | null;
  description: string | null;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TemplateActivity {
  id: string;
  company_id: string;
  template_visit_id: string;
  activity_name: string;
  activity_type: string | null;
  sequence: number | null;
  is_required: boolean;
  duration_value: number | null;
  duration_unit: TimeUnit | null;
  payment_flag: boolean;
  payment_amount: number | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubjectVisit {
  id: string;
  company_id: string;
  subject_id: string;
  site_id: string;
  template_visit_id: string | null;
  planned_date: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  due_date: string | null;
  window_start_date: string | null;
  window_end_date: string | null;
  status: VisitStatus;
  visit_type: VisitType;
  visit_name: string;
  sequence: number;
  is_planned: boolean;
  override_status: string | null;
  crf_pages_submitted: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by_id: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectActivity {
  id: string;
  company_id: string;
  subject_visit_id: string;
  template_activity_id: string | null;
  activity_name: string;
  activity_type: string | null;
  status: ActivityStatus;
  completed_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubjectStatusHistory {
  id: string;
  company_id: string;
  subject_id: string;
  visit_type: VisitType | null;
  status: SubjectStatus;
  status_date: string;
  is_primary: boolean;
  comments: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubjectTransferHistory {
  id: string;
  company_id: string;
  subject_id: string;
  from_site_id: string;
  to_site_id: string;
  transfer_date: string;
  reason: string | null;
  status_at_transfer: SubjectStatus | null;
  transferred_by: string | null;
  transferred_by_email: string | null;
  comments: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Extended Interfaces with Relations
export interface SubjectWithRelations extends Subject {
  site?: ClinicalSiteWithRelations;
  visits?: SubjectVisitWithRelations[];
  status_history?: SubjectStatusHistory[];
  transfer_history?: SubjectTransferHistory[];
}

export interface SubjectVisitTemplateWithRelations extends SubjectVisitTemplate {
  protocol?: ClinicalProtocol;
  visits?: TemplateVisitWithRelations[];
  visits_count?: number;
}

export interface TemplateVisitWithRelations extends TemplateVisit {
  template?: SubjectVisitTemplate;
  activities?: TemplateActivity[];
  activities_count?: number;
}

export interface SubjectVisitWithRelations extends SubjectVisit {
  subject?: Subject;
  site?: ClinicalSiteWithRelations;
  template_visit?: TemplateVisit | null;
  activities?: SubjectActivityWithRelations[];
}

// Form Data Types (merged - use CreateSubjectData/UpdateSubjectData from Phase 3 section above)

export interface CreateSubjectVisitTemplateData {
  protocol_id: string;
  version_number: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  change_summary?: string | null;
  comments?: string | null;
  irb_approval_date?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectVisitTemplateData extends Partial<Omit<CreateSubjectVisitTemplateData, 'protocol_id' | 'version_number'>> {
  id: string;
  status?: TemplateStatus;
  is_active?: boolean;
  approval_date?: string | null;
}

export interface CreateTemplateVisitData {
  template_id: string;
  visit_name: string;
  visit_type: VisitType;
  sequence: number;
  is_planned?: boolean;
  is_status_tracking_visit?: boolean;
  day_from_baseline?: number;
  lead_time_value?: number | null;
  lead_time_unit?: TimeUnit | null;
  visit_window_before?: number;
  visit_window_after?: number;
  window_unit?: TimeUnit;
  crf_pages_count?: number | null;
  payment_flag?: boolean;
  visit_status?: SubjectStatus | null;
  description?: string | null;
  sdv_required?: boolean;
  page_numbers_to_verify?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateVisitData extends Partial<Omit<CreateTemplateVisitData, 'template_id'>> {
  id: string;
}

export interface CreateTemplateActivityData {
  template_visit_id: string;
  activity_name: string;
  activity_type?: string | null;
  sequence?: number | null;
  is_required?: boolean;
  duration_value?: number | null;
  duration_unit?: TimeUnit | null;
  payment_flag?: boolean;
  payment_amount?: number | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateActivityData extends Partial<Omit<CreateTemplateActivityData, 'template_visit_id'>> {
  id: string;
}

export interface CreateSubjectVisitData {
  subject_id: string;
  site_id: string;
  visit_name: string;
  visit_type: VisitType;
  sequence: number;
  scheduled_date?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubjectVisitData extends Partial<Omit<CreateSubjectVisitData, 'subject_id' | 'site_id'>> {
  id: string;
  actual_date?: string | null;
  status?: VisitStatus;
  override_status?: string | null;
  crf_pages_submitted?: number | null;
}

export interface ScheduleSubjectData {
  subject_id: string;
  schedule_date: string;
}

export interface RescheduleSubjectData {
  subject_id: string;
  reschedule_date?: string | null;
  use_last_completed_visit: boolean;
}

export interface RandomizeSubjectData {
  subject_id: string;
  randomization_id: string;
  randomization_date: string;
}

export interface TransferSubjectData {
  subject_id: string;
  to_site_id: string;
  transfer_date: string;
  reason?: string | null;
  comments?: string | null;
}

// =============================================
// PSDV / CRF Tracking Types
// =============================================

export interface CrfTracking {
  id: string;
  company_id: string;
  site_visit_id: string;
  subject_visit_id: string;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  source_verified: boolean;
  retrieved: boolean;
  page_numbers_verified: string | null;
  charts_reviewed_date: string | null;
  forms_signed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrfTrackingWithRelations extends CrfTracking {
  site_visit?: { id: string; visit_name: string; visit_start: string; visit_type: string };
  subject_visit?: { id: string; visit_name: string; subject_id: string; visit_type: string };
}

export interface UpdateCrfTrackingData {
  id: string;
  source_verified?: boolean;
  retrieved?: boolean;
  page_numbers_verified?: string | null;
  charts_reviewed_date?: string | null;
  forms_signed_date?: string | null;
}

export interface ProtocolPsdvData {
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
}

export interface RegionPsdvData {
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
}

export interface SitePsdvData {
  sdv_policy?: SdvPolicy;
  psdv_initial_subjects_count?: number | null;
  psdv_subject_auto_select_rate?: number | null;
  use_cdms_auto_select_rule?: boolean;
}

export interface TemplateVisitPsdvData {
  sdv_required?: boolean;
  page_numbers_to_verify?: string | null;
}

// Filter Types
export interface SubjectFilters {
  site_id?: string;
  protocol_id?: string;
  status?: SubjectStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SubjectVisitTemplateFilters {
  protocol_id?: string;
  status?: TemplateStatus | 'all';
  is_active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SubjectVisitFilters {
  subject_id?: string;
  site_id?: string;
  visit_type?: VisitType | 'all';
  status?: VisitStatus | 'all';
  page?: number;
  pageSize?: number;
}
