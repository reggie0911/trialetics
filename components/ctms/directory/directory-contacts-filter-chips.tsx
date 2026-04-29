'use client';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DirectoryContactHealth } from '@/lib/types/directory';
import { cn } from '@/lib/utils';

export const CONTACT_SITE_UNASSIGNED = '__unassigned__';

export type ContactRoleOption = { key: string; label: string };
export type ContactSiteOption = { key: string; label: string };

const HEALTH_LABELS: Record<DirectoryContactHealth, string> = {
  healthy: 'Healthy',
  needs_update: 'Needs update',
  at_risk: 'At risk',
};

export function ContactRoleFilterChip({
  value,
  onChange,
  options,
}: {
  value: 'all' | string;
  onChange: (v: 'all' | string) => void;
  options: ContactRoleOption[];
}) {
  const active = value !== 'all';
  const selected = options.find((o) => o.key === value);
  const labelText = active && selected ? `Role: ${selected.label}` : 'Role';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal max-w-[11rem]',
            active && 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          <span className="truncate">{labelText}</span>
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[min(60vh,320px)] overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange('all')}>All roles</DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.key} onClick={() => onChange(o.key)} title={o.label}>
            <span className="truncate">{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContactSiteFilterChip({
  value,
  onChange,
  sites,
  showUnassigned,
}: {
  value: 'all' | typeof CONTACT_SITE_UNASSIGNED | string;
  onChange: (v: 'all' | typeof CONTACT_SITE_UNASSIGNED | string) => void;
  sites: ContactSiteOption[];
  showUnassigned: boolean;
}) {
  const active = value !== 'all';
  const selected = sites.find((s) => s.key === value);
  const unassignedSelected = value === CONTACT_SITE_UNASSIGNED;
  let labelText = 'Site';
  if (unassignedSelected) labelText = 'Site: Unassigned';
  else if (active && selected) labelText = `Site: ${selected.label}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal max-w-[13rem]',
            active && 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          <span className="truncate" title={labelText}>
            {labelText}
          </span>
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[min(60vh,320px)] overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange('all')}>All sites</DropdownMenuItem>
        {showUnassigned ? (
          <DropdownMenuItem onClick={() => onChange(CONTACT_SITE_UNASSIGNED)}>Unassigned</DropdownMenuItem>
        ) : null}
        {sites.map((s) => (
          <DropdownMenuItem key={s.key} onClick={() => onChange(s.key)} title={s.label}>
            <span className="truncate">{s.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContactHealthFilterChip({
  value,
  onChange,
}: {
  value: 'all' | DirectoryContactHealth;
  onChange: (v: 'all' | DirectoryContactHealth) => void;
}) {
  const active = value !== 'all';
  const labelText = value !== 'all' ? `Health: ${HEALTH_LABELS[value]}` : 'Health';
  const options: DirectoryContactHealth[] = ['healthy', 'needs_update', 'at_risk'];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal',
            active && 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          {labelText}
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => onChange('all')}>All</DropdownMenuItem>
        {options.map((h) => (
          <DropdownMenuItem key={h} onClick={() => onChange(h)}>
            {HEALTH_LABELS[h]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
