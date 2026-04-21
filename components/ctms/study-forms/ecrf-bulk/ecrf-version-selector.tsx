'use client';

import { Settings2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type {
  EcrfTemplateVersion,
  EcrfTemplateVersionStatus,
  EcrfTemplateVersionWithCounts,
} from '@/lib/types/ctms';

/**
 * Status colors mirror the eCRF PDF header pills so every surface (toolbar,
 * version dropdown, manager dialog, exported PDF) reads the same:
 *  - live      → success (green)   — currently in production
 *  - draft     → warning (amber)   — editable work-in-progress
 *  - archived  → secondary (gray)  — read-only history
 */
const STATUS_VARIANTS: Record<
  EcrfTemplateVersionStatus,
  'success' | 'warning' | 'secondary'
> = {
  draft: 'warning',
  live: 'success',
  archived: 'secondary',
};

const STATUS_LABELS: Record<EcrfTemplateVersionStatus, string> = {
  draft: 'Draft',
  live: 'Live',
  archived: 'Archived',
};

function versionLabel(v: Pick<EcrfTemplateVersion, 'version_number' | 'name'>): string {
  const fallback = `Version ${v.version_number}`;
  const name = v.name?.trim();
  if (!name || name === fallback) return fallback;
  return `v${v.version_number} · ${name}`;
}

interface EcrfVersionSelectorProps {
  versions: EcrfTemplateVersionWithCounts[];
  activeVersion: EcrfTemplateVersion | null;
  onChange: (versionId: string) => void;
  onManage: () => void;
}

export function EcrfVersionSelector({
  versions,
  activeVersion,
  onChange,
  onManage,
}: EcrfVersionSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={activeVersion?.id ?? ''} onValueChange={onChange}>
        <SelectTrigger className="h-8 min-w-[220px] text-xs" aria-label="eCRF template version">
          <SelectValue placeholder="Select version">
            {activeVersion ? (
              <span className="flex items-center gap-2">
                <span className="truncate">{versionLabel(activeVersion)}</span>
                <Badge
                  variant={STATUS_VARIANTS[activeVersion.status]}
                  className="text-[9px] uppercase"
                >
                  {STATUS_LABELS[activeVersion.status]}
                </Badge>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {versions.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No versions yet.
            </div>
          )}
          {versions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <div className="flex w-full items-center gap-2">
                <span className="truncate">{versionLabel(v)}</span>
                <Badge variant={STATUS_VARIANTS[v.status]} className="ml-auto text-[9px] uppercase">
                  {STATUS_LABELS[v.status]}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="h-8" onClick={onManage}>
        <Settings2 className="mr-1 h-3.5 w-3.5" />
        Manage
      </Button>
    </div>
  );
}

export function VersionStatusPill({ status }: { status: EcrfTemplateVersionStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="text-[10px] uppercase">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
