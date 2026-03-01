// =============================================
// Site Budget Types
// GAP S1: Site-Specific Budgets from Template
// =============================================

export type SiteBudgetStatus = 'draft' | 'negotiating' | 'approved' | 'active' | 'closed';

export const SITE_BUDGET_STATUS_LABELS: Record<SiteBudgetStatus, string> = {
  draft: 'Draft',
  negotiating: 'Negotiating',
  approved: 'Approved',
  active: 'Active',
  closed: 'Closed',
};

export interface SiteBudget {
  id: string;
  company_id: string;
  site_id: string;
  protocol_id: string;
  budget_template_id: string | null;
  name: string | null;
  status: SiteBudgetStatus;
  total_budgeted: number;
  currency_code: string;
  approved_by_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteBudgetWithRelations extends SiteBudget {
  site?: { site_number: string | null } | { site_number: string | null }[];
  protocol?: { protocol_number: string; title: string } | { protocol_number: string; title: string }[];
  budget_template?: { name: string } | null;
  approved_by?: { first_name: string | null; last_name: string | null } | null;
  items?: SiteBudgetItem[];
}

export interface SiteBudgetItem {
  id: string;
  site_budget_id: string;
  template_item_id: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  budgeted_amount: number;
  actual_amount: number;
  currency: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSiteBudgetData {
  site_id: string;
  protocol_id: string;
  budget_template_id?: string | null;
  name?: string | null;
  currency_code?: string;
  notes?: string | null;
}

export interface UpdateSiteBudgetData {
  name?: string | null;
  status?: SiteBudgetStatus;
  total_budgeted?: number;
  notes?: string | null;
}

export interface CreateSiteBudgetItemData {
  site_budget_id: string;
  template_item_id?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  budgeted_amount: number;
  currency?: string;
  sort_order?: number;
}

export interface UpdateSiteBudgetItemData {
  category?: string;
  subcategory?: string | null;
  description?: string | null;
  budgeted_amount?: number;
  actual_amount?: number;
  sort_order?: number;
}

export interface SiteBudgetVsActualSummary {
  total_budgeted: number;
  total_actual: number;
  total_remaining: number;
  variance_percentage: number | null;
  items: Array<{
    category: string;
    budgeted: number;
    actual: number;
    remaining: number;
  }>;
}
