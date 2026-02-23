export type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskNotificationType = 'assigned' | 'due_soon' | 'overdue' | 'completed' | 'comment';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const TASK_NOTIFICATION_TYPE_LABELS: Record<TaskNotificationType, string> = {
  assigned: 'Task Assigned',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
  completed: 'Completed',
  comment: 'New Comment',
};

export interface ProtocolTask {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  description: string | null;
  budgeted_cost: number | null;
  actual_cost: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  sort_order: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_id: string | null;
  assigned_by_id: string | null;
  depends_on_id: string | null;
  due_date: string | null;
  completion_percentage: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  assigned_to?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  assigned_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  depends_on?: { id: string; name: string } | null;
}

export interface TaskComment {
  id: string;
  company_id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface TaskNotification {
  id: string;
  company_id: string;
  task_id: string;
  recipient_id: string;
  type: TaskNotificationType;
  read: boolean;
  created_at: string;
  task?: { id: string; name: string } | null;
}

export interface CreateTaskInput {
  protocol_id: string;
  name: string;
  description?: string;
  priority?: TaskPriority;
  assigned_to_id?: string;
  due_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  depends_on_id?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to_id?: string | null;
  due_date?: string | null;
  completion_percentage?: number;
  tags?: string[];
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to_id?: string;
  protocol_id?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskStats {
  total: number;
  planned: number;
  in_progress: number;
  completed: number;
  on_hold: number;
  overdue: number;
  critical: number;
  unread_notifications: number;
}
