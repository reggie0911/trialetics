'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { format, isValid, parse, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DISPLAY_FORMAT = 'dd-MMM-yyyy';

export const STUDY_DATE_PLACEHOLDER = 'e.g. 15-Jan-2026';

function parseIsoToDate(iso: string): Date | undefined {
  const t = iso?.trim() ?? '';
  if (!t) return undefined;
  const d = parse(t, 'yyyy-MM-dd', new Date(), { locale: enUS });
  if (isValid(d)) return d;
  const fallback = parseISO(t);
  return isValid(fallback) ? fallback : undefined;
}

function formatIsoDisplay(iso: string): string {
  const d = parseIsoToDate(iso);
  if (!d) return '';
  return format(d, DISPLAY_FORMAT, { locale: enUS });
}

export type StudyIsoDateInputProps = {
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
};

export function StudyIsoDateInput({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  type: _type,
  ...triggerProps
}: StudyIsoDateInputProps &
  Omit<React.ComponentPropsWithoutRef<typeof PopoverTrigger>, keyof StudyIsoDateInputProps>) {
  void _type;
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIsoToDate(value), [value]);
  const display = value?.trim() ? formatIsoDisplay(value) : null;
  const year = new Date().getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          'border-input bg-transparent shadow-xs flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-1 text-xs outline-none transition-[color,box-shadow]',
          'hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !display && 'text-muted-foreground',
          className,
        )}
        {...triggerProps}
      >
        <span className="truncate tabular-nums text-left">{display ?? STUDY_DATE_PLACEHOLDER}</span>
        <CalendarDays className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2 gap-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            onBlur?.();
            setOpen(false);
          }}
          captionLayout="dropdown"
          fromYear={1950}
          toYear={year + 25}
          defaultMonth={selected ?? new Date()}
        />
        {value?.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs text-muted-foreground"
            onClick={() => {
              onChange('');
              onBlur?.();
              setOpen(false);
            }}
          >
            Clear date
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
