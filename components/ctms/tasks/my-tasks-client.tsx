'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Pencil, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { formatPlanDate } from '@/lib/utils/visit-window';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

function assigneeDisplay(task: TaskWithRelations): string {
  const p = task.profiles;
  if (!p) return '—';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
}

interface MyTasksClientProps {
  initialTasks: TaskWithRelations[];
  initialCounts: TaskDashboardCounts;
  studies: { id: string; title: string; study_name: string | null; protocol_number: string }[];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (q) {
        const hay = [
          t.title ?? '',
          t.study_sites?.name ?? '',
          assigneeDisplay(t),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialTasks, statusFilter, searchQuery]);

  const pagination = useClientPagination({
    totalItems: filteredTasks.length,
    initialPageSize: 10,
    resetKey: [searchQuery, statusFilter],
  });
  const pageRows = pagination.paginate(filteredTasks);

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task, site, assignee..."
              className="pl-7 h-9 w-[260px]"
            />
          </div>
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
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
          <p>{initialTasks.length === 0 ? 'No tasks assigned to you.' : 'No tasks match the current filters.'}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Task Name</TableHead>
                <TableHead className="text-xs">Site Name</TableHead>
                <TableHead className="text-xs">Assigned to</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Priority</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((task, idx) => {
                const isOverdue =
                  !!task.due_date && new Date(task.due_date) < new Date();
                return (
                  <TableRow key={task.id} className="group even:bg-muted/30">
                    <TableCell className="font-medium">
                      {pagination.startIndex + idx + 1}
                    </TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.study_sites?.name ?? '—'}
                    </TableCell>
                    <TableCell>{assigneeDisplay(task)}</TableCell>
                    <TableCell>
                      <span className={isOverdue ? 'text-destructive' : ''}>
                        {formatPlanDate(task.due_date)}
                      </span>
                      {isOverdue && (
                        <span className="text-destructive ml-1">Overdue</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {TASK_PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label ?? task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100">
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePaginationFooter
        pagination={pagination}
        totalItems={filteredTasks.length}
        itemNoun="task"
      />

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
