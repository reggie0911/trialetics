export type StartupChecklistStatus = 'not_started' | 'in_progress' | 'completed';
export type StartupStepCategory = 'feasibility' | 'regulatory' | 'irb' | 'contract' | 'siv' | 'other';
export type StartupStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'not_applicable';

export const STARTUP_CHECKLIST_STATUS_LABELS: Record<StartupChecklistStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const STARTUP_STEP_CATEGORY_LABELS: Record<StartupStepCategory, string> = {
  feasibility: 'Feasibility',
  regulatory: 'Regulatory',
  irb: 'IRB/EC',
  contract: 'Contract',
  siv: 'Site Initiation Visit',
  other: 'Other',
};

export const STARTUP_STEP_STATUS_LABELS: Record<StartupStepStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  not_applicable: 'N/A',
};

export interface SiteStartupChecklist {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string;
  template_name: string;
  status: StartupChecklistStatus;
  started_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  site?: { id: string; site_number: string | null; organization?: { name: string } | null } | null;
  steps?: SiteStartupStep[];
}

export interface SiteStartupStep {
  id: string;
  checklist_id: string;
  company_id: string;
  step_name: string;
  step_category: StartupStepCategory;
  sort_order: number;
  is_required: boolean;
  status: StartupStepStatus;
  assigned_to_id: string | null;
  target_date: string | null;
  completed_date: string | null;
  blocker_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_STARTUP_STEPS: { step_name: string; step_category: StartupStepCategory; sort_order: number }[] = [
  { step_name: 'Site Feasibility Assessment', step_category: 'feasibility', sort_order: 1 },
  { step_name: 'Confidentiality Agreement Executed', step_category: 'feasibility', sort_order: 2 },
  { step_name: 'Site Selection Confirmed', step_category: 'feasibility', sort_order: 3 },
  { step_name: 'Regulatory Package Submitted', step_category: 'regulatory', sort_order: 4 },
  { step_name: 'Regulatory Approval Received', step_category: 'regulatory', sort_order: 5 },
  { step_name: 'IRB/EC Submission', step_category: 'irb', sort_order: 6 },
  { step_name: 'IRB/EC Approval Received', step_category: 'irb', sort_order: 7 },
  { step_name: 'Clinical Trial Agreement Drafted', step_category: 'contract', sort_order: 8 },
  { step_name: 'Budget Negotiation Complete', step_category: 'contract', sort_order: 9 },
  { step_name: 'Clinical Trial Agreement Executed', step_category: 'contract', sort_order: 10 },
  { step_name: 'Site Initiation Visit Scheduled', step_category: 'siv', sort_order: 11 },
  { step_name: 'Site Initiation Visit Completed', step_category: 'siv', sort_order: 12 },
  { step_name: 'Site Activated for Enrollment', step_category: 'other', sort_order: 13 },
];
