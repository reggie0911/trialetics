'use client';

import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  ECRF_SCHEDULE_PRESET_OPTIONS,
  type EcrfSchedulePresetId,
} from '@/lib/ecrf-schedule-presets';

export type EcrfBuilderSortKey =
  | 'sort_order'
  | 'name_asc'
  | 'name_desc'
  | 'updated_desc';

export type EcrfBuilderRowFilter = 'all' | 'empty' | 'incomplete';

interface EcrfActionToolbarProps {
  /** Whether the active version is a Draft (i.e. fully editable). */
  isDraft: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortKey: EcrfBuilderSortKey;
  onSortChange: (key: EcrfBuilderSortKey) => void;
  rowFilter: EcrfBuilderRowFilter;
  onRowFilterChange: (next: EcrfBuilderRowFilter) => void;

  onExpandAll: () => void;
  onCollapseAll: () => void;

  onAddVisit: () => void;
  onBulkImport: () => void;
  onAutoGenerate: (preset: EcrfSchedulePresetId) => void;

  onExportCsv: () => void;
  onExportPdf: () => void;
  /** Pass `true` while a download is in flight to disable the trigger. */
  exportBusy?: boolean;

  /** Disables auto-generate when the version is non-empty. */
  hasAnyVisits: boolean;
}

/**
 * Sticky utility bar that sits between the KPI strip and the visits/CRFs/
 * questions table. Bundles every interaction the user reaches for while
 * editing a template — search, sort, filter, expand/collapse, add, bulk
 * import, auto-generate schedule, and export.
 */
export function EcrfActionToolbar({
  isDraft,
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  rowFilter,
  onRowFilterChange,
  onExpandAll,
  onCollapseAll,
  onAddVisit,
  onBulkImport,
  onAutoGenerate,
  onExportCsv,
  onExportPdf,
  exportBusy,
  hasAnyVisits,
}: EcrfActionToolbarProps) {
  const filterLabel: Record<EcrfBuilderRowFilter, string> = {
    all: 'All rows',
    empty: 'Empty CRFs',
    incomplete: 'Incomplete visits',
  };

  const sortLabel: Record<EcrfBuilderSortKey, string> = {
    sort_order: 'Manual order',
    name_asc: 'Name A→Z',
    name_desc: 'Name Z→A',
    updated_desc: 'Recently updated',
  };

  return (
    <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-md bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="relative flex min-w-[220px] flex-1 items-center sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search visits, CRFs, or questions"
          className="h-8 pl-8 pr-7 text-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Select value={sortKey} onValueChange={(v) => onSortChange(v as EcrfBuilderSortKey)}>
        <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Sort visits">
          <SelectValue
            placeholder="Sort"
            getDisplayLabel={(value) => {
              if (!value) return 'Sort';
              return sortLabel[value as EcrfBuilderSortKey] ?? value;
            }}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sort_order">Manual order</SelectItem>
          <SelectItem value="name_asc">Name A→Z</SelectItem>
          <SelectItem value="name_desc">Name Z→A</SelectItem>
          <SelectItem value="updated_desc">Recently updated</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Filter className="mr-1 h-3.5 w-3.5" />
              {filterLabel[rowFilter]}
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Show</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onRowFilterChange('all')}>All rows</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRowFilterChange('empty')}>
              Only CRFs with no questions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRowFilterChange('incomplete')}>
              Only visits missing CRFs
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onExpandAll}>
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <TooltipContent>Expand all rows</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onCollapseAll}>
                <ChevronsDownUp className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <TooltipContent>Collapse all rows</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={exportBusy}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Export
                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCsv}>
              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPdf}>
              <FileText className="mr-2 h-3.5 w-3.5" />
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onBulkImport}
          disabled={!isDraft}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          Bulk import
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!isDraft || hasAnyVisits}
                title={
                  hasAnyVisits
                    ? 'Auto-generate is only available on empty draft versions.'
                    : undefined
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Auto-generate
                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-[280px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Choose a starting schedule</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ECRF_SCHEDULE_PRESET_OPTIONS.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => onAutoGenerate(preset.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="text-xs font-medium">{preset.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {preset.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="h-8 text-xs" onClick={onAddVisit} disabled={!isDraft}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add visit
        </Button>
      </div>
    </div>
  );
}
