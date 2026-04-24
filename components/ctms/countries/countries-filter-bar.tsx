'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COUNTRY_STATUS_OPTIONS,
  REGULATORY_STATUS_OPTIONS,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

export type RegulatoryFilter = 'all' | 'approved' | 'in_progress' | 'not_started';
export type ParticipationFilter = 'all' | 'planned' | 'enrolling' | 'approved' | 'closed' | 'regulatory_submitted';
export type SubmissionsFilter = 'all' | 'with' | 'without';

export const TOGGLEABLE_COLUMN_KEYS = [
  'submissions',
  'sites',
  'nextAction',
  'lastUpdated',
] as const;
export type ToggleableColumnKey = (typeof TOGGLEABLE_COLUMN_KEYS)[number];

export type ColumnVisibility = Record<ToggleableColumnKey, boolean>;

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  submissions: true,
  sites: true,
  nextAction: true,
  lastUpdated: true,
};

const COLUMN_LABELS: Record<ToggleableColumnKey, string> = {
  submissions: 'Submissions',
  sites: 'Sites',
  nextAction: 'Next action',
  lastUpdated: 'Last updated',
};

const REGULATORY_FILTER_LABELS: Record<RegulatoryFilter, string> = {
  all: 'All statuses',
  approved: 'Approved',
  in_progress: 'In progress',
  not_started: 'Not started',
};

const PARTICIPATION_FILTER_LABELS: Record<ParticipationFilter, string> = {
  all: 'All participation',
  planned: 'Planned',
  regulatory_submitted: 'Regulatory submitted',
  approved: 'Approved',
  enrolling: 'Enrolling',
  closed: 'Closed',
};

const SUBMISSIONS_FILTER_LABELS: Record<SubmissionsFilter, string> = {
  all: 'Any',
  with: 'With submissions',
  without: 'Without submissions',
};

interface CountriesFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  regulatory: RegulatoryFilter;
  onRegulatoryChange: (value: RegulatoryFilter) => void;
  participation: ParticipationFilter;
  onParticipationChange: (value: ParticipationFilter) => void;
  submissions: SubmissionsFilter;
  onSubmissionsChange: (value: SubmissionsFilter) => void;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (next: ColumnVisibility) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CountriesFilterBar({
  search,
  onSearchChange,
  regulatory,
  onRegulatoryChange,
  participation,
  onParticipationChange,
  submissions,
  onSubmissionsChange,
  columnVisibility,
  onColumnVisibilityChange,
  onClear,
  hasActiveFilters,
}: CountriesFilterBarProps) {
  const fieldLabelClass =
    'block h-4 text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground';
  const fieldGroupClass =
    'flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:flex-none sm:basis-44';

  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass}>Regulatory</Label>
          <Select
            value={regulatory}
            onValueChange={(v) => onRegulatoryChange(v as RegulatoryFilter)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue
                placeholder="All statuses"
                getDisplayLabel={(value) =>
                  REGULATORY_FILTER_LABELS[(value ?? 'all') as RegulatoryFilter] ?? null
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REGULATORY_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass}>Participation</Label>
          <Select
            value={participation}
            onValueChange={(v) => onParticipationChange(v as ParticipationFilter)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue
                placeholder="All participation"
                getDisplayLabel={(value) =>
                  PARTICIPATION_FILTER_LABELS[(value ?? 'all') as ParticipationFilter] ?? null
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All participation</SelectItem>
              {COUNTRY_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass}>Has submissions</Label>
          <Select
            value={submissions}
            onValueChange={(v) => onSubmissionsChange(v as SubmissionsFilter)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue
                placeholder="Any"
                getDisplayLabel={(value) =>
                  SUBMISSIONS_FILTER_LABELS[(value ?? 'all') as SubmissionsFilter] ?? null
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="with">With submissions</SelectItem>
              <SelectItem value="without">Without submissions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="countries-search" className={fieldLabelClass}>
            Search
          </Label>
          <div className="relative h-9">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="countries-search"
              placeholder="Country name or code..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="ml-auto flex flex-col gap-1.5">
          <span aria-hidden className={cn(fieldLabelClass, 'invisible')}>
            Actions
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              disabled={!hasActiveFilters}
              className="h-9 px-3 text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" className="h-9 px-3 text-xs">
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                    Columns
                  </Button>
                }
              />
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Toggle columns
              </div>
              <DropdownMenuSeparator />
              {TOGGLEABLE_COLUMN_KEYS.map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columnVisibility[key]}
                  onCheckedChange={(checked) =>
                    onColumnVisibilityChange({
                      ...columnVisibility,
                      [key]: Boolean(checked),
                    })
                  }
                >
                  {COLUMN_LABELS[key]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
