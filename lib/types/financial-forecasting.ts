export type BudgetCategory = 'site_costs' | 'personnel' | 'travel' | 'vendor' | 'other';

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  site_costs: 'Site Costs',
  personnel: 'Personnel',
  travel: 'Travel',
  vendor: 'Vendor',
  other: 'Other',
};

export interface BudgetLineItem {
  id: string;
  company_id: string;
  protocol_id: string;
  category: BudgetCategory;
  subcategory: string | null;
  description: string | null;
  budgeted_amount: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
}

export interface SpendActual {
  id: string;
  company_id: string;
  budget_line_item_id: string | null;
  protocol_id: string;
  amount: number;
  spend_date: string;
  description: string | null;
  payment_record_id: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
  budget_line_items?: { id: string; description: string | null; category: string } | null;
}

export interface SpendForecast {
  id: string;
  company_id: string;
  protocol_id: string;
  forecast_date: string;
  forecasted_by_id: string | null;
  forecast_name: string | null;
  forecast_period_start: string;
  forecast_period_end: string;
  total_forecasted_spend: number | null;
  assumptions: Record<string, unknown>;
  line_item_forecasts: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
}

export interface VarianceReport {
  id: string;
  company_id: string;
  protocol_id: string;
  report_date: string;
  period_start: string;
  period_end: string;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number | null;
  category_breakdown: Record<string, unknown>;
  generated_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
}

export interface BudgetVsActualSummary {
  total_budgeted: number;
  total_actual: number;
  total_remaining: number;
  variance_amount: number;
  variance_percentage: number | null;
}
