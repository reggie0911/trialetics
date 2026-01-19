"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { MCRecord } from "./mc-csv-upload-dialog";

// Change status filter type
export type ChangeStatusFilterType = 'all' | 'Yes' | 'No' | '-';

interface MCFiltersProps {
  filters: {
    siteName: string;
    subjectId: string;
    medicationName: string;
    indication: string;
    ongoingStatus: string;
    frequency: string;
  };
  onFiltersChange: (filters: MCFiltersProps["filters"]) => void;
  onResetAll?: () => void;
  data: MCRecord[];
  // Pivot view specific props
  viewMode?: 'standard' | 'pivot';
  changeStatusFilter?: ChangeStatusFilterType;
  onChangeStatusFilterChange?: (value: ChangeStatusFilterType) => void;
}

export function MCFilters({ 
  filters, 
  onFiltersChange, 
  onResetAll, 
  data,
  viewMode = 'standard',
  changeStatusFilter = 'all',
  onChangeStatusFilterChange,
}: MCFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Get unique values for each filter
  const uniqueValues = useMemo(() => {
    const siteNames = new Set<string>();
    const subjectIds = new Set<string>();
    const medicationNames = new Set<string>();
    const indications = new Set<string>();
    const ongoingStatuses = new Set<string>();
    const frequencies = new Set<string>();

    data.forEach((row) => {
      if (row.SiteName) siteNames.add(row.SiteName);
      if (row.SubjectId) subjectIds.add(row.SubjectId);
      if (row["1.CCMED"]) medicationNames.add(row["1.CCMED"]);
      if (row["1.CCIND"]) indications.add(row["1.CCIND"]);
      if (row["1.CCONGO1"]) ongoingStatuses.add(row["1.CCONGO1"]);
      if (row["1.CCFREQ"]) frequencies.add(row["1.CCFREQ"]);
    });

    return {
      siteNames: Array.from(siteNames).sort(),
      subjectIds: Array.from(subjectIds).sort(),
      medicationNames: Array.from(medicationNames).sort(),
      indications: Array.from(indications).sort(),
      ongoingStatuses: Array.from(ongoingStatuses).sort(),
      frequencies: Array.from(frequencies).sort(),
    };
  }, [data]);

  const handleReset = () => {
    // Reset top filters
    onFiltersChange({
      siteName: "",
      subjectId: "",
      medicationName: "",
      indication: "",
      ongoingStatus: "",
      frequency: "",
    });
    // Reset column filters and chart selection
    onResetAll?.();
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className={isOpen ? "pb-3" : "py-2"}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Filters</CardTitle>
            <CollapsibleTrigger className="inline-flex items-center justify-center h-6 w-6 p-0 rounded-md hover:bg-accent hover:text-accent-foreground">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* First Row - 6 Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Site Name */}
          <div className="space-y-1">
            <Label htmlFor="site-name" className="text-[11px]">
              Site Name
            </Label>
            <Select
              value={filters.siteName}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, siteName: value || "" })
              }
            >
              <SelectTrigger id="site-name" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.siteNames.map((site) => (
                  <SelectItem key={site} value={site} className="text-[11px]">
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient ID */}
          <div className="space-y-1">
            <Label htmlFor="patient-id" className="text-[11px]">
              Patient ID
            </Label>
            <Select
              value={filters.subjectId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, subjectId: value || "" })
              }
            >
              <SelectTrigger id="patient-id" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.subjectIds.map((id) => (
                  <SelectItem key={id} value={id} className="text-[11px]">
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Medication Name */}
          <div className="space-y-1">
            <Label htmlFor="medication-name" className="text-[11px]">
              Medication Name
            </Label>
            <Select
              value={filters.medicationName}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, medicationName: value || "" })
              }
            >
              <SelectTrigger id="medication-name" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.medicationNames.map((med) => (
                  <SelectItem key={med} value={med} className="text-[11px]">
                    {med}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indication */}
          <div className="space-y-1">
            <Label htmlFor="indication" className="text-[11px]">
              Indication
            </Label>
            <Select
              value={filters.indication}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, indication: value || "" })
              }
            >
              <SelectTrigger id="indication" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.indications.map((ind) => (
                  <SelectItem key={ind} value={ind} className="text-[11px]">
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ongoing Status */}
          <div className="space-y-1">
            <Label htmlFor="ongoing-status" className="text-[11px]">
              Ongoing Status
            </Label>
            <Select
              value={filters.ongoingStatus}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, ongoingStatus: value || "" })
              }
            >
              <SelectTrigger id="ongoing-status" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.ongoingStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="text-[11px]">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-1">
            <Label htmlFor="frequency" className="text-[11px]">
              Frequency
            </Label>
            <Select
              value={filters.frequency}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, frequency: value || "" })
              }
            >
              <SelectTrigger id="frequency" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.frequencies.map((freq) => (
                  <SelectItem key={freq} value={freq} className="text-[11px]">
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Status - Only visible in Pivot View */}
          {viewMode === 'pivot' && (
            <div className="space-y-1">
              <Label htmlFor="change-status" className="text-[11px]">
                Change Status
              </Label>
              <Select
                value={changeStatusFilter}
                onValueChange={(value) =>
                  onChangeStatusFilterChange?.(value as ChangeStatusFilterType)
                }
              >
                <SelectTrigger id="change-status" className="h-8 text-[11px] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  <SelectItem value="all" className="text-[11px]">All</SelectItem>
                  <SelectItem value="Yes" className="text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                      Has Changes (Yes)
                    </span>
                  </SelectItem>
                  <SelectItem value="No" className="text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      No Changes (No)
                    </span>
                  </SelectItem>
                  <SelectItem value="-" className="text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      First Visit (-)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Reset Button Row */}
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-[11px]"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset All Filters
          </Button>
        </div>
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
  );
}
