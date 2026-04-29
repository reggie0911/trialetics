'use client';

import { Calendar, FileDown, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActivityEventKind } from '@/lib/directory/activity-events';

export type ActivityKindFilter = ActivityEventKind | 'all';

interface ChipDef {
  value: ActivityKindFilter;
  label: string;
}

const CHIPS: ChipDef[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'study', label: 'Study Activity' },
  { value: 'site', label: 'Site Activity' },
  { value: 'role', label: 'Role Changes' },
  { value: 'profile', label: 'Profile Updates' },
  { value: 'visits', label: 'Visits & Monitoring' },
];

interface DirectoryActivityFilterBarProps {
  value: ActivityKindFilter;
  onChange: (next: ActivityKindFilter) => void;
}

export function DirectoryActivityFilterBar({ value, onChange }: DirectoryActivityFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map((chip) => {
          const active = chip.value === value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onChange(chip.value)}
              className={cn(
                'inline-flex items-center rounded-md border px-2.5 h-8 text-xs font-medium transition-colors',
                active
                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
                  : 'border-border bg-background text-foreground/80 hover:bg-muted/50'
              )}
              aria-pressed={active}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs h-8"
        onClick={() => toast.message('Date range — coming soon')}
      >
        Date range
        <Calendar className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs h-8"
        onClick={() => toast.message('Export — coming soon')}
      >
        <FileDown className="h-3.5 w-3.5 mr-1.5" />
        Export
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label="More filters"
        onClick={() => toast.message('More filters — coming soon')}
      >
        <Filter className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
