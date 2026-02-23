'use client';

import { Badge } from '@/components/ui/badge';
import type { ProtocolTask, TaskStatus } from '@/lib/types/tasks';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/types/tasks';

interface TaskBoardProps {
  tasks: ProtocolTask[];
  isLoading: boolean;
  onSelect: (task: ProtocolTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const BOARD_COLUMNS: TaskStatus[] = ['planned', 'in_progress', 'on_hold', 'completed'];

const COLUMN_COLORS: Record<TaskStatus, string> = {
  planned: 'border-blue-200 bg-blue-50',
  in_progress: 'border-yellow-200 bg-yellow-50',
  on_hold: 'border-gray-200 bg-gray-50',
  completed: 'border-green-200 bg-green-50',
  cancelled: 'border-red-200 bg-red-50',
};

export function TaskBoard({ tasks, isLoading, onSelect, onStatusChange }: TaskBoardProps) {
  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading tasks...</div>;
  }

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {BOARD_COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);

        return (
          <div key={status} className="flex flex-col">
            <div className={`rounded-t-lg border-t-2 px-3 py-2 ${COLUMN_COLORS[status]}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{TASK_STATUS_LABELS[status]}</p>
                <span className="text-[10px] text-muted-foreground">{columnTasks.length}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 rounded-b-lg border border-t-0 bg-muted/20 p-2 min-h-[200px]">
              {columnTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border bg-white p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => onSelect(task)}
                  >
                    <p className="text-xs font-medium line-clamp-2">{task.name}</p>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <Badge variant={priorityBadge(task.priority)} className="text-[9px]">
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[9px] text-muted-foreground">
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.assigned_to && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {task.assigned_to.first_name || ''} {task.assigned_to.last_name || ''}
                      </p>
                    )}
                    {task.protocol && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {task.protocol.protocol_number || task.protocol.title}
                      </p>
                    )}
                    {task.completion_percentage > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${task.completion_percentage}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{task.completion_percentage}%</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
