export type FeasibilityStudyStatus = 'draft' | 'in_progress' | 'completed' | 'archived';
export type FeasibilityCriteriaCategory =
  | 'therapeutic_experience'
  | 'patient_population'
  | 'regulatory'
  | 'infrastructure'
  | 'investigator'
  | 'logistics';
export type EvaluationStatus = 'pending' | 'in_progress' | 'scored' | 'selected' | 'rejected';
export type SelectionDecision = 'selected' | 'backup' | 'rejected' | 'deferred';

export const FEASIBILITY_STATUS_LABELS: Record<FeasibilityStudyStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const CRITERIA_CATEGORY_LABELS: Record<FeasibilityCriteriaCategory, string> = {
  therapeutic_experience: 'Therapeutic Experience',
  patient_population: 'Patient Population',
  regulatory: 'Regulatory',
  infrastructure: 'Infrastructure',
  investigator: 'Investigator',
  logistics: 'Logistics',
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  scored: 'Scored',
  selected: 'Selected',
  rejected: 'Rejected',
};

export const SELECTION_DECISION_LABELS: Record<SelectionDecision, string> = {
  selected: 'Selected',
  backup: 'Backup',
  rejected: 'Rejected',
  deferred: 'Deferred',
};

export interface FeasibilityStudy {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  description: string | null;
  status: FeasibilityStudyStatus;
  criteria_weights: Record<string, unknown>;
  created_by_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  criteria?: FeasibilityCriterion[];
  evaluations?: FeasibilitySiteEvaluation[];
}

export interface FeasibilityCriterion {
  id: string;
  company_id: string;
  feasibility_study_id: string;
  name: string;
  description: string | null;
  category: FeasibilityCriteriaCategory;
  weight: number;
  max_score: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeasibilitySiteEvaluation {
  id: string;
  company_id: string;
  feasibility_study_id: string;
  organization_id: string;
  evaluator_id: string | null;
  status: EvaluationStatus;
  overall_score: number | null;
  notes: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string } | null;
  scores?: FeasibilityCriterionScore[];
}

export interface FeasibilityCriterionScore {
  id: string;
  company_id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  justification: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSelectionDecisionRecord {
  id: string;
  company_id: string;
  feasibility_study_id: string;
  organization_id: string;
  decision: SelectionDecision;
  rationale: string | null;
  decided_by_id: string | null;
  decided_at: string;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string } | null;
}

export interface CreateFeasibilityStudyInput {
  protocol_id: string;
  name: string;
  description?: string;
}

export interface UpdateFeasibilityStudyInput {
  name?: string;
  description?: string;
  status?: FeasibilityStudyStatus;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface CreateFeasibilityCriterionInput {
  feasibility_study_id: string;
  name: string;
  description?: string;
  category: FeasibilityCriteriaCategory;
  weight?: number;
  max_score?: number;
  sort_order?: number;
}

export interface CreateEvaluationInput {
  feasibility_study_id: string;
  organization_id: string;
}

export interface UpdateEvaluationInput {
  status?: EvaluationStatus;
  overall_score?: number | null;
  notes?: string | null;
}

export interface SaveScoreInput {
  evaluation_id: string;
  criterion_id: string;
  score: number;
  justification?: string;
}

export interface CreateSelectionDecisionInput {
  feasibility_study_id: string;
  organization_id: string;
  decision: SelectionDecision;
  rationale?: string;
}

export interface FeasibilityFilters {
  protocolId?: string;
  status?: FeasibilityStudyStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FeasibilityRanking {
  organization_id: string;
  organization_name: string;
  overall_score: number;
  weighted_score: number;
  evaluation_status: EvaluationStatus;
  decision?: SelectionDecision;
  criteria_scores: { criterion_name: string; score: number; max: number; weight: number }[];
}
