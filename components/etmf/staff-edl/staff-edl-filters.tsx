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
import type { TmfReferenceModel, EtmfStaffEdlFilters } from '@/lib/types/etmf';

interface StaffEdlFiltersProps {
  tmfRefs: TmfReferenceModel[];
  filters: EtmfStaffEdlFilters;
  onApply: (filters: EtmfStaffEdlFilters) => void;
  onClose: () => void;
}

export function StaffEdlFilters({ tmfRefs, filters, onApply, onClose }: StaffEdlFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EtmfStaffEdlFilters>(filters);

  const siteLevelRefs = tmfRefs.filter((r) => r.site_level_document);
  const artifacts = [...new Set(siteLevelRefs.map((r) => r.artifact_name))].sort();
  const subArtifacts = [...new Set(siteLevelRefs.map((r) => r.recommended_sub_artifact).filter(Boolean))].sort() as string[];

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
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Artifact Name</Label>
          <Select
            value={localFilters.artifact_name || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, artifact_name: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Artifacts">
                {localFilters.artifact_name || 'All Artifacts'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="" className="text-xs">All Artifacts</SelectItem>
              {artifacts.map((a) => (
                <SelectItem key={a} value={a} className="text-xs truncate max-w-[250px]">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Sub-Artifact</Label>
          <Select
            value={localFilters.sub_artifact || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, sub_artifact: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Sub-Artifacts">
                {localFilters.sub_artifact || 'All Sub-Artifacts'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="" className="text-xs">All Sub-Artifacts</SelectItem>
              {subArtifacts.map((s) => (
                <SelectItem key={s} value={s} className="text-xs truncate max-w-[250px]">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(localFilters)}>Apply</Button>
        </div>
      </CardContent>
    </Card>
  );
}
