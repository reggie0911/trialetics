'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Keyboard,
  Plus,
  Rows3,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useBoardPrefs, type BoardPrefs } from '@/lib/hooks/use-board-prefs';
import { updateTask } from '@/lib/actions/tasks';
import { getCompanyProfiles } from '@/lib/actions/team';
import type {
  TaskPriority,
  TaskStatus,
  TaskWithRelations,
  StudyMilestoneWithProgress,
} from '@/lib/types/tasks';

import { TaskCard } from './task-board/task-card';
import { QuickEditPopover } from './task-board/quick-edit-popover';
import { ColumnsConfigMenu } from './task-board/columns-config-menu';
import {
  PRIORITY_COLUMN_DEFS,
  SORT_OPTIONS,
  STATUS_COLUMN_DEFS,
  profileDisplayName,
  sortTasks,
  type BoardColumn,
  type BoardGroupBy,
  type BoardSortKey,
} from './task-board/types';

interface ProfileLite {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface OptimisticPatch {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
}

type ColumnAddTarget =
  | { field: 'status'; value: TaskStatus }
  | { field: 'priority'; value: TaskPriority }
  | { field: 'assigned_to'; value: string | null };

interface TaskBoardViewProps {
  tasks: TaskWithRelations[];
  onEditTask: (taskId: string) => void;
  onRefresh: () => void;
  onCreateTask?: (target?: ColumnAddTarget) => void;
  groupBy?: BoardGroupBy;
  onGroupByChange?: (value: BoardGroupBy) => void;
  milestones?: StudyMilestoneWithProgress[];
}

const GROUP_BY_OPTIONS: Array<{ value: BoardGroupBy; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
];

const UNSCHEDULED_BAND_ID = '__unscheduled';

function getColumnsForGrouping(
  tasks: TaskWithRelations[],
  groupBy: BoardGroupBy,
  profiles: ProfileLite[],
  wipLimits: BoardPrefs['wipLimits'],
): BoardColumn[] {
  if (groupBy === 'status') {
    return STATUS_COLUMN_DEFS.map((d) => ({
      id: d.id,
      title: d.title,
      accentClass: d.accentClass,
      groupBy,
      groupValue: d.status,
      fixed: true,
      wipLimit: wipLimits[d.id],
    }));
  }
  if (groupBy === 'priority') {
    return PRIORITY_COLUMN_DEFS.map((d) => ({
      id: d.id,
      title: d.title,
      accentClass: d.accentClass,
      groupBy,
      groupValue: d.priority,
      fixed: true,
      wipLimit: wipLimits[d.id],
    }));
  }

  // assignee — derive from data + Unassigned bucket
  const seen = new Map<string | null, string>();
  for (const task of tasks) {
    const id = task.assigned_to ?? null;
    if (seen.has(id)) continue;
    seen.set(id, profileDisplayName(task.profiles));
  }
  // Make sure profiles fetched for the company are also represented if they have tasks; we
  // already cover that above. Keep ordering: real assignees alphabetised, Unassigned last.
  const real = Array.from(seen.entries())
    .filter(([id]) => id !== null)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, label]) => {
      const colId = `assignee:${id}`;
      const profile = profiles.find((p) => p.id === id);
      return {
        id: colId,
        title: profile ? profileDisplayName(profile) : label,
        accentClass: 'bg-primary/40',
        groupBy: 'assignee' as const,
        groupValue: id,
        fixed: false,
        wipLimit: wipLimits[colId],
      };
    });
  const unassigned: BoardColumn = {
    id: 'assignee:unassigned',
    title: 'Unassigned',
    accentClass: 'bg-muted-foreground/40',
    groupBy: 'assignee',
    groupValue: null,
    fixed: false,
    wipLimit: wipLimits['assignee:unassigned'],
  };
  return [...real, unassigned];
}

function applyPatchToTask(
  task: TaskWithRelations,
  patch: OptimisticPatch | undefined,
  profiles: ProfileLite[],
): TaskWithRelations {
  if (!patch) return task;
  const next: TaskWithRelations = { ...task };
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.assigned_to !== undefined) {
    next.assigned_to = patch.assigned_to;
    if (patch.assigned_to == null) {
      next.profiles = null;
    } else {
      const p = profiles.find((x) => x.id === patch.assigned_to);
      if (p) next.profiles = p;
    }
  }
  return next;
}

