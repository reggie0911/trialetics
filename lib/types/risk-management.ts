export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ResolutionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const RISK_CATEGORIES = [
  'quality',
  'safety',
  'regulatory',
  'operational',
  'financial',
  'data_integrity',
  'compliance',
  'ethics',
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  quality: 'Quality',
  safety: 'Safety',
  regulatory: 'Regulatory',
  operational: 'Operational',
  financial: 'Financial',
  data_integrity: 'Data Integrity',
  compliance: 'Compliance',
  ethics: 'Ethics',
};

export interface ProtocolRisk {
  id: string;
  company_id: string;
  protocol_id: string;
  title: string;
  description: string | null;
  risk_level: RiskLevel | null;
  status: RiskStatus;
  category: RiskCategory | null;
  likelihood: number | null;
  impact: number | null;
  identified_date: string | null;
  resolved_date: string | null;
  kri_link_id: string | null;
  governance_review_date: string | null;
  last_reviewed_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolutionActivity {
  id: string;
  company_id: string;
  protocol_risk_id: string;
  name: string;
  description: string | null;
  status: ResolutionStatus;
  due_date: string | null;
  completed_date: string | null;
  assigned_to_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RiskRegisterSummary {
  protocol_id: string;
  company_id: string;
  total_risks: number;
  open_risks: number;
  in_progress_risks: number;
  resolved_risks: number;
  closed_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  last_updated: string | null;
}

export interface RiskDashboardFilters {
  protocolId?: string;
  status?: RiskStatus | 'all';
  riskLevel?: RiskLevel | 'all';
  category?: RiskCategory | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RiskHeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
  risks: { id: string; title: string; status: RiskStatus }[];
}

export interface RiskTrendPoint {
  date: string;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}
