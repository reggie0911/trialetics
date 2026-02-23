export type ResourceAssignmentStatus = 'active' | 'planned' | 'completed';

export const ASSIGNMENT_STATUS_LABELS: Record<ResourceAssignmentStatus, string> = {
  active: 'Active',
  planned: 'Planned',
  completed: 'Completed',
};

export interface ResourceAssignment {
  id: string;
  company_id: string;
  profile_id: string;
  protocol_id: string | null;
  role: string;
  allocation_percentage: number;
  start_date: string | null;
  end_date: string | null;
  status: ResourceAssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
}

export interface ResourceCapacity {
  id: string;
  company_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  available_hours: number;
  allocated_hours: number;
  utilization_pct: number;
  created_at: string;
  updated_at: string;
  profile?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface ResourceForecast {
  id: string;
  company_id: string;
  protocol_id: string | null;
  role: string;
  needed_fte: number;
  filled_fte: number;
  gap_fte: number;
  forecast_period_start: string;
  forecast_period_end: string;
  notes: string | null;
  created_at: string;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
}

export interface CreateResourceAssignmentInput {
  profile_id: string;
  protocol_id?: string;
  role: string;
  allocation_percentage?: number;
  start_date?: string;
  end_date?: string;
  status?: ResourceAssignmentStatus;
  notes?: string;
}

export interface UpdateResourceAssignmentInput {
  role?: string;
  allocation_percentage?: number;
  start_date?: string;
  end_date?: string;
  status?: ResourceAssignmentStatus;
  notes?: string;
}

export interface ResourceFilters {
  status?: ResourceAssignmentStatus | 'all';
  protocol_id?: string;
  profile_id?: string;
  role?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ResourceUtilizationSummary {
  total_staff: number;
  fully_allocated: number;
  partially_allocated: number;
  unallocated: number;
  avg_utilization_pct: number;
  total_assignments: number;
  active_assignments: number;
}
