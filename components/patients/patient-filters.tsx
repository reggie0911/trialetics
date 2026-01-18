"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PatientRecord } from "@/lib/types/patient-data";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PatientFiltersProps {
  data: PatientRecord[];
  selectedPatientId: string;
  selectedSiteName: string;
  onPatientIdChange: (patientId: string) => void;
  onSiteNameChange: (siteName: string) => void;
}

export function PatientFilters({
  data,
  selectedPatientId,
  selectedSiteName,
  onPatientIdChange,
  onSiteNameChange,
}: PatientFiltersProps) {
  // Get unique patient IDs (filtered by site if site is selected)
  const patientIds = useMemo(() => {
    const ids = new Set<string>();
    data.forEach((record) => {
      // If site is selected, only show patients at that site
      if (selectedSiteName) {
        const site = record.SiteName || record['Site Name'];
        if (site !== selectedSiteName) {
          return; // Skip this record
        }
      }
      
      const id = record.SubjectId || record['Subject ID'];
      if (id && id !== '' && id !== '—') {
        ids.add(id);
      }
    });
    return Array.from(ids).sort();
  }, [data, selectedSiteName]);

  // Get unique site names (filtered by patient if patient is selected)
  const siteNames = useMemo(() => {
    const sites = new Set<string>();
    data.forEach((record) => {
      // If patient is selected, only show sites where that patient exists
      if (selectedPatientId) {
        const id = record.SubjectId || record['Subject ID'];
        if (id !== selectedPatientId) {
          return; // Skip this record
        }
      }
      
      const site = record.SiteName || record['Site Name'];
      if (site && site !== '' && site !== '—') {
        sites.add(site);
      }
    });
    return Array.from(sites).sort();
  }, [data, selectedPatientId]);

  const handleClearFilters = () => {
    onPatientIdChange('');
    onSiteNameChange('');
  };

  const hasActiveFilters = selectedPatientId !== '' || selectedSiteName !== '';

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {/* Patient ID Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="patient-id-filter" className="text-xs font-medium">
          Patient ID
          {selectedSiteName && (
            <span className="text-muted-foreground ml-1">
              (at {selectedSiteName})
            </span>
          )}
        </Label>
        <Select
          value={selectedPatientId}
          onValueChange={(value) => onPatientIdChange(value || '')}
        >
          <SelectTrigger id="patient-id-filter" size="sm" className="w-[200px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Patients</SelectItem>
            {patientIds.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Site Name Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="site-name-filter" className="text-xs font-medium">
          Site Name
          {selectedPatientId && (
            <span className="text-muted-foreground ml-1">
              (for {selectedPatientId})
            </span>
          )}
        </Label>
        <Select
          value={selectedSiteName}
          onValueChange={(value) => onSiteNameChange(value || '')}
        >
          <SelectTrigger id="site-name-filter" size="sm" className="w-[200px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Sites</SelectItem>
            {siteNames.map((site) => (
              <SelectItem key={site} value={site}>
                {site}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-8 px-2 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
