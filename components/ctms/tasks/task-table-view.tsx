'use client';

import { useState, Fragment } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudyMilestoneWithProgress } from '@/lib/types/tasks';
import type { TaskWithRelations } from '@/lib/types/tasks';
import { TASK_PRIORITY_OPTIONS } from '@/lib/types/tasks';

interface TaskTableViewProps {
  milestones: StudyMilestoneWithProgress[];
  tasks: TaskWithRelations[];
  onEditTask: (taskId: string) => void;
  onRefresh: () => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function assigneeDisplay(task: TaskWithRelations): string {
  const p = task.profiles;
  if (!p) return 'Team member';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Team member';
}

function siteDisplay(task: TaskWithRelations): string {
  return task.study_sites?.name ?? 'Missing Site Name';
}

export function TaskTableView({
  milestones,
  tasks,
  onEditTask,
  onRefresh,
}: TaskTableViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(milestones.map((m) => m.id)));

  const toggleExpanded = (milestoneId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-xs">#</TableHead>
            <TableHead className="text-xs">Task Name</TableHead>
            <TableHead className="text-xs">Site Name</TableHead>
            <TableHead className="text-xs">Assigned to</TableHead>
            <TableHead className="text-xs">Due Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Priority</TableHead>
            <TableHead className="text-xs">Task Completed</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.map((milestone, idx) => {
            const childTasks = tasks.filter((t) => t.milestone_id === milestone.id);
            const isExpanded = expanded.has(milestone.id);
            const assigneeCount = childTasks.filter((t) => t.assigned_to).length;
            const dueDate = milestone.planned_due_date;
            const isOverdue = dueDate && new Date(dueDate) < new Date();

            return (
              <Fragment key={milestone.id}>
                <TableRow
                  key={milestone.id}
                  className="bg-muted/40 hover:bg-muted/60"
                >
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{milestone.name}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(milestone.id)}
                      className="flex items-center gap-1 text-sm hover:text-primary"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>
                        {assigneeCount}: Assignees
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={isOverdue ? 'text-destructive' : ''}>
                      {formatDate(dueDate)}
                      {isOverdue && ' Overdue'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="relative flex items-center min-w-[120px] h-5">
                      <div className="flex-1 h-full rounded-md bg-muted/80 overflow-hidden">
                        <div
                          className="h-full rounded-l-md transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, milestone.progress_pct))}%`,
                            backgroundColor: 'var(--progress-fill, #20b2aa)',
                          }}
                        />
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs tabular-nums font-medium pointer-events-none">
                        <span className="text-foreground/90">{milestone.progress_pct}</span>
                        <span className="text-foreground/50">%</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="text-xs">
                    {milestone.completed_count}/{milestone.total_count}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Edit Milestone (coming soon)</DropdownMenuItem>
                        <DropdownMenuItem disabled>Delete Milestone (coming soon)</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {isExpanded &&
                  childTasks.map((task, childIdx) => (
                    <TableRow key={task.id} className="bg-background">
                      <TableCell className="pl-10 text-muted-foreground">
                        {childIdx + 1}
                      </TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>
                        {task.site_id ? (
                          siteDisplay(task)
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEditTask(task.id)}
                            className="text-destructive hover:underline text-left"
                          >
                            Missing Site Name
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.assigned_to ? (
                          assigneeDisplay(task)
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEditTask(task.id)}
                            className="text-destructive hover:underline text-left"
                          >
                            Missing Name
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(task.due_date)}
                        {task.due_date &&
                          new Date(task.due_date) < new Date() && (
                            <span className="text-destructive ml-1">Overdue</span>
                          )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TASK_PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label ?? task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditTask(task.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      {milestones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm">
          <p>No milestones or tasks match the current filters.</p>
          <p className="mt-1">Create a group task to add a milestone and individual tasks.</p>
        </div>
      )}
    </div>
  );
}
