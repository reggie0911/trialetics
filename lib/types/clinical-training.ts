// =============================================
// Clinical Training Module Types
// Per Oracle CTMS: Managing Clinical Training
// =============================================

// Roles that can be assigned to training topics (match protocol_contacts.role)
export type TrainingTopicRole =
  | 'principal_investigator'
  | 'sub_investigator'
  | 'coordinator'
  | 'site_staff'
  | 'sponsor_rep'
  | 'cro_rep'
  | 'medical_monitor'
  | 'project_manager'
  | 'data_manager'
  | 'regulatory_lead'
  | 'qa_lead'
  | 'lab_director'
  | 'finance'
  | 'contracts'
  | 'other';

export type TrainingPlanProcessStatus = 'not_started' | 'publishing' | 'published' | 'failed';

export type TrainingPlanVersionStatus = 'draft' | 'approved' | 'archived';

export type TrainingPlanCriteriaScope = 'all' | 'specific';

export type SiteTrainingTopicSource = 'from_plan' | 'manual';

export const TRAINING_TOPIC_ROLE_LABELS: Record<string, string> = {
  principal_investigator: 'Principal Investigator',
  sub_investigator: 'Sub-Investigator',
  coordinator: 'Coordinator',
  site_staff: 'Site Staff',
  sponsor_rep: 'Sponsor Representative',
  cro_rep: 'CRO Representative',
  medical_monitor: 'Medical Monitor',
  project_manager: 'Project Manager',
  data_manager: 'Data Manager',
  regulatory_lead: 'Regulatory Lead',
  qa_lead: 'QA Lead',
  lab_director: 'Lab Director',
  finance: 'Finance',
  contracts: 'Contracts',
  other: 'Other',
};

export const TRAINING_PLAN_PROCESS_STATUS_LABELS: Record<TrainingPlanProcessStatus, string> = {
  not_started: 'Not Started',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
};

export const TRAINING_PLAN_VERSION_STATUS_LABELS: Record<TrainingPlanVersionStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  archived: 'Archived',
};

export const DURATION_UNIT_LABELS: Record<string, string> = {
  minutes: 'Minutes',
  hours: 'Hours',
  days: 'Days',
};

// =============================================
// Core Entity Interfaces
// =============================================

export interface TrainingTopic {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  role: string[];
  description: string | null;
  mandatory: boolean;
  duration: number | null;
  duration_unit: string | null;
  obsolete_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  process_status: TrainingPlanProcessStatus;
  obsolete_date: string | null;
  sites_processed: number;
  total_sites: number;
  publish_result: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanCriteria {
  id: string;
  training_plan_id: string;
  scope: TrainingPlanCriteriaScope;
  indication: string | null;
  trial_phase: string | null;
  site_status: string | null;
  protocol_id: string | null;
  region_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanVersion {
  id: string;
  training_plan_id: string;
  version_number: number;
  name: string;
  status: TrainingPlanVersionStatus;
  published_date: string | null;
  archived_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanVersionTopic {
  id: string;
  version_id: string;
  training_topic_id: string;
  created_at: string;
}

export interface SiteTrainingPlan {
  id: string;
  clinical_site_id: string;
  training_plan_version_id: string;
  created_at: string;
}

export interface SiteTrainingTopic {
  id: string;
  clinical_site_id: string;
  training_topic_id: string;
  source: SiteTrainingTopicSource;
  created_at: string;
}

export interface ContactTrainingCompletion {
  id: string;
  protocol_contact_id: string;
  site_training_topic_id: string;
  completed: boolean;
  completed_date: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// With Relations
// =============================================

export interface TrainingTopicWithPlanCount extends TrainingTopic {
  plan_count?: number;
}

export interface TrainingPlanWithVersions extends TrainingPlan {
  versions?: TrainingPlanVersionWithTopics[];
}

export interface TrainingPlanVersionWithTopics extends TrainingPlanVersion {
  topics?: TrainingTopic[];
}

export interface SiteTrainingTopicWithDetails extends SiteTrainingTopic {
  topic?: TrainingTopic;
  contacts_completed?: number;
  contacts_not_completed?: number;
}

export interface ContactTrainingCompletionWithDetails extends ContactTrainingCompletion {
  protocol_contact?: { id: string; contact?: { first_name: string; last_name: string; email: string | null } };
  site_training_topic?: { training_topic?: TrainingTopic };
}

// =============================================
// Summary Views
// =============================================

export interface ProtocolTrainingSummary {
  protocol_id: string;
  company_id: string;
  protocol_number: string;
  title: string;
  total_trainings: number;
  trainings_completed: number;
  total_sites: number;
}

export interface RegionTrainingSummary {
  region_id: string;
  company_id: string;
  region_name: string;
  protocol_id: string | null;
  total_trainings: number;
  trainings_completed: number;
  total_sites: number;
}

// =============================================
// Create/Update Input Types
// =============================================

export interface CreateTrainingTopicInput {
  company_id: string;
  name: string;
  category?: string | null;
  role?: string[];
  description?: string | null;
  mandatory?: boolean;
  duration?: number | null;
  duration_unit?: string | null;
}

export interface UpdateTrainingTopicInput extends Partial<Omit<CreateTrainingTopicInput, 'company_id'>> {
  obsolete_date?: string | null;
}

export interface CreateTrainingPlanInput {
  company_id: string;
  name: string;
  description?: string | null;
}

export interface UpdateTrainingPlanInput extends Partial<CreateTrainingPlanInput> {
  obsolete_date?: string | null;
}

export interface CreateTrainingPlanCriteriaInput {
  training_plan_id: string;
  scope: TrainingPlanCriteriaScope;
  indication?: string | null;
  trial_phase?: string | null;
  site_status?: string | null;
  protocol_id?: string | null;
  region_id?: string | null;
}

export interface CreateTrainingPlanVersionInput {
  training_plan_id: string;
  name: string;
  status?: TrainingPlanVersionStatus;
}

export interface UpdateTrainingPlanVersionInput {
  name?: string;
  status?: TrainingPlanVersionStatus;
}
