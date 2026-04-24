'use client';

import { History, GitCompare } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  EcrfVersionSelector,
  VersionStatusPill,
} from '@/components/ctms/study-forms/ecrf-bulk/ecrf-version-selector';
import type {
  EcrfTemplateVersion,
  EcrfTemplateVersionWithCounts,
} from '@/lib/types/ctms';

export interface EcrfHeaderBarProps {
  versions: EcrfTemplateVersionWithCounts[];
  activeVersion: EcrfTemplateVersion | null;
  /** Most recent activity from the change log; powers "Last updated …". */
  lastUpdatedAt?: string | null;
  lastUpdatedBy?: string | null;
  onSwitchVersion: (versionId: string) => void;
  onManageVersions: () => void;
  onOpenCompare: () => void;
  onOpenChangeLog: () => void;
  /** Disables Compare when there is only one version available. */
  canCompare: boolean;
}

/**
 * Top section of the eCRF Builder. Hosts the title + status pill on the left
 * and the version selector + audit chrome (Last updated, Compare, Change log)
 * on the right. Mirrors the conventions used by the Study Hub and the eCRF
 * Tracking right rail so the chrome reads consistently across CTMS modules.
 */
export function EcrfHeaderBar({
  versions,
  activeVersion,
  lastUpdatedAt,
  lastUpdatedBy,
  onSwitchVersion,
  onManageVersions,
  onOpenCompare,
  onOpenChangeLog,
  canCompare,
}: EcrfHeaderBarProps) {
  const lastUpdatedLine = lastUpdatedAt
    ? `Last updated ${format(new Date(lastUpdatedAt), 'd MMM, h:mm a')}${
        lastUpdatedBy ? ` by ${lastUpdatedBy}` : ''
      }`
    : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">eCRF Builder</h2>
          {activeVersion && <VersionStatusPill status={activeVersion.status} />}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Visits contain CRFs, which contain questions. Expand any row to drill in.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <EcrfVersionSelector
            versions={versions}
            activeVersion={activeVersion}
            onChange={onSwitchVersion}
            onManage={onManageVersions}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={!canCompare || !activeVersion}
                  onClick={onOpenCompare}
                />
              }
            >
              <GitCompare className="mr-1 h-3.5 w-3.5" />
              Compare versions
            </TooltipTrigger>
            <TooltipContent>
              {canCompare
                ? 'Compare two template versions side-by-side.'
                : 'Need at least two versions to compare.'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={!activeVersion}
                  onClick={onOpenChangeLog}
                />
              }
            >
              <History className="mr-1 h-3.5 w-3.5" />
              Change log
            </TooltipTrigger>
            <TooltipContent>
              View the audit log of edits to this template version.
            </TooltipContent>
          </Tooltip>
        </div>
        {lastUpdatedLine && (
          <p className="text-[11px] text-muted-foreground">{lastUpdatedLine}</p>
        )}
      </div>
    </div>
  );
}
