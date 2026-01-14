export interface Todo {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TodoFormData {
  title: string;
  description: string;
  due_date: string | null;
  tags: string[];
}

export const TAG_COLORS: Record<string, 'destructive' | 'secondary' | 'default'> = {
  'Today': 'destructive',
  'Tomorrow': 'secondary',
  'To-do': 'secondary',
  'Meeting': 'secondary',
  'Important': 'destructive',
  'Urgent': 'destructive',
  'Yesterday': 'secondary',
  'This Week': 'secondary',
  'Overdue': 'destructive',
};

export const PREDEFINED_TAGS = [
  'Today',
  'Tomorrow',
  'This Week',
  'To-do',
  'Meeting',
  'Important',
  'Urgent',
] as const;
