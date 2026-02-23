export type ActionItemStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ActionItemPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActionItemSourceType = 'trip_report' | 'monitoring' | 'general' | 'irb' | 'vendor' | 'kri';

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ACTION_ITEM_PRIORITY_LABELS: Record<ActionItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ACTION_ITEM_SOURCE_LABELS: Record<ActionItemSourceType, string> = {
  trip_report: 'Trip Report',
  monitoring: 'Monitoring',
  general: 'General',
  irb: 'IRB/EC',
  vendor: 'Vendor',
  kri: 'KRI Alert',
};

export interface ActionItem {
  id: string;
  company_id: string;
  protocol_id: string | null;
  title: string;
  description: string | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  category: string | null;
  source_type: ActionItemSourceType;
  source_id: string | null;
  assigned_to_id: string | null;
  assigned_by_id: string | null;
  due_date: string | null;
  resolved_date: string | null;
  resolution_notes: string | null;
  escalated: boolean;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_to?: { id: string; first_name: string | null; last_name: string | null } | null;
  assigned_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
}

export interface CreateActionItemInput {
  title: string;
  description?: string;
  priority?: ActionItemPriority;
  category?: string;
  source_type?: ActionItemSourceType;
  source_id?: string;
  protocol_id?: string;
  assigned_to_id?: string;
  due_date?: string;
}

export interface UpdateActionItemInput {
  title?: string;
  description?: string;
  status?: ActionItemStatus;
  priority?: ActionItemPriority;
  category?: string;
  assigned_to_id?: string | null;
  due_date?: string | null;
  resolution_notes?: string;
  escalated?: boolean;
}

export interface ActionItemFilters {
  search?: string;
  status?: ActionItemStatus | 'all';
  priority?: ActionItemPriority | 'all';
  source_type?: ActionItemSourceType | 'all';
  assigned_to_id?: string;
  protocol_id?: string;
  overdue_only?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ActionItemStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  overdue: number;
  critical: number;
}
