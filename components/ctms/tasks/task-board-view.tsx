'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import type { TaskWithRelations } from '@/lib/types/tasks';
import { TASK_PRIORITY_OPTIONS } from '@/lib/types/tasks';
import { updateTask } from '@/lib/actions/tasks';
import { toast } from 'sonner';

const COLUMNS: { id: string; title: string }[] = [
  { id: 'not_started', title: 'Not Started' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'completed', title: 'Completed' },
  { id: 'blocked', title: 'Blocked' },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function TaskCard({
  task,
  onClick,
}: {
  task: TaskWithRelations;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const siteName = task.study_sites?.name ?? null;
  const assigneeName = task.profiles
    ? [task.profiles.first_name, task.profiles.last_name].filter(Boolean).join(' ') || task.profiles.email
    : null;

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <CardContent className="p-3 text-left">
        <p className="font-medium text-sm line-clamp-2">{task.title}</p>
        {siteName && <p className="text-xs text-muted-foreground mt-1">{siteName}</p>}
        {assigneeName && <p className="text-xs text-muted-foreground">{assigneeName}</p>}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatusBadge status={task.status} className="text-[10px]" />
          <Badge variant="secondary" className="text-[10px]">
            {TASK_PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label ?? task.priority}
          </Badge>
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">{formatDate(task.due_date)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  columnId,
  title,
  tasks,
  onEditTask,
}: {
  columnId: string;
  title: string;
  tasks: TaskWithRelations[];
  onEditTask: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg border bg-muted/30 p-3 min-h-[200px] transition-colors ${
        isOver ? 'ring-2 ring-primary/50' : ''
      }`}
    >
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <span>{title}</span>
        <span className="text-muted-foreground font-normal">({tasks.length})</span>
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onEditTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskBoardViewProps {
  tasks: TaskWithRelations[];
  onEditTask: (taskId: string) => void;
  onRefresh: () => void;
}

export function TaskBoardView({ tasks, onEditTask, onRefresh }: TaskBoardViewProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const taskId = String(active.id);
      const newStatus = String(over.id);
      if (!COLUMNS.some((c) => c.id === newStatus)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      setOptimisticStatus((prev) => ({ ...prev, [taskId]: newStatus }));
      const { error } = await updateTask(taskId, { status: newStatus as TaskWithRelations['status'] });
      if (error) {
        toast.error(error);
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        return;
      }
      onRefresh();
      // Keep optimistic status until parent re-renders with updated tasks (avoids flicker back to old column)
    },
    [tasks, onRefresh]
  );

  // Clear optimistic status once server state has caught up (task in props has the new status)
  useEffect(() => {
    setOptimisticStatus((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const task = tasks.find((t) => t.id === id);
        if (task && task.status === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter((t) => (optimisticStatus[t.id] ?? t.status) === col.id);
      return acc;
    },
    {} as Record<string, TaskWithRelations[]>
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            title={col.title}
            tasks={tasksByColumn[col.id] ?? []}
            onEditTask={onEditTask}
          />
        ))}
      </div>
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
          <p>No tasks match the current filters.</p>
          <p className="mt-1">Create a group task or switch filters to see tasks.</p>
        </div>
      )}
    </DndContext>
  );
}
