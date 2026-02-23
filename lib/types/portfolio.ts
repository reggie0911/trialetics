export type PortfolioHealth = 'on_track' | 'at_risk' | 'critical';

export const PORTFOLIO_HEALTH_LABELS: Record<PortfolioHealth, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  critical: 'Critical',
};

export interface PortfolioView {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  protocol_ids: string[];
  view_config: Record<string, unknown>;
  is_default: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface PortfolioKPISnapshot {
  id: string;
  company_id: string;
  protocol_id: string;
  snapshot_date: string;
  enrollment_actual: number;
  enrollment_target: number;
  site_count: number;
  active_sites: number;
  budget_total: number;
  budget_spent: number;
  open_deviations: number;
  open_action_items: number;
  kri_alerts_active: number;
  overall_health: PortfolioHealth;
  created_at: string;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
}

export interface CreatePortfolioViewInput {
  name: string;
  description?: string;
  protocol_ids: string[];
  view_config?: Record<string, unknown>;
  is_default?: boolean;
}

export interface UpdatePortfolioViewInput {
  name?: string;
  description?: string;
  protocol_ids?: string[];
  view_config?: Record<string, unknown>;
  is_default?: boolean;
}

export interface PortfolioFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PortfolioSummary {
  total_protocols: number;
  on_track: number;
  at_risk: number;
  critical: number;
  total_enrollment_actual: number;
  total_enrollment_target: number;
  total_budget: number;
  total_spent: number;
}
