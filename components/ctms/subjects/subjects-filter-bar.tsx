'use client';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  SUBJECT_STATUS_OPTIONS,
  type StudySite,
} from '@/lib/types/ctms';

import type { SubjectStatusFilter } from './subjects-status-pills';

export type SubjectSiteFilter = 'all' | string;

interface SubjectsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  siteFilter: SubjectSiteFilter;
  onSiteFilterChange: (value: SubjectSiteFilter) => void;
  statusFilter: SubjectStatusFilter;
  onStatusFilterChange: (value: SubjectStatusFilter) => void;
  sitesForSelect: Pick<StudySite, 'id' | 'name' | 'site_number'>[];
  /** When true, the Site dropdown is hidden (we're scoped to a single site already). */
  hideSiteFilter?: boolean;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function SubjectsFilterBar({
  search,
  onSearchChange,
  siteFilter,
  onSiteFilterChange,
  statusFilter,
  onStatusFilterChange,
  sitesForSelect,
  hideSiteFilter = false,
  onClear,
  hasActiveFilters,
}: SubjectsFilterBarProps) {
  const fieldLabelClass =
    'block h-4 text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground';
  const fieldGroupClass =
    'flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:flex-none sm:basis-44';

  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="subjects-search" className={fieldLabelClass}>
            Search
          </Label>
          <div className="relative h-9">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="subjects-search"
              placeholder="Subject ID, screening #, randomization #..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        {!hideSiteFilter ? (
          <div className={fieldGroupClass}>
            <Label htmlFor="subjects-site-filter" className={fieldLabelClass}>
              Site
            </Label>
            <Select
              value={siteFilter}
              onValueChange={(v) => onSiteFilterChange(v as SubjectSiteFilter)}
            >
              <SelectTrigger id="subjects-site-filter" className="h-9 w-full">
                <SelectValue
                  placeholder="All sites"
                  getDisplayLabel={(value) => {
                    if (value == null || value === 'all') return 'All sites';
                    const s = sitesForSelect.find((x) => x.id === value);
                    return s ? `${s.name} (${s.site_number})` : value;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sites</SelectItem>
                {sitesForSelect.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{' '}
                    <span className="text-muted-foreground">({s.site_number})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className={fieldGroupClass}>
          <Label htmlFor="subjects-status-filter" className={fieldLabelClass}>
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as SubjectStatusFilter)}
          >
            <SelectTrigger id="subjects-status-filter" className="h-9 w-full">
              <SelectValue
                placeholder="All statuses"
                getDisplayLabel={(value) => {
                  if (value == null || value === 'all') return 'All statuses';
                  const o = SUBJECT_STATUS_OPTIONS.find((x) => x.value === value);
                  return o?.label ?? value;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {SUBJECT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span aria-hidden className={fieldLabelClass + ' invisible'}>
            Clear
          </span>
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
        </div>
      </div>
    </div>
  );
}
