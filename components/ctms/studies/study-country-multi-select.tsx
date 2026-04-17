'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import { allIsoCountriesForSelectList } from '@/lib/data/iso-countries-select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type StudyCountryMultiSelectProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
};

export function StudyCountryMultiSelect({
  id,
  value,
  onChange,
  disabled,
  'aria-invalid': ariaInvalid,
}: StudyCountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => allIsoCountriesForSelectList(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggleName = (name: string) => {
    const next = new Set(value);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange([...next]);
  };

  const removeName = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
        {value.map((name) => (
          <Badge key={name} variant="secondary" className="text-xs font-normal gap-1 pr-1">
            {name}
            <button
              type="button"
              className="rounded-sm hover:bg-muted p-0.5 disabled:opacity-50"
              onClick={() => removeName(name)}
              disabled={disabled}
              aria-label={`Remove ${name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'border-input bg-background shadow-xs flex h-9 w-full items-center justify-between gap-2 rounded-md border px-2.5 text-xs font-normal outline-none transition-[color,box-shadow]',
            'hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value.length && 'text-muted-foreground',
          )}
          aria-invalid={ariaInvalid}
        >
          <span className="truncate text-left">
            {value.length ? `${value.length} ${value.length === 1 ? 'country' : 'countries'} selected` : 'Select countries…'}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,22rem)] gap-0 p-0 flex flex-col" align="start">
          <div className="p-2 border-b border-border">
            <Label htmlFor={`${id ?? 'study-country'}-search`} className="sr-only">
              Search countries
            </Label>
            <Input
              id={`${id ?? 'study-country'}-search`}
              className="h-8 text-xs"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[min(18rem,50vh)]">
            <ul className="p-1 space-y-0.5">
              {filtered.map(({ code, name }) => (
                <li key={code}>
                  <label
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/80',
                      disabled && 'opacity-50 pointer-events-none',
                    )}
                  >
                    <Checkbox
                      checked={selectedSet.has(name)}
                      onCheckedChange={() => toggleName(name)}
                      disabled={disabled}
                    />
                    <span className="truncate">{name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