function taskMatchesColumn(task: TaskWithRelations, column: BoardColumn): boolean {
  if (column.groupBy === 'status') return task.status === column.groupValue;
  if (column.groupBy === 'priority') return task.priority === column.groupValue;
  return (task.assigned_to ?? null) === (column.groupValue ?? null);
}

function patchForColumn(column: BoardColumn): OptimisticPatch {
  if (column.groupBy === 'status') return { status: column.groupValue as TaskStatus };
  if (column.groupBy === 'priority') return { priority: column.groupValue as TaskPriority };
  return { assigned_to: column.groupValue };
}

function targetForColumn(column: BoardColumn): ColumnAddTarget {
  if (column.groupBy === 'status') return { field: 'status', value: column.groupValue as TaskStatus };
  if (column.groupBy === 'priority') return { field: 'priority', value: column.groupValue as TaskPriority };
  return { field: 'assigned_to', value: column.groupValue };
}

interface ColumnShellProps {
  column: BoardColumn;
  tasks: TaskWithRelations[];
  sortKey: BoardSortKey;
  onSortChange: (key: BoardSortKey) => void;
  onWipLimitChange: (limit: number | undefined) => void;
  onAdd: () => void;
  swimlanesByMilestone: boolean;
  collapsedSwimlanes: string[];
  onToggleSwimlane: (id: string) => void;
  milestones: StudyMilestoneWithProgress[];
  renderCard: (task: TaskWithRelations) => React.ReactNode;
}

