'use client';

import { forwardRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Building2, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  TASK_PRIORITY_OPTIONS,
  type TaskPriority,
  type TaskWithRelations,
} from '@/lib/types/tasks';
import { formatPlanDate } from '@/lib/utils/visit-window';
import { profileDisplayName, profileInitials } from './types';
import type { BoardDensity } from '@/lib/hooks/use-board-prefs';

const PRIORITY_PILL: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200',
  high: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  critical: 'bg-destructive/15 text-destructive',
};

export interface TaskCardProps {
  task: TaskWithRelations;
  density: BoardDensity;
  /** Stable timestamp used for Overdue calculation; keep impure `Date.now()` out of render. */
  nowMs: number;
  isSelected?: boolean;
  isDragging?: boolean;
  isFocused?: boolean;
  selectionCount?: number;
  showStackedBadge?: boolean;
  onCardClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onKebabClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMissingSiteClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMissingAssigneeClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Wrapped around card body so consumers can attach Popover triggers etc. */
  bodyWrapper?: (children: ReactNode) => ReactNode;
  /** Drag listeners passed by the parent draggable wrapper. */
  dragHandleProps?: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
  tabIndex?: number;
  onFocus?: () => void;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  {
    task,
    density,
    nowMs,
    isSelected = false,
    isDragging = false,
    isFocused = false,
    selectionCount = 0,
    showStackedBadge = false,
    onCardClick,
    onKebabClick,
    onMissingSiteClick,
    onMissingAssigneeClick,
    bodyWrapper,
    dragHandleProps,
    className,
    style,
    tabIndex,
    onFocus,
  },
  ref,
) {
  const compact = density === 'compact';
  const priorityLabel =
    TASK_PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label ?? task.priority;

  const dueDate = task.due_date;
  const dueAsDate = dueDate ? new Date(dueDate) : null;
  const isOverdue =
    dueAsDate !== null &&
    !Number.isNaN(dueAsDate.getTime()) &&
    dueAsDate.getTime() < nowMs &&
    task.status !== 'completed';

  const siteName = task.study_sites?.name ?? null;
  const assignee = task.profiles ?? null;
  const assigneeName = profileDisplayName(assignee);

  const body = (
    <CardContent className={cn(compact ? 'p-2' : 'p-3', 'text-left flex flex-col gap-1.5')}>
      <div className="flex items-start gap-1.5">
        <p
          className={cn(
            'flex-1 font-medium text-sm leading-snug',
            compact ? 'line-clamp-1' : 'line-clamp-2',
          )}
        >
          {task.title}
        </p>
        {onKebabClick && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onKebabClick(event);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label="Task actions"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-sm p-0.5 hover:bg-muted text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" aria-hidden />
          {siteName ? (
            <span className="truncate">{siteName}</span>
          ) : onMissingSiteClick ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onMissingSiteClick(event);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              className="text-destructive underline-offset-2 hover:underline"
            >
              Missing site
            </button>
          ) : (
            <span className="text-destructive">Missing site</span>
          )}
        </div>
      )}

      {!compact && (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
            aria-hidden
          >
            {assignee ? profileInitials(assignee) : <UserIcon className="h-3 w-3" />}
          </span>
          {assignee ? (
            <span className="truncate text-foreground">{assigneeName}</span>
          ) : onMissingAssigneeClick ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onMissingAssigneeClick(event);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              className="text-destructive underline-offset-2 hover:underline"
            >
              Missing assignee
            </button>
          ) : (
            <span className="text-destructive">Missing assignee</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <Badge
          variant="secondary"
          className={cn('text-[10px] px-1.5 py-0', PRIORITY_PILL[task.priority])}
        >
          {priorityLabel}
        </Badge>
        <div className="flex items-center gap-1.5">
          {isOverdue && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Overdue
            </span>
          )}
          {dueDate && (
            <span className={cn('text-[10px] tabular-nums', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {formatPlanDate(dueDate)}
            </span>
          )}
        </div>
      </div>
    </CardContent>
  );

  return (
    <div
      ref={ref}
      style={style}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={onCardClick}
      aria-roledescription="Draggable task"
      aria-label={`${task.title}${isOverdue ? ', overdue' : ''}`}
      className={cn(
        'group relative outline-none rounded-md',
        isFocused && 'ring-2 ring-ring ring-offset-1 ring-offset-background',
        className,
      )}
      {...dragHandleProps}
    >
      <Card
        className={cn(
          'cursor-grab active:cursor-grabbing transition-shadow rounded-md py-0',
          'hover:shadow-md',
          isDragging && 'shadow-xl ring-2 ring-primary',
          isSelected && !isDragging && 'ring-2 ring-primary',
        )}
      >
        {bodyWrapper ? bodyWrapper(body) : body}
      </Card>
      {showStackedBadge && selectionCount > 1 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-md">
          +{selectionCount - 1}
        </span>
      )}
    </div>
  );
});
