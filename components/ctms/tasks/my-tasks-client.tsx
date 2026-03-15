'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateTaskModal } from './create-task-modal';
import { UpdateAssigneeTaskModal } from './update-assignee-task-modal';
import type { TaskWithRelations } from '@/lib/types/tasks';
import { TASK_PRIORITY_OPTIONS } from '@/lib/types/tasks';
import type { TaskDashboardCounts } from '@/lib/actions/tasks';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

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

interface MyTasksClientProps {
  initialTasks: TaskWithRelations[];
  initialCounts: TaskDashboardCounts;
  studies: { id: string; title: string }[];
  profileId: string;
  isAdmin?: boolean;
}

export function MyTasksClient({
  initialTasks,
  initialCounts,
  studies,
  profileId,
  isAdmin = false,
}: MyTasksClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const filteredTasks = initialTasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  // On My Tasks, Description / Site / Assignee are always editable (tasks shown are assigned to the current user)
  const staticDescriptionSiteAndAssignee = false;

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCreateSuccess = useCallback(() => {
    setCreateModalOpen(false);
    refresh();
  }, [refresh]);

  const handleEditSuccess = useCallback(() => {
    setEditTaskId(null);
    refresh();
  }, [refresh]);

  const summaryCards = [
    { label: 'Total Tasks', value: initialCounts.total, key: 'total', markerColor: null as string | null },
    { label: 'Not Started', value: initialCounts.not_started, key: 'not_started', markerColor: 'bg-muted-foreground/50' },
    { label: 'In Progress', value: initialCounts.in_progress, key: 'in_progress', markerColor: 'bg-amber-500' },
    { label: 'Completed', value: initialCounts.completed, key: 'completed', markerColor: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-lg">
        <CardContent className="px-4 flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {summaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key === 'total' ? 'all' : card.key)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                statusFilter === (card.key === 'total' ? 'all' : card.key)
                  ? 'text-primary'
                  : 'text-foreground'
              }`}
            >
              {card.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${card.markerColor}`} aria-hidden />
              )}
              <span>
                {card.label} ({card.value})
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue
              placeholder="Select Status"
              getDisplayLabel={(v) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? 'Select Status'}
            />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
          <p>No tasks assigned to you.</p>
        </div>
      ) : (
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task, idx) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.study_sites?.name ?? '—'}
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
      )}

      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
        studies={studies}
        profileId={profileId}
      />

      {editTaskId && (
        <UpdateAssigneeTaskModal
          taskId={editTaskId}
          open={!!editTaskId}
          onOpenChange={(open) => !open && setEditTaskId(null)}
          onSuccess={handleEditSuccess}
          isAdmin={isAdmin}
          staticSiteContext={false}
          staticDescriptionSiteAndAssignee={staticDescriptionSiteAndAssignee}
          allowCreatorDelete={true}
          currentUserProfileId={profileId}
          editableTaskTitle={true}
          dialogTitle="Update My Task"
        />
      )}
    </div>
  );
}
