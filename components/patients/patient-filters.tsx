"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PatientRecord } from "@/lib/types/patient-data";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PatientFiltersProps {
  data: PatientRecord[];
  selectedPatientId: string;
  selectedSiteName: string;
  searchQuery: string;
  onPatientIdChange: (patientId: string) => void;
  onSiteNameChange: (siteName: string) => void;
  onSearchChange: (query: string) => void;
}

export function PatientFilters({
  data,
  selectedPatientId,
  selectedSiteName,
  searchQuery,
  onPatientIdChange,
  onSiteNameChange,
  onSearchChange,
}: PatientFiltersProps) {
  // Local state for search input (before executing search)
  const [searchInput, setSearchInput] = useState(searchQuery);

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
    onSearchChange('');
    setSearchInput('');
  };

  const handleSearch = () => {
    onSearchChange(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasActiveFilters = selectedPatientId !== '' || selectedSiteName !== '' || searchQuery !== '';

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {/* Patient ID Filter */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="patient-id-filter" className="text-xs font-medium h-4 flex items-center">
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
          <SelectTrigger id="patient-id-filter" size="sm" className="w-[200px] text-[12px] h-8">
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="site-name-filter" className="text-xs font-medium h-4 flex items-center">
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
          <SelectTrigger id="site-name-filter" size="sm" className="w-[200px] text-[12px] h-8">
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

      {/* Search Bar */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="table-search" className="text-xs font-medium h-4 flex items-center">
          Search Table
        </Label>
        <div className="flex gap-2">
          <div className="relative w-[200px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="table-search"
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 pl-8 pr-8 text-[12px]"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleSearch}
            className="h-8 px-3 text-xs"
          >
            <Search className="h-3 w-3 mr-1" />
            Search
          </Button>
        </div>
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
