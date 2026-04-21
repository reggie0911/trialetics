import type { TaskPriority, TaskStatus, TaskWithRelations } from '@/lib/types/tasks';

export type BoardGroupBy = 'status' | 'priority' | 'assignee';

export type BoardSortKey =
  | 'due_asc'
  | 'priority_desc'
  | 'recently_updated'
  | 'title_asc';

export interface BoardColumn {
  /** Stable column id, e.g. `status:in_progress`, `priority:high`, `assignee:<uuid>`, `assignee:unassigned`. */
  id: string;
  title: string;
  /** Tailwind classes for the column accent bar / dot. */
  accentClass: string;
  groupBy: BoardGroupBy;
  /** Field value the column represents — `status` / `priority` value, assignee uuid, or null for unassigned. */
  groupValue: string | null;
  /** True for the closed set of status / priority columns; false for derived assignee columns. */
  fixed: boolean;
  /** Optional WIP cap (cards > this show a soft warning). */
  wipLimit?: number;
}

export interface BoardCardSelection {
  selectedIds: Set<string>;
  toggle: (id: string, additive: boolean) => void;
  clear: () => void;
  has: (id: string) => boolean;
  primary: () => string | null;
}

export const STATUS_COLUMN_DEFS: Array<{
  id: string;
  status: TaskStatus;
  title: string;
  accentClass: string;
}> = [
  {
    id: 'status:not_started',
    status: 'not_started',
    title: 'Not Started',
    accentClass: 'bg-muted-foreground/40',
  },
  {
    id: 'status:in_progress',
    status: 'in_progress',
    title: 'In Progress',
    accentClass: 'bg-amber-500',
  },
  {
    id: 'status:completed',
    status: 'completed',
    title: 'Completed',
    accentClass: 'bg-emerald-500',
  },
  {
    id: 'status:blocked',
    status: 'blocked',
    title: 'Blocked',
    accentClass: 'bg-destructive',
  },
];

export const PRIORITY_COLUMN_DEFS: Array<{
  id: string;
  priority: TaskPriority;
  title: string;
  accentClass: string;
}> = [
  {
    id: 'priority:critical',
    priority: 'critical',
    title: 'Critical',
    accentClass: 'bg-destructive',
  },
  {
    id: 'priority:high',
    priority: 'high',
    title: 'High',
    accentClass: 'bg-amber-500',
  },
  {
    id: 'priority:medium',
    priority: 'medium',
    title: 'Medium',
    accentClass: 'bg-sky-500',
  },
  {
    id: 'priority:low',
    priority: 'low',
    title: 'Low',
    accentClass: 'bg-muted-foreground/40',
  },
];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortTasks(
  tasks: TaskWithRelations[],
  key: BoardSortKey,
): TaskWithRelations[] {
  const copy = [...tasks];
  switch (key) {
    case 'due_asc':
      copy.sort((a, b) => {
        const ad = a.due_date ?? '';
        const bd = b.due_date ?? '';
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad.localeCompare(bd);
      });
      break;
    case 'priority_desc':
      copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      break;
    case 'recently_updated':
      copy.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
      break;
    case 'title_asc':
      copy.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return copy;
}

export const SORT_OPTIONS: Array<{ value: BoardSortKey; label: string }> = [
  { value: 'due_asc', label: 'Due date (earliest)' },
  { value: 'priority_desc', label: 'Priority (highest)' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'title_asc', label: 'Title (A→Z)' },
];

export function profileDisplayName(p: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
} | null | undefined): string {
  if (!p) return 'Unassigned';
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return full || p.email || 'Unassigned';
}

export function profileInitials(p: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
} | null | undefined): string {
  if (!p) return '?';
  const f = (p.first_name ?? '').trim();
  const l = (p.last_name ?? '').trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || '?';
  return (p.email ?? '?').charAt(0).toUpperCase();
}
