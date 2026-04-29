'use client';

import { createElement } from 'react';
import { MapPin, MoreHorizontal, Pencil, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { InstitutionOrganizationType, InstitutionStatus } from '@/lib/types/directory';

import {
  getOrganizationTypeIcon,
  getOrganizationTypeIconTone,
  getOrganizationTypeLabel,
  getShortInstitutionId,
  type ProfileCopy,
} from './utils';

export interface ProfileHeroProps {
  institutionId: string;
  name: string;
  organizationType: InstitutionOrganizationType;
  status: InstitutionStatus;
  addressLine: string | null;
  isAddressVerified: boolean;
  linkedStudyCount: number;
  copy: ProfileCopy;
  canEdit: boolean;
  isStatusPending: boolean;
  onEdit: () => void;
  onViewMap: () => void;
  onToggleStatus: () => void;
}

export function ProfileHero({
  institutionId,
  name,
  organizationType,
  status,
  addressLine,
  isAddressVerified,
  linkedStudyCount,
  copy,
  canEdit,
  isStatusPending,
  onEdit,
  onViewMap,
  onToggleStatus,
}: ProfileHeroProps) {
  const Icon = getOrganizationTypeIcon(organizationType);
  const tone = getOrganizationTypeIconTone(organizationType);
  const typeLabel = getOrganizationTypeLabel(organizationType);
  const shortId = getShortInstitutionId(institutionId);
  const isActive = status === 'active';

  return (
    <TooltipProvider delay={200}>
      <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span
              aria-hidden
              className={`hidden h-16 w-16 shrink-0 items-center justify-center rounded-[10px] sm:flex ${tone}`}
            >
              {createElement(Icon, { className: 'h-8 w-8', strokeWidth: 1.75 })}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {typeLabel}
                </Badge>
                <Badge variant={isActive ? 'success' : 'outline'} className="shrink-0">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {addressLine ? (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">{addressLine}</span>
                  {isAddressVerified ? (
                    <span className="ml-2 inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                      Verified via Google
                    </span>
                  ) : null}
                </p>
              ) : null}
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-[11px] sm:grid-cols-4">
                <FactCell label={`${copy.entityNoun} ID`} value={shortId} />
                <FactCell label={copy.organizationTypeFactLabel} value={typeLabel} />
                <FactCell label="Local Time" value={<LocalTime />} />
                <FactCell
                  label={copy.linkedStudiesFactLabel}
                  value={<span className="tabular-nums">{linkedStudyCount}</span>}
                />
              </dl>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <QuickActionButton tooltip={`${copy.editLabel} details`} onClick={onEdit} disabled={!canEdit}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                {copy.editLabel}
              </QuickActionButton>
              <QuickActionButton tooltip="Open the location section" onClick={onViewMap}>
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                View map
              </QuickActionButton>
              {canEdit ? (
                <Button
                  type="button"
                  variant={isActive ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onToggleStatus}
                  disabled={isStatusPending}
                >
                  {isActive ? copy.deactivateLabel : copy.activateLabel}
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        void navigator.clipboard.writeText(window.location.href).catch(() => undefined);
                      }
                    }}
                  >
                    Copy page link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function FactCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={`truncate text-xs font-medium ${
          highlight ? 'text-sky-600 dark:text-sky-400' : 'text-foreground'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function QuickActionButton({
  children,
  onClick,
  tooltip,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px] font-medium"
            onClick={onClick}
            disabled={disabled}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/** Renders an SSR-safe placeholder until mounted, then displays the user's local time. */
function LocalTime() {
  return (
    <time
      suppressHydrationWarning
      dateTime={new Date().toISOString()}
      title="Time in your local zone"
    >
      {formatLocalTime()}
    </time>
  );
}

function formatLocalTime(): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    return '—';
  }
}
