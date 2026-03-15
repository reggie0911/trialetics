'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskTableView } from './task-table-view';
import { TaskBoardView } from './task-board-view';
import { CreateGroupTaskModal } from './create-group-task-modal';
import { UpdateAssigneeTaskModal } from './update-assignee-task-modal';
import type { StudyMilestoneWithProgress } from '@/lib/types/tasks';
import type { TaskWithRelations } from '@/lib/types/tasks';
import type { TaskDashboardCounts } from '@/lib/actions/tasks';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

interface TasksClientProps {
  initialMilestones: StudyMilestoneWithProgress[];
  initialTasks: TaskWithRelations[];
  studies: { id: string; title: string }[];
  initialCounts: TaskDashboardCounts;
  isAdmin?: boolean;
}

export function TasksClient({
  initialMilestones,
  initialTasks,
  studies,
  initialCounts,
  isAdmin = false,
}: TasksClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studyFilter, setStudyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const filteredMilestones = studyFilter === 'all'
    ? initialMilestones
    : initialMilestones.filter((m) => m.study_id === studyFilter);

  const filteredTasks = initialTasks.filter((t) => {
    if (studyFilter !== 'all' && t.study_id !== studyFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: filteredTasks.length,
    not_started: filteredTasks.filter((t) => t.status === 'not_started').length,
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress').length,
    completed: filteredTasks.filter((t) => t.status === 'completed').length,
    blocked: filteredTasks.filter((t) => t.status === 'blocked').length,
  };

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCreateSuccess = useCallback(() => {
    setCreateModalOpen(false);
    refresh();
  }, [refresh]);

  const handleUpdateClose = useCallback(() => {
    setEditTaskId(null);
    refresh();
  }, [refresh]);

  const summaryCards = [
    { label: 'Total Tasks', value: counts.total, key: 'total', markerColor: null as string | null },
    { label: 'Not Started', value: counts.not_started, key: 'not_started', markerColor: 'bg-muted-foreground/50' },
    { label: 'In Progress', value: counts.in_progress, key: 'in_progress', markerColor: 'bg-amber-500' },
    { label: 'Completed', value: counts.completed, key: 'completed', markerColor: 'bg-emerald-500' },
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
          {studies.length > 1 && (
            <Select value={studyFilter} onValueChange={setStudyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue
                  placeholder="All Studies"
                  getDisplayLabel={(v) => (v === 'all' ? 'All Studies' : studies.find((s) => s.id === v)?.title ?? v)}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studies</SelectItem>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === 'board' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('board')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <TaskTableView
          milestones={filteredMilestones}
          tasks={filteredTasks}
          onEditTask={setEditTaskId}
          onRefresh={refresh}
        />
      ) : (
        <TaskBoardView
          tasks={filteredTasks}
          onEditTask={setEditTaskId}
          onRefresh={refresh}
        />
      )}

      <CreateGroupTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        studies={studies}
        onSuccess={handleCreateSuccess}
      />

      {editTaskId && (
        <UpdateAssigneeTaskModal
          taskId={editTaskId}
          open={!!editTaskId}
          onOpenChange={(open) => !open && setEditTaskId(null)}
          onSuccess={handleUpdateClose}
          isAdmin={isAdmin}
          staticSiteContext={false}
        />
      )}
    </div>
  );
}
