'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskPriority,
  type TaskStatus,
  type TaskWithRelations,
} from '@/lib/types/tasks';
import { updateTask } from '@/lib/actions/tasks';
import { profileDisplayName } from './types';

export interface QuickEditPopoverProps {
  task: TaskWithRelations;
  profiles: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>;
  onChanged: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** DOM element (or ref) the popover should anchor to. */
  anchor: Element | null;
}

export function QuickEditPopover({
  task,
  profiles,
  onChanged,
  open,
  onOpenChange,
  anchor,
}: QuickEditPopoverProps) {
  const [saving, setSaving] = useState(false);

  const apply = async (
    patch:
      | { status: TaskStatus }
      | { priority: TaskPriority }
      | { assigned_to: string | null },
  ) => {
    setSaving(true);
    const { error } = await updateTask(task.id, patch);
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    onChanged();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent align="start" className="w-72 gap-3" anchor={anchor ?? undefined}>
        <PopoverHeader>
          <PopoverTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Quick edit
          </PopoverTitle>
        </PopoverHeader>

        <div className="space-y-2">
          <Label className="text-xs">Status</Label>
          <Select
            value={task.status}
            onValueChange={(v) => apply({ status: v as TaskStatus })}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue
                getDisplayLabel={(v) =>
                  TASK_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v ?? ''
                }
              />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Priority</Label>
          <Select
            value={task.priority}
            onValueChange={(v) => apply({ priority: v as TaskPriority })}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue
                getDisplayLabel={(v) =>
                  TASK_PRIORITY_OPTIONS.find((o) => o.value === v)?.label ?? v ?? ''
                }
              />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Assignee</Label>
          <Select
            value={task.assigned_to ?? ''}
            onValueChange={(v) => apply({ assigned_to: v || null })}
            disabled={saving}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue
                placeholder="Unassigned"
                getDisplayLabel={(v) => {
                  if (!v) return 'Unassigned';
                  const p = profiles.find((x) => x.id === v) ?? null;
                  return profileDisplayName(p);
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {profileDisplayName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
