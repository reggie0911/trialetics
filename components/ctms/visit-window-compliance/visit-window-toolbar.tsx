'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Columns,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
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

/** Selectable bucket statuses driven by the KPI strip. */
export type DueStatus =
  | 'all'
  | 'in_window'
  | 'out_of_window'
  | 'overdue'
  | 'due_now'
  | 'upcoming'
  | 'pending';

export type ToolbarView = 'list' | 'grid';

export interface ToolbarColumnOption {
  /** Stable identifier matching the table column key. */
  id: string;
  label: string;
  /** Whether the column is currently visible. */
  visible: boolean;
}

export interface ToolbarSelectOption {
  value: string;
  label: string;
}

export interface VisitWindowToolbarValue {
  search: string;
  country: string;
  status: string;
  dueStatus: DueStatus;
  view: ToolbarView;
}

export interface VisitWindowToolbarProps {
  searchPlaceholder: string;
  /** Current toolbar state, fully controlled. */
  value: VisitWindowToolbarValue;
  onChange: (next: VisitWindowToolbarValue) => void;
  /** Per-scope filter option lists. Pass `[]` to hide a specific filter. */
  countryOptions?: ToolbarSelectOption[];
  statusOptions?: ToolbarSelectOption[];
  /** Optional column visibility menu (e.g. for the wide By Site table). */
  columnOptions?: ToolbarColumnOption[];
  onColumnToggle?: (id: string, next: boolean) => void;
  /** Hides the list/grid toggle when the parent only ships a single view. */
  showViewToggle?: boolean;
}

const DUE_STATUS_OPTIONS: { value: DueStatus; label: string }[] = [
  { value: 'all', label: 'All due statuses' },
  { value: 'in_window', label: 'In window' },
  { value: 'out_of_window', label: 'Out of window' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_now', label: 'Due now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
];

function labelForDueStatusTrigger(value: string | null) {
  if (value == null || value === '') return null;
  return DUE_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

function labelFromToolbarOptions(
  value: string | null,
  options: ToolbarSelectOption[],
  allLabel: string
) {
  if (value == null || value === '' || value === 'all') return allLabel;
  return options.find((o) => o.value === value)?.label ?? null;
}

function isDirty(value: VisitWindowToolbarValue): boolean {
  return (
    value.search.trim().length > 0 ||
    value.country !== 'all' ||
    value.status !== 'all' ||
    value.dueStatus !== 'all'
  );
}

/**
 * Toolbar shared across the By Site / By Visit / By Subject sub-tabs of the
 * Visit Window Compliance page. Combines search, three primary filters (with
 * a Filters popover for the long tail), a Columns popover, and an optional
 * list/grid view toggle.
 *
 * State is fully controlled — the parent persists the value into URL search
 * params via {@link useUrlBoundToolbarState} so KPI cards and alert
 * deep-links can preset filters.
 */
export function VisitWindowToolbar({
  searchPlaceholder,
  value,
  onChange,
  countryOptions = [],
  statusOptions = [],
  columnOptions,
  onColumnToggle,
  showViewToggle = true,
}: VisitWindowToolbarProps) {
  const dirty = isDirty(value);

  const update = useCallback(
    (patch: Partial<VisitWindowToolbarValue>) => onChange({ ...value, ...patch }),
    [onChange, value],
  );

  const handleClearAll = useCallback(() => {
    onChange({
      search: '',
      country: 'all',
      status: 'all',
      dueStatus: 'all',
      view: value.view,
    });
  }, [onChange, value.view]);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            aria-label={searchPlaceholder}
          />
        </div>

        {countryOptions.length > 0 && (
          <Select value={value.country} onValueChange={(v) => update({ country: v })}>
            <SelectTrigger className="h-9 w-[160px] text-xs" aria-label="Filter by country">
              <SelectValue
                placeholder="All countries"
                getDisplayLabel={(v) =>
                  labelFromToolbarOptions(v, countryOptions, 'All countries')
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {statusOptions.length > 0 && (
          <Select value={value.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="h-9 w-[170px] text-xs" aria-label="Filter by status">
              <SelectValue
                placeholder="All statuses"
                getDisplayLabel={(v) => labelFromToolbarOptions(v, statusOptions, 'All statuses')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={value.dueStatus}
          onValueChange={(v) => update({ dueStatus: v as DueStatus })}
        >
          <SelectTrigger className="h-9 w-[170px] text-xs" aria-label="Filter by due status">
            <SelectValue
              placeholder="All due statuses"
              getDisplayLabel={labelForDueStatusTrigger}
            />
          </SelectTrigger>
          <SelectContent>
            {DUE_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                Filters
              </Button>
            }
          />
          <PopoverContent className="w-[260px] text-sm">
            <p className="text-xs text-muted-foreground">
              Additional filters (date range, anchor type) coming soon.
            </p>
          </PopoverContent>
        </Popover>

        {dirty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={handleClearAll}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {columnOptions && columnOptions.length > 0 && onColumnToggle && (
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="h-9 text-xs">
                  <Columns className="mr-1 h-3.5 w-3.5" />
                  Columns
                </Button>
              }
            />
            <PopoverContent className="w-[220px]">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Show columns
              </p>
              <ul className="space-y-1.5">
                {columnOptions.map((c) => (
                  <li key={c.id}>
                    <Label className="flex cursor-pointer items-center gap-2 text-xs font-normal">
                      <Checkbox
                        checked={c.visible}
                        onCheckedChange={(checked) => onColumnToggle(c.id, checked === true)}
                      />
                      {c.label}
                    </Label>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}

        {showViewToggle && (
          <ToggleGroup
            value={[value.view]}
            onValueChange={(v) => {
              const next = v[0];
              if (next) update({ view: next as ToolbarView });
            }}
            className="h-9"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="px-2">
              <List className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2">
              <LayoutGrid className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
}

/** Bind the toolbar to URL search params so KPI cards / alerts can deep-link
 *  into a pre-filtered tab and the back button restores prior filter state. */
export function useUrlBoundToolbarState(scopePrefix: string): {
  value: VisitWindowToolbarValue;
  onChange: (next: VisitWindowToolbarValue) => void;
} {
  const router = useRouter();
  const searchParams = useSearchParams();

  const value = useMemo<VisitWindowToolbarValue>(
    () => ({
      search: searchParams.get(`${scopePrefix}q`) ?? '',
      country: searchParams.get(`${scopePrefix}country`) ?? 'all',
      status: searchParams.get(`${scopePrefix}status`) ?? 'all',
      dueStatus:
        (searchParams.get(`${scopePrefix}due`) as DueStatus | null) ?? 'all',
      view: (searchParams.get(`${scopePrefix}view`) as ToolbarView | null) ?? 'list',
    }),
    [scopePrefix, searchParams],
  );

  const onChange = useCallback(
    (next: VisitWindowToolbarValue) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, v: string, defaultV: string) => {
        if (v && v !== defaultV) params.set(key, v);
        else params.delete(key);
      };
      setOrDelete(`${scopePrefix}q`, next.search.trim(), '');
      setOrDelete(`${scopePrefix}country`, next.country, 'all');
      setOrDelete(`${scopePrefix}status`, next.status, 'all');
      setOrDelete(`${scopePrefix}due`, next.dueStatus, 'all');
      setOrDelete(`${scopePrefix}view`, next.view, 'list');
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, scopePrefix, searchParams],
  );

  return { value, onChange };
}
