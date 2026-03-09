'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCountryNames, getRegionForCountry, GEOGRAPHIC_REGIONS } from '@/lib/data/countries';
import type { CountryEntry } from '@/lib/actions/projects';

export interface CountryRegionEntryFieldsProps {
  value: CountryEntry;
  onChange: (value: CountryEntry) => void;
  index?: number;
  showDelete?: boolean;
  onDelete?: () => void;
}

export function CountryRegionEntryFields({
  value,
  onChange,
  index,
  showDelete,
  onDelete,
}: CountryRegionEntryFieldsProps) {
  const update = (updates: Partial<CountryEntry>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {index != null ? `Country ${index + 1}` : 'Country / Region'}
        </span>
        {showDelete && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Country Name</Label>
          <Select
            value={value.countryName}
            onValueChange={(val) =>
              update({
                countryName: val,
                countryRegion: getRegionForCountry(val) || value.countryRegion || '',
              })
            }
          >
            <SelectTrigger className="w-full text-[11px] h-8">
              <SelectValue>{value.countryName || 'Select country'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getCountryNames().map((name) => (
                <SelectItem key={name} value={name} className="text-[11px]">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Region</Label>
          <Select
            value={value.countryRegion || ''}
            onValueChange={(val) => update({ countryRegion: val })}
          >
            <SelectTrigger className="w-full text-[11px] h-8">
              <SelectValue>{value.countryRegion || 'Select region'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GEOGRAPHIC_REGIONS.map((region) => (
                <SelectItem key={region} value={region} className="text-[11px]">
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Planned Sites</Label>
          <Input
            type="number"
            min={0}
            value={value.plannedSites ?? ''}
            onChange={(e) =>
              update({ plannedSites: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
            placeholder="0"
            className="text-[11px] h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Planned Subjects</Label>
          <Input
            type="number"
            min={0}
            value={value.plannedSubjects ?? ''}
            onChange={(e) =>
              update({ plannedSubjects: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
            placeholder="0"
            className="text-[11px] h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Start Date</Label>
          <Input
            type="date"
            value={value.plannedStartDate || ''}
            onChange={(e) => update({ plannedStartDate: e.target.value })}
            className="text-[11px] h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">End Date</Label>
          <Input
            type="date"
            value={value.plannedEndDate || ''}
            onChange={(e) => update({ plannedEndDate: e.target.value })}
            className="text-[11px] h-8"
          />
        </div>
      </div>
    </div>
  );
}
