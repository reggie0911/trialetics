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
import { VWRecord } from "./vw-csv-upload-dialog";

interface VWFiltersProps {
  filters: {
    siteName: string;
    subjectId: string;
    eventName: string;
    eventStatus: string;
    alertStatus: string;
  };
  onFiltersChange: (filters: VWFiltersProps["filters"]) => void;
  onResetAll?: () => void;
  data: VWRecord[];
}

export function VWFilters({ filters, onFiltersChange, onResetAll, data }: VWFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Get unique values for each filter
  const uniqueValues = useMemo(() => {
    const siteNames = new Set<string>();
    const subjectIds = new Set<string>();
    const eventNames = new Set<string>();
    const eventStatuses = new Set<string>();
    const alertStatuses = new Set<string>();

    data.forEach((row) => {
      if (row.SiteName) siteNames.add(row.SiteName);
      if (row.SubjectId) subjectIds.add(row.SubjectId);
      if (row.EventName) eventNames.add(row.EventName);
      if (row.EventStatus) eventStatuses.add(row.EventStatus);
      if (row.AlertStatus) alertStatuses.add(row.AlertStatus);
    });

    return {
      siteNames: Array.from(siteNames).sort(),
      subjectIds: Array.from(subjectIds).sort(),
      eventNames: Array.from(eventNames).sort(),
      eventStatuses: Array.from(eventStatuses).sort(),
      alertStatuses: Array.from(alertStatuses).sort(),
    };
  }, [data]);

  const handleReset = () => {
    // Reset top filters
    onFiltersChange({
      siteName: "",
      subjectId: "",
      eventName: "",
      eventStatus: "",
      alertStatus: "",
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
            {/* First Row - 5 Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

          {/* Subject ID */}
          <div className="space-y-1">
            <Label htmlFor="subject-id" className="text-[11px]">
              Subject ID
            </Label>
            <Select
              value={filters.subjectId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, subjectId: value || "" })
              }
            >
              <SelectTrigger id="subject-id" className="h-8 text-[11px] w-full">
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

          {/* Event Name */}
          <div className="space-y-1">
            <Label htmlFor="event-name" className="text-[11px]">
              Event Name
            </Label>
            <Select
              value={filters.eventName}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, eventName: value || "" })
              }
            >
              <SelectTrigger id="event-name" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.eventNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-[11px]">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Status */}
          <div className="space-y-1">
            <Label htmlFor="event-status" className="text-[11px]">
              Event Status
            </Label>
            <Select
              value={filters.eventStatus}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, eventStatus: value || "" })
              }
            >
              <SelectTrigger id="event-status" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.eventStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="text-[11px]">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alert Status */}
          <div className="space-y-1">
            <Label htmlFor="alert-status" className="text-[11px]">
              Alert Status
            </Label>
            <Select
              value={filters.alertStatus}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, alertStatus: value || "" })
              }
            >
              <SelectTrigger id="alert-status" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.alertStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="text-[11px]">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
