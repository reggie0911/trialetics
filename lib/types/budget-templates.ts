// =============================================
// Budget Templates Types
// GAP P4: Budget Templates
// =============================================

export type BudgetTemplateItemCategory =
  | 'site_costs' | 'personnel' | 'travel' | 'vendor' | 'other'
  | 'screening' | 'treatment' | 'follow_up' | 'lab' | 'imaging'
  | 'pass_through' | 'startup' | 'closeout';

export const BUDGET_TEMPLATE_ITEM_CATEGORIES: { value: BudgetTemplateItemCategory; label: string }[] = [
  { value: 'site_costs', label: 'Site Costs' },
  { value: 'personnel', label: 'Personnel' },
  { value: 'travel', label: 'Travel' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'screening', label: 'Screening' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'lab', label: 'Lab' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'pass_through', label: 'Pass-Through' },
  { value: 'startup', label: 'Startup' },
  { value: 'closeout', label: 'Closeout' },
  { value: 'other', label: 'Other' },
];

export const BUDGET_CATEGORY_LABELS: Record<BudgetTemplateItemCategory, string> = Object.fromEntries(
  BUDGET_TEMPLATE_ITEM_CATEGORIES.map(c => [c.value, c.label])
) as Record<BudgetTemplateItemCategory, string>;

export type BudgetTemplateStatus = 'draft' | 'active' | 'archived';

export const BUDGET_TEMPLATE_STATUS_LABELS: Record<BudgetTemplateStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export interface BudgetTemplate {
  id: string;
  company_id: string;
  protocol_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  version: number;
  status: BudgetTemplateStatus;
  created_at: string;
  updated_at: string;
}

export interface BudgetTemplateWithRelations extends BudgetTemplate {
  protocol?: { protocol_number: string; title: string } | null;
  items?: BudgetTemplateItem[];
}

export interface BudgetTemplateItem {
  id: string;
  template_id: string;
  category: BudgetTemplateItemCategory;
  subcategory: string | null;
  description: string | null;
  amount: number;
  currency: string;
  sort_order: number;
  created_at: string;
}

export interface CreateBudgetTemplateData {
  protocol_id?: string | null;
  name: string;
  description?: string | null;
  is_default?: boolean;
}

export interface UpdateBudgetTemplateData {
  name?: string;
  description?: string | null;
  is_default?: boolean;
  status?: BudgetTemplateStatus;
  version?: number;
}

export interface CreateBudgetTemplateItemData {
  template_id: string;
  category: BudgetTemplateItemCategory;
  subcategory?: string | null;
  description?: string | null;
  amount: number;
  currency?: string;
  sort_order?: number;
}

export interface UpdateBudgetTemplateItemData {
  category?: BudgetTemplateItemCategory;
  subcategory?: string | null;
  description?: string | null;
  amount?: number;
  currency?: string;
  sort_order?: number;
}
