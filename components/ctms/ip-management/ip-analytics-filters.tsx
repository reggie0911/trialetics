'use client';

import { useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CalendarDays, RotateCcw } from 'lucide-react';
import type { AnalyticsFilters } from '@/lib/utils/ip-analytics-metrics';
import { emptyFilters } from '@/lib/utils/ip-analytics-metrics';

interface IpAnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (f: AnalyticsFilters) => void;
  supplyNames: string[];
}

const DISPOSITION_LABEL: Record<string, string> = {
  available: 'Available',
  used: 'Used',
  verified: 'Verified',
  returned: 'Returned',
  destroyed: 'Destroyed',
  transferred: 'Transferred',
  archived: 'Archived',
};

/** Title case for trigger display (human-readable, not raw DB strings). */
function titleCaseDisplay(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function supplyTriggerLabel(value: string | null): string {
  if (value == null || value === '' || value === '__all__') return 'All supplies';
  return titleCaseDisplay(value);
}

function dispositionTriggerLabel(value: string | null): string {
  if (value == null || value === '' || value === '__all__') return 'All';
  return DISPOSITION_LABEL[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/** Filters store ISO `yyyy-MM-dd`; display as `dd-MMM-yyyy` (e.g. 14-Apr-2026). */
function parseFilterIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function formatFilterDisplay(iso: string): string {
  const d = parseFilterIso(iso);
  if (!d) return '';
  return format(d, 'dd-MMM-yyyy', { locale: enUS });
}

interface AnalyticsDateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder: string;
}

function AnalyticsDateField({ label, value, onChange, placeholder }: AnalyticsDateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseFilterIso(value);
  const display = value ? formatFilterDisplay(value) : null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-[12px] leading-5 min-h-5">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            'border-input bg-transparent shadow-xs flex h-8 w-40 items-center justify-between gap-2 rounded-md border px-2.5 text-[12px] outline-none transition-[color,box-shadow]',
            'hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !display && 'text-muted-foreground'
          )}
        >
          <span className="truncate tabular-nums">{display ?? placeholder}</span>
          <CalendarDays className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2 gap-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onChange(d ? format(d, 'yyyy-MM-dd') : '');
              setOpen(false);
            }}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={new Date().getFullYear() + 5}
            defaultMonth={selected ?? new Date()}
          />
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full text-[12px] text-muted-foreground"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function IpAnalyticsFilters({ filters, onFiltersChange, supplyNames }: IpAnalyticsFiltersProps) {
  function update(patch: Partial<AnalyticsFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const hasFilters =
    filters.supplyName !== '' ||
    filters.disposition !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.missingDataOnly;

  return (
    <div className="flex flex-wrap items-start gap-3 print:hidden">
      <div className="flex min-w-0 flex-col gap-1">
        <Label className="text-[12px] leading-5 min-h-5">Supply name</Label>
        <Select value={filters.supplyName || '__all__'} onValueChange={(v) => update({ supplyName: v === '__all__' ? '' : v })}>
          <SelectTrigger className="h-8 w-44 text-[12px]">
            <SelectValue placeholder="All supplies" getDisplayLabel={supplyTriggerLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All supplies</SelectItem>
            {supplyNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <Label className="text-[12px] leading-5 min-h-5">Disposition</Label>
        <Select value={filters.disposition || '__all__'} onValueChange={(v) => update({ disposition: v === '__all__' ? '' : v })}>
          <SelectTrigger className="h-8 w-36 text-[12px]">
            <SelectValue placeholder="All" getDisplayLabel={dispositionTriggerLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="destroyed">Destroyed</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AnalyticsDateField
        label="From date"
        placeholder="Select from date"
        value={filters.dateFrom}
        onChange={(iso) => update({ dateFrom: iso })}
      />

      <AnalyticsDateField
        label="To date"
        placeholder="Select to date"
        value={filters.dateTo}
        onChange={(iso) => update({ dateTo: iso })}
      />

      <div className="flex min-w-0 flex-col gap-1">
        <span className="min-h-5 shrink-0" aria-hidden />
        <div className="flex h-8 items-center gap-2">
          <Switch
            id="missing-data-toggle"
            checked={filters.missingDataOnly}
            onCheckedChange={(checked) => update({ missingDataOnly: checked })}
          />
          <Label htmlFor="missing-data-toggle" className="text-[12px] cursor-pointer leading-none">
            Missing data only
          </Label>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="min-h-5 shrink-0" aria-hidden />
          <Button variant="ghost" size="sm" className="h-8 text-[12px] px-2" onClick={() => onFiltersChange(emptyFilters())}>
            <RotateCcw className="h-3.5 w-3.5 mr-1 shrink-0" /> Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}
