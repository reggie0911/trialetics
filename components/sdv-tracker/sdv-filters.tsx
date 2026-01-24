"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, MoreHorizontal, Settings } from "lucide-react";
import { SDVFilters as SDVFiltersType } from "@/lib/actions/sdv-tracker-data";

interface SDVFiltersProps {
  filters: SDVFiltersType;
  onFiltersChange: (filters: SDVFiltersType) => void;
  onResetAll: () => void;
  filterOptions: {
    siteNames: string[];
    subjectIds: string[];
    visitTypes: string[];
    crfNames: string[];
  } | null;
}

export function SDVFilters({ 
  filters, 
  onFiltersChange, 
  onResetAll,
  filterOptions
}: SDVFiltersProps) {
  const handleFilterChange = (key: keyof SDVFiltersType, value: string | null) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" || !value ? "" : value,
    });
  };

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Site Name Filter */}
          <div className="flex-1 min-w-[200px] max-w-[200px]">
            <label className="text-[10px] text-muted-foreground mb-1 block">
              Site Name
            </label>
            <Select
              value={filters.siteName || "all"}
              onValueChange={(value) => handleFilterChange("siteName", value)}
            >
              <SelectTrigger className="h-9 text-[11px] w-full">
                <SelectValue placeholder="Site Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {filterOptions?.siteNames.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject ID Filter */}
          <div className="flex-1 min-w-[200px] max-w-[200px]">
            <label className="text-[10px] text-muted-foreground mb-1 block">
              Subject ID
            </label>
            <Select
              value={filters.subjectId || "all"}
              onValueChange={(value) => handleFilterChange("subjectId", value)}
            >
              <SelectTrigger className="h-9 text-[11px] w-full">
                <SelectValue placeholder="Subject ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filterOptions?.subjectIds.map((subjectId) => (
                  <SelectItem key={subjectId} value={subjectId}>
                    {subjectId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              className="h-9 text-[11px]"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[11px]"
            >
              More
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[11px]"
            >
              Admin
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
