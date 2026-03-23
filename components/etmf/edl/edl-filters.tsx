'use client';

import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TmfReferenceModel, EtmfEdlFilters } from '@/lib/types/etmf';

interface EdlFiltersProps {
  tmfRefs: TmfReferenceModel[];
  filters: EtmfEdlFilters;
  onApply: (filters: EtmfEdlFilters) => void;
  onClose: () => void;
}

export function EdlFilters({ tmfRefs, filters, onApply, onClose }: EdlFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EtmfEdlFilters>(filters);

  const zones = [...new Set(tmfRefs.map((r) => r.zone_number))].sort((a, b) => a - b);
  const sections = [...new Set(tmfRefs.map((r) => r.section_number))].sort();
  const artifacts = [...new Set(tmfRefs.map((r) => r.artifact_number))].sort();

  const handleReset = () => {
    setLocalFilters({});
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium">Filters</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Zone</Label>
          <Select
            value={localFilters.zone_number?.toString() || ''}
            onValueChange={(v) =>
              setLocalFilters({ ...localFilters, zone_number: v ? parseInt(v) : undefined })
            }
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Zones">
                {localFilters.zone_number 
                  ? `Zone ${localFilters.zone_number}`
                  : 'All Zones'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All Zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z} value={z.toString()} className="text-xs">
                  Zone {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Section</Label>
          <Select
            value={localFilters.section_number || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, section_number: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Sections">
                {localFilters.section_number 
                  ? tmfRefs.find(r => r.section_number === localFilters.section_number)?.section_name || localFilters.section_number
                  : 'All Sections'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="" className="text-xs">All Sections</SelectItem>
              {sections.map((s) => {
                const sectionRef = tmfRefs.find((r) => r.section_number === s);
                return (
                  <SelectItem key={s} value={s} className="text-xs">
                    {sectionRef?.section_name || s}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Artifact</Label>
          <Select
            value={localFilters.artifact_number || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, artifact_number: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Artifacts">
                {localFilters.artifact_number 
                  ? tmfRefs.find(r => r.artifact_number === localFilters.artifact_number)?.artifact_name || localFilters.artifact_number
                  : 'All Artifacts'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="" className="text-xs">All Artifacts</SelectItem>
              {artifacts.map((a) => {
                const artRef = tmfRefs.find((r) => r.artifact_number === a);
                return (
                  <SelectItem key={a} value={a} className="text-xs">
                    {artRef?.artifact_name || a}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Core Or Recommended</Label>
          <Select
            value={localFilters.core_or_recommended || ''}
            onValueChange={(v) =>
              setLocalFilters({
                ...localFilters,
                core_or_recommended: v as 'Core' | 'Recommended' | undefined,
              })
            }
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All">
                {localFilters.core_or_recommended || 'All'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All</SelectItem>
              <SelectItem value="Core" className="text-xs">Core</SelectItem>
              <SelectItem value="Recommended" className="text-xs">Recommended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onApply(localFilters)}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
