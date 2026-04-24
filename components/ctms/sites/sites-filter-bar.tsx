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
import { SITE_STATUS_OPTIONS, type SiteStatus, type StudySite } from '@/lib/types/ctms';

export type SiteIdFilter = 'all' | string;
export type SiteStatusFilter = 'all' | SiteStatus;

interface SitesFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  siteFilter: SiteIdFilter;
  onSiteFilterChange: (value: SiteIdFilter) => void;
  statusFilter: SiteStatusFilter;
  onStatusFilterChange: (value: SiteStatusFilter) => void;
  sitesForSelect: Pick<StudySite, 'id' | 'name' | 'site_number'>[];
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Right-aligned cluster (Import dropdown + Add Site button). */
  actionsSlot?: React.ReactNode;
}

export function SitesFilterBar({
  search,
  onSearchChange,
  siteFilter,
  onSiteFilterChange,
  statusFilter,
  onStatusFilterChange,
  sitesForSelect,
  onClear,
  hasActiveFilters,
  actionsSlot,
}: SitesFilterBarProps) {
  const fieldLabelClass =
    'block h-4 text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground';
  const fieldGroupClass =
    'flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:flex-none sm:basis-44';

  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
          <Label htmlFor="sites-search" className={fieldLabelClass}>
            Search
          </Label>
          <div className="relative h-9">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sites-search"
              placeholder="Number, name, location, PI..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className={fieldGroupClass}>
          <Label htmlFor="sites-name-filter" className={fieldLabelClass}>
            Site
          </Label>
          <Select value={siteFilter} onValueChange={(v) => onSiteFilterChange(v as SiteIdFilter)}>
            <SelectTrigger id="sites-name-filter" className="h-9 w-full">
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

        <div className={fieldGroupClass}>
          <Label htmlFor="sites-status-filter" className={fieldLabelClass}>
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as SiteStatusFilter)}
          >
            <SelectTrigger id="sites-status-filter" className="h-9 w-full">
              <SelectValue
                placeholder="All statuses"
                getDisplayLabel={(value) => {
                  if (value == null || value === 'all') return 'All statuses';
                  const o = SITE_STATUS_OPTIONS.find((x) => x.value === value);
                  return o?.label ?? value;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {SITE_STATUS_OPTIONS.map((o) => (
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

        {actionsSlot ? (
          <div className="ml-auto flex flex-col gap-1.5">
            <span aria-hidden className={fieldLabelClass + ' invisible'}>
              Actions
            </span>
            <div className="flex items-center gap-2">{actionsSlot}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
