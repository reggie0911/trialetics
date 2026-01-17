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
import { AERecord } from "./ae-csv-upload-dialog";

interface AEFiltersProps {
  filters: {
    siteName: string;
    subjectId: string;
    aeDecod: string;
    aeSer: string;
    aeExp: string;
    aeOut: string;
    aeSerCat1: string;
  };
  onFiltersChange: (filters: AEFiltersProps["filters"]) => void;
  onResetAll?: () => void;
  data: AERecord[];
}

export function AEFilters({ filters, onFiltersChange, onResetAll, data }: AEFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Get unique values for each filter
  const uniqueValues = useMemo(() => {
    const siteNames = new Set<string>();
    const subjectIds = new Set<string>();
    const aeDecods = new Set<string>();
    const aeSers = new Set<string>();
    const aeExps = new Set<string>();
    const aeOuts = new Set<string>();
    const aeSerCat1s = new Set<string>();

    data.forEach((row) => {
      if (row.SiteName) siteNames.add(row.SiteName);
      if (row.SubjectId) subjectIds.add(row.SubjectId);
      if (row.AEDECOD) aeDecods.add(row.AEDECOD);
      if (row.AESER) aeSers.add(row.AESER);
      if (row.AEEXP) aeExps.add(row.AEEXP);
      if (row.AEOUT) aeOuts.add(row.AEOUT);
      if (row.AESERCAT1) aeSerCat1s.add(row.AESERCAT1);
    });

    return {
      siteNames: Array.from(siteNames).sort(),
      subjectIds: Array.from(subjectIds).sort(),
      aeDecods: Array.from(aeDecods).sort(),
      aeSers: Array.from(aeSers).sort(),
      aeExps: Array.from(aeExps).sort(),
      aeOuts: Array.from(aeOuts).sort(),
      aeSerCat1s: Array.from(aeSerCat1s).sort(),
    };
  }, [data]);

  const handleReset = () => {
    // Reset top filters
    onFiltersChange({
      siteName: "",
      subjectId: "",
      aeDecod: "",
      aeSer: "",
      aeExp: "",
      aeOut: "",
      aeSerCat1: "",
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

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category" className="text-[11px]">
              Category
            </Label>
            <Select
              value={filters.aeDecod}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, aeDecod: value || "" })
              }
            >
              <SelectTrigger id="category" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.aeDecods.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-[11px]">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deaths */}
          <div className="space-y-1">
            <Label htmlFor="deaths" className="text-[11px]">
              Deaths
            </Label>
            <Select
              value={filters.aeSerCat1}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, aeSerCat1: value || "" })
              }
            >
              <SelectTrigger id="deaths" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.aeSerCat1s.map((status) => (
                  <SelectItem key={status} value={status} className="text-[11px]">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SAE/ AE Status */}
          <div className="space-y-1">
            <Label htmlFor="sae-ae-status" className="text-[11px]">
              SAE/ AE Status
            </Label>
            <Select
              value={filters.aeSer}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, aeSer: value || "" })
              }
            >
              <SelectTrigger id="sae-ae-status" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.aeSers.map((status) => (
                  <SelectItem key={status} value={status} className="text-[11px]">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second Row - 5 More Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
          {/* Study Procedure - Causality */}
          <div className="space-y-1">
            <Label htmlFor="study-proc-causality" className="text-[11px]">
              Study Procedure - Causality
            </Label>
            <Select
              value={filters.aeExp}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, aeExp: value || "" })
              }
            >
              <SelectTrigger id="study-proc-causality" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.aeExps.map((exp) => (
                  <SelectItem key={exp} value={exp} className="text-[11px]">
                    {exp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PLAR Loading Tools - Causality */}
          <div className="space-y-1">
            <Label htmlFor="plar-loading" className="text-[11px]">
              PLAR Loading Tools - Causality
            </Label>
            <Select value="" onValueChange={() => {}}>
              <SelectTrigger id="plar-loading" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PLAR Transseptal Sheath - Causality */}
          <div className="space-y-1">
            <Label htmlFor="plar-transseptal" className="text-[11px]">
              PLAR Transseptal Sheath - Causality
            </Label>
            <Select value="" onValueChange={() => {}}>
              <SelectTrigger id="plar-transseptal" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PLAR Delivery System - Causality */}
          <div className="space-y-1">
            <Label htmlFor="plar-delivery" className="text-[11px]">
              PLAR Delivery System - Causality
            </Label>
            <Select value="" onValueChange={() => {}}>
              <SelectTrigger id="plar-delivery" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PLAR Implant - Causality */}
          <div className="space-y-1">
            <Label htmlFor="plar-implant" className="text-[11px]">
              PLAR Implant - Causality
            </Label>
            <Select
              value={filters.aeOut}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, aeOut: value || "" })
              }
            >
              <SelectTrigger id="plar-implant" className="h-8 text-[11px] w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="" className="text-[11px]">Choose an option...</SelectItem>
                {uniqueValues.aeOuts.map((out) => (
                  <SelectItem key={out} value={out} className="text-[11px]">
                    {out}
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
