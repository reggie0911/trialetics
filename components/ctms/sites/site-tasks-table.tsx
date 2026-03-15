'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
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
import type { TaskWithRelations } from '@/lib/types/tasks';
import { TASK_PRIORITY_OPTIONS } from '@/lib/types/tasks';
import { UpdateAssigneeTaskModal } from '@/components/ctms/tasks/update-assignee-task-modal';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function assigneeDisplay(task: TaskWithRelations): string {
  const p = task.profiles;
  if (!p) return '—';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
}

interface SiteTasksTableProps {
  tasks: TaskWithRelations[];
  onRefresh: () => void;
  isAdmin?: boolean;
}

export function SiteTasksTable({ tasks, onRefresh, isAdmin = false }: SiteTasksTableProps) {
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const handleEditSuccess = () => {
    setEditTaskId(null);
    onRefresh();
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
        <p>No tasks assigned to this site.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="text-xs">Task Name</TableHead>
              <TableHead className="text-xs">Milestone</TableHead>
              <TableHead className="text-xs">Assigned to</TableHead>
              <TableHead className="text-xs">Due Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Priority</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task, idx) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{idx + 1}</TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.study_milestones?.name ?? '—'}
                </TableCell>
                <TableCell>{assigneeDisplay(task)}</TableCell>
                <TableCell>
                  {formatDate(task.due_date)}
                  {task.due_date && new Date(task.due_date) < new Date() && (
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
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTaskId(task.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editTaskId && (
        <UpdateAssigneeTaskModal
          taskId={editTaskId}
          open={true}
          onOpenChange={(open) => !open && setEditTaskId(null)}
          onSuccess={handleEditSuccess}
          isAdmin={isAdmin}
          staticSiteContext={true}
        />
      )}
    </>
  );
}
