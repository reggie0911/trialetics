'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RefreshCw } from 'lucide-react';
import { getSDVCascadingFilterOptions } from '@/lib/actions/sdv-tracker';

export interface SDVFilterState {
  site: string | null;
  subject: string | null;
  event: string | null;
  form: string | null;
  source: string | null;
}

interface SDVFiltersProps {
  reportId: string;
  filterOptions: {
    site_names: string[];
    subject_ids: string[];
    event_names: string[];
    form_names: string[];
  };
  filters: SDVFilterState;
  onFiltersChange: (filters: SDVFilterState) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function SDVFilters({
  reportId,
  filterOptions,
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing,
}: SDVFiltersProps) {
  const [cascadingOptions, setCascadingOptions] = useState<{
    subject_ids: string[];
    event_names: string[];
    form_names: string[];
  }>({
    subject_ids: filterOptions.subject_ids,
    event_names: filterOptions.event_names,
    form_names: filterOptions.form_names,
  });

  // Update cascading options when filters change
  useEffect(() => {
    const updateCascadingOptions = async () => {
      if (filters.site || filters.subject || filters.event) {
        const options = await getSDVCascadingFilterOptions(
          reportId,
          filters.site || undefined,
          filters.subject || undefined,
          filters.event || undefined
        );
        setCascadingOptions(options);
      } else {
        setCascadingOptions({
          subject_ids: filterOptions.subject_ids,
          event_names: filterOptions.event_names,
          form_names: filterOptions.form_names,
        });
      }
    };

    updateCascadingOptions();
  }, [reportId, filters.site, filters.subject, filters.event, filterOptions]);

  const handleSiteChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      onFiltersChange({ ...filters, site: null, subject: null, event: null, form: null });
    } else {
      onFiltersChange({ ...filters, site: value, subject: null, event: null, form: null });
    }
  };

  const handleSubjectChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      onFiltersChange({ ...filters, subject: null, event: null, form: null });
    } else {
      onFiltersChange({ ...filters, subject: value, event: null, form: null });
    }
  };

  const handleEventChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      onFiltersChange({ ...filters, event: null, form: null });
    } else {
      onFiltersChange({ ...filters, event: value, form: null });
    }
  };

  const handleFormChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      onFiltersChange({ ...filters, form: null });
    } else {
      onFiltersChange({ ...filters, form: value });
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      site: null,
      subject: null,
      event: null,
      form: null,
      source: null,
    });
  };

  const hasActiveFilters = filters.site || filters.subject || filters.event || filters.form || filters.source;

  const toDisplayLabel = (value: string) =>
    value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters:</span>
      </div>

      {/* Site Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">Site</label>
        <Select value={filters.site || 'all'} onValueChange={handleSiteChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue
              placeholder="All Sites"
              getDisplayLabel={(v) => (v === 'all' || !v ? 'All Sites' : toDisplayLabel(v))}
            />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {filterOptions.site_names.map((site) => (
            <SelectItem key={site} value={site}>
              {toDisplayLabel(site)}
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>

      {/* Subject Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">Subject</label>
        <Select 
        value={filters.subject || 'all'} 
        onValueChange={handleSubjectChange}
        disabled={!filters.site && cascadingOptions.subject_ids.length === 0}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue
            placeholder="All Subjects"
            getDisplayLabel={(v) => (v === 'all' || !v ? 'All Subjects' : toDisplayLabel(v))}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subjects</SelectItem>
          {(filters.site ? cascadingOptions.subject_ids : filterOptions.subject_ids).map((subject) => (
            <SelectItem key={subject} value={subject}>
              {toDisplayLabel(subject)}
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}

      {/* Refresh Button */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh} 
        disabled={isRefreshing}
        className="h-9 gap-1 ml-auto"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// Active filters display
export function SDVActiveFilters({
  filters,
  onRemoveFilter,
}: {
  filters: SDVFilterState;
  onRemoveFilter: (key: keyof SDVFilterState) => void;
}) {
  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== null);

  if (activeFilters.length === 0) {
    return null;
  }

  const getFilterLabel = (key: string): string => {
    switch (key) {
      case 'site':
        return 'Site';
      case 'subject':
        return 'Subject';
      case 'event':
        return 'Event';
      case 'form':
        return 'Form';
      case 'source':
        return 'Source';
      default:
        return key;
    }
  };

  const getValueLabel = (key: string, value: string): string => {
    if (key === 'source') {
      switch (value) {
        case 'site_data_only':
          return 'Site Data Only';
        case 'both':
          return 'Both Files';
        default:
          return value;
      }
    }
    return value;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {activeFilters.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">
            {getFilterLabel(key)}: {getValueLabel(key, value as string)}
          </span>
          <button
            onClick={() => onRemoveFilter(key as keyof SDVFilterState)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
