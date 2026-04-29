'use client';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InstitutionOrganizationType } from '@/lib/types/directory';
import type { OrgHealth } from '@/lib/directory/live-directory-types';
import { cn } from '@/lib/utils';

export type OrgTypeOption = { value: InstitutionOrganizationType; label: string };

const ORG_HEALTH_LABELS: Record<Exclude<OrgHealth, 'not_tracked'>, string> = {
  healthy: 'Healthy',
  at_risk: 'At risk',
  critical: 'Critical',
};

export function OrganizationTypeFilterChip({
  value,
  onChange,
  options,
}: {
  value: 'all' | InstitutionOrganizationType;
  onChange: (v: 'all' | InstitutionOrganizationType) => void;
  options: OrgTypeOption[];
}) {
  const active = value !== 'all';
  const selected = options.find((o) => o.value === value);
  const labelText = active && selected ? `Type: ${selected.label}` : 'Type';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal max-w-[12rem]',
            active &&
              'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          <span className="truncate">{labelText}</span>
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[min(60vh,320px)] overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange('all')}>All types</DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => onChange(o.value)} title={o.label}>
            <span className="truncate">{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrganizationHealthFilterChip({
  value,
  onChange,
}: {
  value: OrgHealth | null;
  onChange: (v: OrgHealth | null) => void;
}) {
  const active = value != null;
  const labelText =
    active && value && value !== 'not_tracked' ? `Health: ${ORG_HEALTH_LABELS[value]}` : 'Health';
  const options: Exclude<OrgHealth, 'not_tracked'>[] = ['healthy', 'at_risk', 'critical'];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal',
            active &&
              'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          {labelText}
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => onChange(null)}>All</DropdownMenuItem>
        {options.map((h) => (
          <DropdownMenuItem key={h} onClick={() => onChange(h)}>
            {ORG_HEALTH_LABELS[h]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrganizationRecordStatusFilterChip({
  value,
  onChange,
}: {
  value: 'all' | 'active' | 'inactive';
  onChange: (v: 'all' | 'active' | 'inactive') => void;
}) {
  const active = value !== 'all';
  const labelText =
    value === 'all' ? 'Status' : value === 'active' ? 'Status: Active' : 'Status: Inactive';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal',
            active &&
              'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          {labelText}
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => onChange('all')}>All</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('active')}>Active</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('inactive')}>Inactive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type OrgCountryOption = { code: string; label: string };

export function OrganizationCountryFilterChip({
  value,
  onChange,
  options,
}: {
  value: 'all' | string;
  onChange: (v: 'all' | string) => void;
  options: OrgCountryOption[];
}) {
  const active = value !== 'all';
  const selected = options.find((o) => o.code === value);
  const labelText = active && selected ? `Country: ${selected.label}` : 'Country';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal max-w-[13rem]',
            active &&
              'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          <span className="truncate">{labelText}</span>
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[min(60vh,320px)] overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange('all')}>All countries</DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.code} onClick={() => onChange(o.code)} title={o.label}>
            <span className="truncate">{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
