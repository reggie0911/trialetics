// Task Management types

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type OnTrackStatus = 'on_track' | 'at_risk' | 'off_track';

export interface StudyMilestone {
  id: string;
  study_id: string;
  name: string;
  description: string | null;
  department: string | null;
  planned_start_date: string | null;
  planned_due_date: string | null;
  actual_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudyMilestoneWithProgress extends StudyMilestone {
  completed_count: number;
  total_count: number;
  progress_pct: number;
}

export interface Task {
  id: string;
  study_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  site_id: string | null;
  created_by: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  on_track_status: OnTrackStatus | null;
  planned_start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  study_sites?: { id: string; name: string; site_number: string } | null;
  profiles?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  study_milestones?: { id: string; name: string } | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface TaskCommentWithAuthor extends TaskComment {
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const ON_TRACK_OPTIONS: { value: OnTrackStatus; label: string }[] = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
];
