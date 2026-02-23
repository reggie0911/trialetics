export type RetentionStatus = 'on_track' | 'at_risk' | 'missed' | 'completed' | 'withdrawn';
export type EngagementActivityType =
  | 'reminder' | 'follow_up' | 'travel_support' | 'incentive'
  | 'wellness_check' | 'reschedule' | 'other';
export type EngagementChannel = 'phone' | 'email' | 'sms' | 'in_person' | 'portal';
export type EngagementOutcome = 'successful' | 'no_answer' | 'rescheduled' | 'declined' | 'not_applicable';
export type RiskSeverity = 'low' | 'medium' | 'high';

export const RETENTION_STATUS_LABELS: Record<RetentionStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  missed: 'Missed',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
};

export const ACTIVITY_TYPE_LABELS: Record<EngagementActivityType, string> = {
  reminder: 'Reminder',
  follow_up: 'Follow-Up',
  travel_support: 'Travel Support',
  incentive: 'Incentive',
  wellness_check: 'Wellness Check',
  reschedule: 'Reschedule',
  other: 'Other',
};

export const CHANNEL_LABELS: Record<EngagementChannel, string> = {
  phone: 'Phone',
  email: 'Email',
  sms: 'SMS',
  in_person: 'In Person',
  portal: 'Portal',
};

export const OUTCOME_LABELS: Record<EngagementOutcome, string> = {
  successful: 'Successful',
  no_answer: 'No Answer',
  rescheduled: 'Rescheduled',
  declined: 'Declined',
  not_applicable: 'N/A',
};

export const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export interface RetentionMilestone {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  visit_number: number | null;
  expected_day: number | null;
  description: string | null;
  is_critical: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectRetentionStatus {
  id: string;
  company_id: string;
  subject_id: string;
  milestone_id: string;
  status: RetentionStatus;
  actual_date: string | null;
  days_variance: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subject?: { id: string; subject_id: string } | null;
}

export interface EngagementActivity {
  id: string;
  company_id: string;
  protocol_id: string;
  subject_id: string | null;
  activity_type: EngagementActivityType;
  channel: EngagementChannel;
  performed_by_id: string | null;
  performed_at: string;
  outcome: EngagementOutcome | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionRiskFactor {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  description: string | null;
  severity: RiskSeverity;
  auto_detect_rule: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectRiskFlag {
  id: string;
  company_id: string;
  subject_id: string;
  risk_factor_id: string;
  flagged_at: string;
  resolved_at: string | null;
  resolved_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  risk_factor?: RetentionRiskFactor | null;
  subject?: { id: string; subject_id: string } | null;
}

export interface RetentionMetric {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string | null;
  period_start: string;
  period_end: string;
  enrolled: number;
  active: number;
  withdrawn: number;
  completed: number;
  retention_rate: number | null;
  screen_fail_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMilestoneInput {
  protocol_id: string;
  name: string;
  visit_number?: number;
  expected_day?: number;
  description?: string;
  is_critical?: boolean;
  sort_order?: number;
}

export interface CreateEngagementActivityInput {
  protocol_id: string;
  subject_id?: string;
  activity_type: EngagementActivityType;
  channel: EngagementChannel;
  outcome?: EngagementOutcome;
  notes?: string;
}

export interface CreateRiskFactorInput {
  protocol_id: string;
  name: string;
  description?: string;
  severity?: RiskSeverity;
}

export interface CreateRiskFlagInput {
  subject_id: string;
  risk_factor_id: string;
  notes?: string;
}

export interface EngagementFilters {
  protocolId?: string;
  subjectId?: string;
  activityType?: EngagementActivityType | 'all';
  channel?: EngagementChannel | 'all';
  page?: number;
  pageSize?: number;
}

export interface RetentionDashboardData {
  total_enrolled: number;
  total_active: number;
  total_withdrawn: number;
  total_completed: number;
  retention_rate: number;
  at_risk_count: number;
  open_risk_flags: number;
}
