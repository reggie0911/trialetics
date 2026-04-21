'use client';

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColumnConfigItem {
  id: string;
  title: string;
  /** Hide the visibility checkbox (used for derived columns that can't be hidden). */
  fixed: boolean;
}

interface ColumnsConfigMenuProps {
  /** All columns currently rendered, in their displayed order. */
  columns: ColumnConfigItem[];
  hiddenIds: string[];
  onToggleHidden: (id: string, hidden: boolean) => void;
  onReorder: (orderedIds: string[]) => void;
  /** Disable the reorder handles (e.g. for derived assignee columns). */
  reorderable: boolean;
}

function SortableRow({
  item,
  hidden,
  reorderable,
  onToggleHidden,
}: {
  item: ColumnConfigItem;
  hidden: boolean;
  reorderable: boolean;
  onToggleHidden: (id: string, hidden: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !reorderable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm',
        isDragging && 'bg-accent',
      )}
    >
      {reorderable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${item.title}`}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="h-3.5 w-3.5" aria-hidden />
      )}
      {item.fixed ? (
        <Checkbox
          checked={!hidden}
          onCheckedChange={(checked) => onToggleHidden(item.id, !checked)}
          aria-label={`Toggle ${item.title}`}
        />
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
      <span className="flex-1 truncate">{item.title}</span>
      {!item.fixed && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">auto</span>
      )}
    </div>
  );
}

export function ColumnsConfigMenu({
  columns,
  hiddenIds,
  onToggleHidden,
  onReorder,
  reorderable,
}: ColumnsConfigMenuProps) {
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(columns, oldIndex, newIndex).map((c) => c.id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Columns
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64 gap-2 p-2">
        <PopoverHeader className="px-1.5">
          <PopoverTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Columns
          </PopoverTitle>
        </PopoverHeader>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {columns.map((c) => (
                <SortableRow
                  key={c.id}
                  item={c}
                  hidden={hiddenIds.includes(c.id)}
                  reorderable={reorderable && c.fixed}
                  onToggleHidden={onToggleHidden}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {!reorderable && (
          <p className="px-1.5 pt-1 text-[11px] text-muted-foreground">
            Reorder is disabled when grouping by assignee.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
