"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { ECRFRecord } from "./ecrf-csv-upload-dialog";

interface ECRFFiltersProps {
  filters: {
    siteName: string;
    subjectId: string;
    eventName: string;
    formName: string;
    queryType: string;
    queryState: string;
    userRole: string;
    queryRaisedByRole: string;
  };
  onFiltersChange: (filters: ECRFFiltersProps["filters"]) => void;
  onResetAll: () => void;
  data: ECRFRecord[];
  filterOptions: {
    siteNames: string[];
    subjectIds: string[];
    eventNames: string[];
    formNames: string[];
    queryTypes: string[];
    queryStates: string[];
    userRoles: string[];
    queryRaisedByRoles: string[];
  } | null;
}

export function ECRFFilters({ filters, onFiltersChange, onResetAll, data, filterOptions }: ECRFFiltersProps) {
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  if (!filterOptions) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              className="h-7 text-[11px]"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Site Name
            </label>
            <Select
              value={filters.siteName || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, siteName: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {filterOptions.siteNames.map((site) => (
                  <SelectItem key={site} value={site} className="text-[11px]">{site}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Subject ID
            </label>
            <Select
              value={filters.subjectId || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, subjectId: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filterOptions.subjectIds.map((subject) => (
                  <SelectItem key={subject} value={subject} className="text-[11px]">{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Event Name
            </label>
            <Select
              value={filters.eventName || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, eventName: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {filterOptions.eventNames.map((event) => (
                  <SelectItem key={event} value={event} className="text-[11px]">{event}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Form Name
            </label>
            <Select
              value={filters.formName || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, formName: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {filterOptions.formNames.map((form) => (
                  <SelectItem key={form} value={form} className="text-[11px]">{form}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Query Type
            </label>
            <Select
              value={filters.queryType || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, queryType: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions.queryTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-[11px]">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Query State
            </label>
            <Select
              value={filters.queryState || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, queryState: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {filterOptions.queryStates.map((state) => (
                  <SelectItem key={state} value={state} className="text-[11px]">{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              User Role
            </label>
            <Select
              value={filters.userRole || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, userRole: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All User Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All User Roles</SelectItem>
                {filterOptions.userRoles.map((role) => (
                  <SelectItem key={role} value={role} className="text-[11px]">{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Query Raised By
            </label>
            <Select
              value={filters.queryRaisedByRole || "all"}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, queryRaisedByRole: value === "all" || !value ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-[11px] w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {filterOptions.queryRaisedByRoles.map((role) => (
                  <SelectItem key={role} value={role} className="text-[11px]">{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          Showing {data.length} query records
        </div>
      </CardContent>
    </Card>
  );
}
