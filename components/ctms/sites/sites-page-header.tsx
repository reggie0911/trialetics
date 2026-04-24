'use client';

import Link from 'next/link';
import { ChevronDown, Download, FileSpreadsheet, Plus, Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SitesPageHeaderProps {
  studyId: string;
  activatedCount: number;
  enrolled: number;
  target: number;
  onOpenCopilotImport: () => void;
  onOpenCsvImport: () => void;
  onDownloadTemplate: () => void;
  readOnly: boolean;
  disabledTooltip?: string;
}

export function SitesPageHeader({
  studyId,
  activatedCount,
  enrolled,
  target,
  onOpenCopilotImport,
  onOpenCsvImport,
  onDownloadTemplate,
  readOnly,
  disabledTooltip,
}: SitesPageHeaderProps) {
  const subtitle = `${activatedCount} active site${activatedCount === 1 ? '' : 's'} \u00B7 ${enrolled} / ${target} enrolled`;

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

  const addSiteButton = (
    <Button
      size="sm"
      render={<Link href={`/protected/studies/${studyId}/sites/new`} />}
      nativeButton={false}
    >
      <Plus className="mr-2 h-4 w-4" />
      Add Site
    </Button>
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Sites</h2>
        <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
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
        {readOnly ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button size="sm" disabled aria-label="Add site">
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {disabledTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          addSiteButton
        )}
      </div>
    </div>
  );
}
