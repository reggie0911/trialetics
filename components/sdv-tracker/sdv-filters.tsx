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
    data_sources: string[];
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

  const handleSourceChange = (value: string | null) => {
    if (value === 'all' || value === null) {
      onFiltersChange({ ...filters, source: null });
    } else {
      onFiltersChange({ ...filters, source: value });
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

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'site_data_only':
        return 'Site Data Only';
      case 'both':
        return 'Both Files';
      default:
        return source;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters:</span>
      </div>

      {/* Site Filter */}
      <Select value={filters.site || 'all'} onValueChange={handleSiteChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="All Sites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {filterOptions.site_names.map((site) => (
            <SelectItem key={site} value={site}>
              {site}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Subject Filter */}
      <Select 
        value={filters.subject || 'all'} 
        onValueChange={handleSubjectChange}
        disabled={!filters.site && cascadingOptions.subject_ids.length === 0}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="All Subjects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subjects</SelectItem>
          {(filters.site ? cascadingOptions.subject_ids : filterOptions.subject_ids).map((subject) => (
            <SelectItem key={subject} value={subject}>
              {subject}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Data Source Filter */}
      <Select value={filters.source || 'all'} onValueChange={handleSourceChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {filterOptions.data_sources.map((source) => (
            <SelectItem key={source} value={source}>
              {getSourceLabel(source)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
