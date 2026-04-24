'use client';

import { ChevronDown, Download, FileSpreadsheet, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EnrollmentFunnelData, StudySite } from '@/lib/types/ctms';

import { SubjectFormDialog } from './subject-form-dialog';

interface SubjectsPageHeaderProps {
  studyId: string;
  funnel: EnrollmentFunnelData;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  /** When set, indicates the tab is scoped to a single site (subtitle copy adapts). */
  siteScopeId?: string;
  /** Forward the existing controlled-open deep-link entry into the Add Subject dialog. */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  defaultSiteIdWhenCreate?: string;
  lockSiteSelection?: boolean;
  onCreateSuccess: () => void;
  onOpenCopilotImport: () => void;
  onOpenCsvImport: () => void;
  onDownloadTemplate: () => void;
  readOnly: boolean;
  disabledTooltip?: string;
}

export function SubjectsPageHeader({
  studyId,
  funnel,
  sites,
  siteScopeId,
  createOpen,
  onCreateOpenChange,
  defaultSiteIdWhenCreate,
  lockSiteSelection,
  onCreateSuccess,
  onOpenCopilotImport,
  onOpenCsvImport,
  onDownloadTemplate,
  readOnly,
  disabledTooltip,
}: SubjectsPageHeaderProps) {
  const subtitleParts = [
    `${funnel.total} total subject${funnel.total === 1 ? '' : 's'}`,
    `${funnel.active} active`,
    `${funnel.screening} screening`,
    `${funnel.preScreening} pre-screening`,
  ];
  const subtitle = subtitleParts.join(' \u00B7 ');
  const scopeNote = siteScopeId ? ' \u00B7 site scope' : '';

  const importDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" disabled={readOnly}>
            <Upload className="mr-2 h-4 w-4" />
            Import
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onOpenCopilotImport}>
          <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
          Import with Copilot
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenCsvImport}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
          Bulk upload CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDownloadTemplate}>
          <Download className="mr-2 h-4 w-4 text-muted-foreground" />
          Download template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Subjects</h2>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {subtitle}
          {scopeNote}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {readOnly && disabledTooltip ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>{importDropdown}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {disabledTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          importDropdown
        )}
        <SubjectFormDialog
          studyId={studyId}
          sites={sites}
          onSuccess={onCreateSuccess}
          defaultSiteIdWhenCreate={defaultSiteIdWhenCreate}
          lockSiteSelection={lockSiteSelection}
          disabled={readOnly}
          disabledTooltip={disabledTooltip}
          controlledOpen={createOpen}
          onControlledOpenChange={onCreateOpenChange}
        />
      </div>
    </div>
  );
}