function ColumnShell({
  column,
  tasks,
  sortKey,
  onSortChange,
  onWipLimitChange,
  onAdd,
  swimlanesByMilestone,
  collapsedSwimlanes,
  onToggleSwimlane,
  milestones,
  renderCard,
}: ColumnShellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const overLimit = column.wipLimit !== undefined && tasks.length > column.wipLimit;
  const sorted = useMemo(() => sortTasks(tasks, sortKey), [tasks, sortKey]);

  const milestoneById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of milestones) map.set(m.id, m.name);
    return map;
  }, [milestones]);

  const swimlaneGroups = useMemo(() => {
    if (!swimlanesByMilestone) return null;
    const grouped = new Map<string, TaskWithRelations[]>();
    for (const t of sorted) {
      const key = t.milestone_id ?? UNSCHEDULED_BAND_ID;
      const arr = grouped.get(key) ?? [];
      arr.push(t);
      grouped.set(key, arr);
    }
    // Order: milestones in sequence shown by parent + Unscheduled last
    const orderedKeys = [
      ...milestones.map((m) => m.id).filter((id) => grouped.has(id)),
      ...(grouped.has(UNSCHEDULED_BAND_ID) ? [UNSCHEDULED_BAND_ID] : []),
    ];
    return orderedKeys.map((key) => ({
      key,
      title:
        key === UNSCHEDULED_BAND_ID
          ? 'Unscheduled'
          : milestoneById.get(key) ?? 'Milestone',
      items: grouped.get(key) ?? [],
    }));
  }, [swimlanesByMilestone, sorted, milestones, milestoneById]);

  return (
    <div
      className={cn(
        'snap-start flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30',
        'max-h-[calc(100vh-260px)]',
      )}
    >
      <div
        className={cn(
          'h-1 rounded-t-lg',
          column.accentClass,
        )}
        aria-hidden
      />
      <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm rounded-t-none border-b px-2 py-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn('inline-block h-2 w-2 shrink-0 rounded-full', column.accentClass)}
            aria-hidden
          />
          <h3 className="font-semibold text-xs uppercase tracking-wide truncate">
            {column.title}
          </h3>
          <span
            className={cn(
              'ml-auto rounded px-1.5 py-0.5 text-[10px] tabular-nums',
              overLimit
                ? 'bg-destructive/10 text-destructive font-semibold'
                : 'bg-muted text-muted-foreground',
            )}
            title={
              column.wipLimit !== undefined
                ? `${tasks.length} / ${column.wipLimit} (WIP limit)`
                : `${tasks.length} cards`
            }
          >
            {tasks.length}
            {column.wipLimit !== undefined && (
              <span className="opacity-70"> / {column.wipLimit}</span>
            )}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Sort & limits"
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortKey}
                onValueChange={(v) => onSortChange(v as BoardSortKey)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>WIP limit</DropdownMenuLabel>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-20 text-xs"
                  value={column.wipLimit ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') onWipLimitChange(undefined);
                    else {
                      const n = Number(v);
                      onWipLimitChange(Number.isFinite(n) && n >= 0 ? n : undefined);
                    }
                  }}
                  placeholder="None"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => onWipLimitChange(undefined)}
                >
                  Clear
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add task to ${column.title}`}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {overLimit && column.wipLimit !== undefined && (
          <p className="mt-1 text-[10px] text-destructive">
            Over WIP limit ({column.wipLimit}) — slow down before pulling more.
          </p>
        )}
      </div>

      <div
        ref={setNodeRef}
        data-board-column-body={column.id}
        className={cn(
          'flex-1 overflow-y-auto px-2 pb-2 pt-2 space-y-2 transition-colors',
          isOver && 'bg-primary/5 ring-2 ring-primary/40 ring-inset',
        )}
      >
        {sorted.length === 0 ? (
          <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-6 text-center text-xs text-muted-foreground">
            <p className="font-medium">Drop tasks here</p>
            <p className="mt-1 text-muted-foreground/80">to mark them {column.title.toLowerCase()}.</p>
          </div>
        ) : swimlaneGroups ? (
          swimlaneGroups.map((band) => {
            const collapsed =
              band.key === UNSCHEDULED_BAND_ID
                ? !collapsedSwimlanes.includes(`${column.id}::${band.key}::expanded`)
                : collapsedSwimlanes.includes(`${column.id}::${band.key}`);
            return (
              <div key={band.key} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onToggleSwimlane(`${column.id}::${band.key}`)}
                  className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-muted/60"
                >
                  {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  <span className="truncate">{band.title}</span>
                  <span className="ml-auto text-[10px] tabular-nums">{band.items.length}</span>
                </button>
                {!collapsed && (
                  <div className="space-y-2 pl-1">
                    {band.items.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          sorted.map(renderCard)
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  density,
  nowMs,
  isSelected,
  isFocused,
  isAnyDragging,
  isDraggingThisCard,
  selectionCount,
  isPrimaryDrag,
  onCardClick,
  onKebabClick,
  onMissingSiteClick,
  onMissingAssigneeClick,
  bodyWrapper,
  onFocusCard,
}: {
  task: TaskWithRelations;
  density: BoardPrefs['density'];
  nowMs: number;
  isSelected: boolean;
  isFocused: boolean;
  isAnyDragging: boolean;
  isDraggingThisCard: boolean;
  selectionCount: number;
  isPrimaryDrag: boolean;
  onCardClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKebabClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMissingSiteClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMissingAssigneeClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  bodyWrapper?: (children: React.ReactNode) => React.ReactNode;
  onFocusCard: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: CSSProperties | undefined = isDraggingThisCard
    ? { opacity: 0.3 }
    : isAnyDragging && isSelected && !isPrimaryDrag
      ? { opacity: 0.4 }
      : undefined;

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      density={density}
      nowMs={nowMs}
      isSelected={isSelected}
      isDragging={isDraggingThisCard}
      isFocused={isFocused}
      selectionCount={selectionCount}
      onCardClick={onCardClick}
      onKebabClick={onKebabClick}
      onMissingSiteClick={onMissingSiteClick}
      onMissingAssigneeClick={onMissingAssigneeClick}
      bodyWrapper={bodyWrapper}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={style}
      tabIndex={0}
      onFocus={onFocusCard}
    />
  );
}

export function TaskBoardView({
  tasks,
  onEditTask,
  onRefresh,
  onCreateTask,
  groupBy: groupByProp,
  onGroupByChange,
  milestones = [],
}: TaskBoardViewProps) {
  const { prefs, update: updatePrefs, hydrated } = useBoardPrefs();

  // groupBy is controlled by parent if provided (URL persistence); otherwise local fallback
  const [groupByLocal, setGroupByLocal] = useState<BoardGroupBy>('status');
  const groupBy = groupByProp ?? groupByLocal;
  const setGroupBy = useCallback(
    (value: BoardGroupBy) => {
      if (onGroupByChange) onGroupByChange(value);
      else setGroupByLocal(value);
    },
    [onGroupByChange],
  );

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getCompanyProfiles();
        if (!cancelled) setProfiles(list);
      } catch {
        // non-fatal — quick edit assignee picker simply gets fewer choices
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [optimistic, setOptimistic] = useState<Record<string, OptimisticPatch>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditAnchor, setQuickEditAnchor] = useState<Element | null>(null);
  // `nowMs` is captured once per render of the board so card components stay
  // pure (no Date.now() inside the row render path).
  const [nowMs, setNowMs] = useState(() =>
    typeof window === 'undefined' ? 0 : Date.now(),
  );
  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Synchronise the popover anchor with the currently-open card. Reading
  // the DOM in an effect keeps the render pure (no ref reads in JSX).
  useEffect(() => {
    if (!quickEditId) {
      setQuickEditAnchor(null);
      return;
    }
    const el = document.querySelector(`[data-board-card-id="${quickEditId}"]`);
    setQuickEditAnchor(el);
  }, [quickEditId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const viewTasks = useMemo(
    () => tasks.map((t) => applyPatchToTask(t, optimistic[t.id], profiles)),
    [tasks, optimistic, profiles],
  );

  // Clear optimistic patches once props catch up
  useEffect(() => {
    setOptimistic((prev) => {
      let changed = false;
      const next: Record<string, OptimisticPatch> = {};
      for (const [id, patch] of Object.entries(prev)) {
        const realTask = tasks.find((t) => t.id === id);
        if (!realTask) continue;
        const stillPending: OptimisticPatch = {};
        if (patch.status !== undefined && realTask.status !== patch.status) {
          stillPending.status = patch.status;
        }
        if (patch.priority !== undefined && realTask.priority !== patch.priority) {
          stillPending.priority = patch.priority;
        }
        if (patch.assigned_to !== undefined && realTask.assigned_to !== patch.assigned_to) {
          stillPending.assigned_to = patch.assigned_to;
        }
        if (Object.keys(stillPending).length > 0) {
          next[id] = stillPending;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const allColumns = useMemo(
    () => getColumnsForGrouping(viewTasks, groupBy, profiles, prefs.wipLimits),
    [viewTasks, groupBy, profiles, prefs.wipLimits],
  );

  // Apply user-defined order + visibility (only meaningful for fixed columns)
  const orderedColumns = useMemo(() => {
    const reorderable = allColumns.every((c) => c.fixed);
    if (!reorderable) return allColumns;
    const orderMap = new Map(prefs.columnOrder.map((id, i) => [id, i] as const));
    const sortedCols = [...allColumns].sort((a, b) => {
      const ai = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const bi = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return sortedCols;
  }, [allColumns, prefs.columnOrder]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !prefs.hiddenColumnIds.includes(c.id)),
    [orderedColumns, prefs.hiddenColumnIds],
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const col of visibleColumns) map.set(col.id, []);
    for (const task of viewTasks) {
      for (const col of visibleColumns) {
        if (taskMatchesColumn(task, col)) {
          map.get(col.id)!.push(task);
          break;
        }
      }
    }
    return map;
  }, [viewTasks, visibleColumns]);

  const activeTask = activeTaskId ? viewTasks.find((t) => t.id === activeTaskId) ?? null : null;

  // Selection helpers
  const toggleSelected = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Sort
  const sortFor = useCallback(
    (columnId: string): BoardSortKey => prefs.sortByColumn[columnId] ?? 'due_asc',
    [prefs.sortByColumn],
  );

  const setSortFor = useCallback(
    (columnId: string, key: BoardSortKey) => {
      updatePrefs((p) => ({
        sortByColumn: { ...p.sortByColumn, [columnId]: key },
      }));
    },
    [updatePrefs],
  );

  const setWipLimitFor = useCallback(
    (columnId: string, limit: number | undefined) => {
      updatePrefs((p) => {
        const next = { ...p.wipLimits };
        if (limit === undefined) delete next[columnId];
        else next[columnId] = limit;
        return { wipLimits: next };
      });
    },
    [updatePrefs],
  );

  const setHiddenColumns = useCallback(
    (id: string, hidden: boolean) => {
      updatePrefs((p) => {
        const set = new Set(p.hiddenColumnIds);
        if (hidden) set.add(id);
        else set.delete(id);
        return { hiddenColumnIds: Array.from(set) };
      });
    },
    [updatePrefs],
  );

  const setColumnOrder = useCallback(
    (orderedIds: string[]) => {
      updatePrefs(() => ({ columnOrder: orderedIds }));
    },
    [updatePrefs],
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveTaskId(id);
      // If user dragged a non-selected card, replace selection with just it.
      if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
      }
    },
    [selectedIds],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);
      if (!over) return;
      const targetCol = visibleColumns.find((c) => c.id === over.id);
      if (!targetCol) return;

      const activeIdStr = String(active.id);
      const ids = selectedIds.has(activeIdStr) ? Array.from(selectedIds) : [activeIdStr];
      const patch = patchForColumn(targetCol);
      const movers = ids
        .map((id) => viewTasks.find((t) => t.id === id))
        .filter((t): t is TaskWithRelations => Boolean(t))
        .filter((t) => !taskMatchesColumn(t, targetCol));

      if (movers.length === 0) return;

      setOptimistic((prev) => {
        const next = { ...prev };
        for (const t of movers) {
          next[t.id] = { ...(next[t.id] ?? {}), ...patch };
        }
        return next;
      });

      const results = await Promise.all(
        movers.map((t) => updateTask(t.id, patch)),
      );
      const failed = results.filter((r) => r.error);
      if (failed.length > 0) {
        toast.error(
          failed.length === movers.length
            ? failed[0].error || 'Failed to move tasks'
            : `${failed.length} of ${movers.length} updates failed`,
        );
        setOptimistic((prev) => {
          const next = { ...prev };
          for (const t of movers) delete next[t.id];
          return next;
        });
      }
      onRefresh();
    },
    [selectedIds, visibleColumns, viewTasks, onRefresh],
  );

  // Quick edit / kebab handlers — on shift+click, intercept the click so the
  // PopoverTrigger doesn't also toggle. base-ui composes handlers and respects
  // `defaultPrevented`, so calling preventDefault here keeps the popover closed
  // while we toggle the multi-select set.
  const handleCardClick = useCallback(
    (taskId: string) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        toggleSelected(taskId, true);
        return;
      }
      setQuickEditId((prev) => (prev === taskId ? null : taskId));
    },
    [toggleSelected],
  );

  // Focus tracking
  const cardOrder = useMemo(() => {
    const order: string[] = [];
    for (const col of visibleColumns) {
      const colTasks = tasksByColumn.get(col.id) ?? [];
      const sorted = sortTasks(colTasks, sortFor(col.id));
      for (const t of sorted) order.push(t.id);
    }
    return order;
  }, [visibleColumns, tasksByColumn, sortFor]);

  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    focusedRef.current = focusedCardId;
  }, [focusedCardId]);

  // Keyboard shortcuts
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }
      if (event.key === '?') {
        setShortcutsOpen((v) => !v);
        return;
      }
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        const focusedId = focusedRef.current;
        if (focusedId) {
          const focusedTask = viewTasks.find((t) => t.id === focusedId);
          if (focusedTask) {
            const focusedCol = visibleColumns.find((c) => taskMatchesColumn(focusedTask, c));
            if (focusedCol) {
              onCreateTask?.(targetForColumn(focusedCol));
              return;
            }
          }
        }
        onCreateTask?.();
        return;
      }
      if ((event.key === 'j' || event.key === 'k') && cardOrder.length > 0) {
        event.preventDefault();
        const currentIdx = focusedRef.current ? cardOrder.indexOf(focusedRef.current) : -1;
        const nextIdx =
          event.key === 'j'
            ? (currentIdx + 1 + cardOrder.length) % cardOrder.length
            : (currentIdx - 1 + cardOrder.length) % cardOrder.length;
        const nextId = cardOrder[nextIdx];
        setFocusedCardId(nextId);
        const wrapper = document.querySelector<HTMLElement>(`[data-board-card-id="${nextId}"]`);
        const focusable = wrapper?.querySelector<HTMLElement>('[tabindex="0"]') ?? wrapper;
        focusable?.focus();
        return;
      }
      const numericKey = ['1', '2', '3', '4'].indexOf(event.key);
      if (numericKey >= 0 && focusedRef.current) {
        event.preventDefault();
        const targetCol = visibleColumns[numericKey];
        if (!targetCol) return;
        const id = focusedRef.current;
        const task = viewTasks.find((t) => t.id === id);
        if (!task || taskMatchesColumn(task, targetCol)) return;
        const patch = patchForColumn(targetCol);
        setOptimistic((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
        updateTask(id, patch).then((res) => {
          if (res.error) {
            toast.error(res.error);
            setOptimistic((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          } else {
            onRefresh();
          }
        });
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cardOrder, visibleColumns, viewTasks, onCreateTask, onRefresh, clearSelection]);

  // Background click clears selection
  const onBoardBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('[data-board-card-id]')) return;
      if ((event.target as HTMLElement).closest('[data-board-column-body]')) return;
      clearSelection();
    },
    [clearSelection],
  );

  const handleToggleSwimlane = useCallback(
    (id: string) => {
      updatePrefs((p) => {
        const set = new Set(p.collapsedSwimlanes);
        if (id.endsWith(`::${UNSCHEDULED_BAND_ID}`)) {
          // Unscheduled defaults collapsed; track expansion via __expanded suffix
          const expandKey = `${id}::expanded`;
          if (set.has(expandKey)) set.delete(expandKey);
          else set.add(expandKey);
        } else {
          if (set.has(id)) set.delete(id);
          else set.add(id);
        }
        return { collapsedSwimlanes: Array.from(set) };
      });
    },
    [updatePrefs],
  );

  const renderCard = useCallback(
    (task: TaskWithRelations) => {
      const isSelected = selectedIds.has(task.id);
      const isDraggingThisCard = activeTaskId === task.id;
      const isPrimaryDrag = activeTaskId === task.id;
      const isAnyDragging = activeTaskId !== null;
      const isFocused = focusedCardId === task.id;

      return (
        <div
          key={task.id}
          data-board-card-id={task.id}
        >
          <DraggableCard
            task={task}
            density={prefs.density}
            nowMs={nowMs}
            isSelected={isSelected}
            isFocused={isFocused}
            isAnyDragging={isAnyDragging}
            isDraggingThisCard={isDraggingThisCard}
            isPrimaryDrag={isPrimaryDrag}
            selectionCount={selectedIds.size}
            onCardClick={handleCardClick(task.id)}
            onKebabClick={() => onEditTask(task.id)}
            onMissingSiteClick={() => onEditTask(task.id)}
            onMissingAssigneeClick={() => onEditTask(task.id)}
            onFocusCard={() => setFocusedCardId(task.id)}
          />
        </div>
      );
    },
    [
      selectedIds,
      activeTaskId,
      focusedCardId,
      nowMs,
      prefs.density,
      handleCardClick,
      onEditTask,
    ],
  );

  // While preferences are still hydrating, render with default prefs to avoid SSR/CSR mismatch
  // (the initial state already matches DEFAULT_PREFS so this is mostly an explicit guard).
  void hydrated;

  const colsConfig = useMemo(
    () =>
      orderedColumns.map((c) => ({
        id: c.id,
        title: c.title,
        fixed: c.fixed,
      })),
    [orderedColumns],
  );

  return (
    <div className="space-y-3" onClick={onBoardBackgroundClick}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Label className="text-xs">Group by</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as BoardGroupBy)}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue
                getDisplayLabel={(v) =>
                  GROUP_BY_OPTIONS.find((o) => o.value === v)?.label ?? v ?? ''
                }
              />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Density</Label>
          <ToggleGroup
            value={[prefs.density]}
            onValueChange={(v) => {
              const next = (v as string[])[0];
              if (next === 'comfortable' || next === 'compact') {
                updatePrefs({ density: next });
              }
            }}
            spacing={0}
            variant="outline"
            className="h-8"
          >
            <ToggleGroupItem value="comfortable" className="h-8 px-2 text-xs" aria-label="Comfortable">
              Comfortable
            </ToggleGroupItem>
            <ToggleGroupItem value="compact" className="h-8 px-2 text-xs" aria-label="Compact">
              Compact
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button
          type="button"
          variant={prefs.swimlanesByMilestone ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() =>
            updatePrefs((p) => ({ swimlanesByMilestone: !p.swimlanesByMilestone }))
          }
        >
          <Rows3 className="h-3.5 w-3.5" />
          Swimlanes
        </Button>

        <ColumnsConfigMenu
          columns={colsConfig}
          hiddenIds={prefs.hiddenColumnIds}
          onToggleHidden={setHiddenColumns}
          onReorder={setColumnOrder}
          reorderable={orderedColumns.every((c) => c.fixed)}
        />

        <Popover open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Keyboard shortcuts">
                <Keyboard className="h-3.5 w-3.5" />?
              </Button>
            }
          />
          <PopoverContent align="end" className="w-72 gap-2">
            <PopoverHeader>
              <PopoverTitle>Keyboard shortcuts</PopoverTitle>
            </PopoverHeader>
            <ul className="space-y-1.5 text-xs">
              <li className="flex justify-between"><span>New task in focused column</span><kbd className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">N</kbd></li>
              <li className="flex justify-between"><span>Next / previous card</span><span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">J / K</span></li>
              <li className="flex justify-between"><span>Move focused card to column</span><span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">1 – 4</span></li>
              <li className="flex justify-between"><span>Clear selection</span><kbd className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">Esc</kbd></li>
              <li className="flex justify-between"><span>Multi-select cards</span><span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5">Shift + Click</span></li>
            </ul>
          </PopoverContent>
        </Popover>

        {selectedIds.size > 1 && (
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected · drag any one to move all
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {visibleColumns.map((col) => (
            <ColumnShell
              key={col.id}
              column={col}
              tasks={tasksByColumn.get(col.id) ?? []}
              sortKey={sortFor(col.id)}
              onSortChange={(key) => setSortFor(col.id, key)}
              onWipLimitChange={(limit) => setWipLimitFor(col.id, limit)}
              onAdd={() => onCreateTask?.(targetForColumn(col))}
              swimlanesByMilestone={prefs.swimlanesByMilestone && milestones.length > 0}
              collapsedSwimlanes={prefs.collapsedSwimlanes}
              onToggleSwimlane={handleToggleSwimlane}
              milestones={milestones}
              renderCard={renderCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              density={prefs.density}
              nowMs={nowMs}
              isDragging
              isSelected={selectedIds.has(activeTask.id)}
              showStackedBadge={selectedIds.size > 1 && selectedIds.has(activeTask.id)}
              selectionCount={selectedIds.size}
            />
          )}
        </DragOverlay>
      </DndContext>

      {visibleColumns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
          <p>All columns are hidden.</p>
          <p className="mt-1">Use the Columns menu to bring some back.</p>
        </div>
      )}
      {visibleColumns.length > 0 && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm rounded-md border">
          <p>No tasks match the current filters.</p>
          <p className="mt-1">Create a task or change filters to see cards.</p>
        </div>
      )}

      {(() => {
        if (!quickEditId) return null;
        const task = viewTasks.find((t) => t.id === quickEditId);
        if (!task) return null;
        return (
          <QuickEditPopover
            task={task}
            profiles={profiles}
            anchor={quickEditAnchor}
            open={!!quickEditId}
            onOpenChange={(o) => {
              if (!o) setQuickEditId(null);
            }}
            onChanged={onRefresh}
          />
        );
      })()}
    </div>
  );
}

