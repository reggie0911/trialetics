'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEtmfCountries, getEtmfSites, getTmfReferenceModel } from '@/lib/actions/etmf';
import type { EtmfDocumentFilters, EtmfCountryOption, EtmfSiteOption, TmfReferenceModel } from '@/lib/types/etmf';

interface DocumentFiltersProps {
  studyId: string | null;
  filters: EtmfDocumentFilters;
  onApply: (filters: EtmfDocumentFilters) => void;
  onClose: () => void;
}

export function DocumentFilters({ studyId, filters, onApply, onClose }: DocumentFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EtmfDocumentFilters>(filters);
  const [countries, setCountries] = useState<EtmfCountryOption[]>([]);
  const [sites, setSites] = useState<EtmfSiteOption[]>([]);
  const [tmfRefs, setTmfRefs] = useState<TmfReferenceModel[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (studyId) {
      startTransition(async () => {
        const [countriesRes, sitesRes, tmfRes] = await Promise.all([
          getEtmfCountries(studyId),
          getEtmfSites(studyId),
          getTmfReferenceModel(),
        ]);
        setCountries(countriesRes.data || []);
        setSites(sitesRes.data || []);
        setTmfRefs(tmfRes.data || []);
      });
    }
  }, [studyId]);

  const zones = [...new Set(tmfRefs.map((r) => r.zone_number))].sort((a, b) => a - b);
  const sections = [...new Set(tmfRefs.map((r) => r.section_number))].sort();
  const artifacts = [...new Set(tmfRefs.map((r) => r.artifact_name))].sort();

  const handleReset = () => {
    setLocalFilters({});
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const toggleStatus = (status: 'placeholder' | 'qc_review' | 'rejected' | 'approved') => {
    const current = localFilters.document_status || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setLocalFilters({ ...localFilters, document_status: next.length > 0 ? next : undefined });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium">Advance Filters</CardTitle>
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
          <Label className="text-xs">Document Status</Label>
          <div className="flex flex-col gap-2">
            {(['placeholder', 'qc_review', 'rejected', 'approved'] as const).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <Checkbox
                  id={status}
                  checked={localFilters.document_status?.includes(status) ?? false}
                  onCheckedChange={() => toggleStatus(status)}
                />
                <label htmlFor={status} className="text-xs capitalize">
                  {status.replace('_', ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Country Name</Label>
          <Select
            value={localFilters.country_id || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, country_id: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Countries">
                {localFilters.country_id 
                  ? countries.find(c => c.id === localFilters.country_id)?.country_name || 'All Countries'
                  : 'All Countries'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All Countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.country_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Site Name</Label>
          <Select
            value={localFilters.site_id || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, site_id: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Sites">
                {localFilters.site_id 
                  ? sites.find(s => s.id === localFilters.site_id)?.name || 'All Sites'
                  : 'All Sites'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All Sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Zone Name</Label>
          <Select
            value={localFilters.zone_number?.toString() || ''}
            onValueChange={(v) =>
              setLocalFilters({ ...localFilters, zone_number: v ? parseInt(v) : undefined })
            }
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Zones">
                {localFilters.zone_number 
                  ? tmfRefs.find(r => r.zone_number === localFilters.zone_number)?.zone_name || 'All Zones'
                  : 'All Zones'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All Zones</SelectItem>
              {zones.map((z) => {
                const zoneRef = tmfRefs.find((r) => r.zone_number === z);
                return (
                  <SelectItem key={z} value={z.toString()} className="text-xs">
                    {zoneRef?.zone_name || `Zone ${z}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Section Name</Label>
          <Select
            value={localFilters.section_number || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, section_number: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Sections">
                {localFilters.section_number 
                  ? tmfRefs.find(r => r.section_number === localFilters.section_number)?.section_name || 'All Sections'
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
          <Label className="text-xs">Artifact Name</Label>
          <Select
            value={localFilters.artifact_number || ''}
            onValueChange={(v) => setLocalFilters({ ...localFilters, artifact_number: v || undefined })}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Artifacts">
                {localFilters.artifact_number || 'All Artifacts'}
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

        <div className="col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
