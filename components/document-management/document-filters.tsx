"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { DocumentFilters as DocumentFiltersType } from "@/lib/actions/document-management-data";

interface DocumentFiltersProps {
  filters: DocumentFiltersType;
  onFiltersChange: (filters: DocumentFiltersType) => void;
  onResetAll: () => void;
  filterOptions: {
    documentTypes: string[];
    statuses: string[];
    siteNames: string[];
    projectIds: string[];
  } | null;
}

export function DocumentFilters({ filters, onFiltersChange, onResetAll, filterOptions }: DocumentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveFilters = Object.values(filters).some((value) => value !== "" && value !== undefined);
  const activeFilterCount = Object.values(filters).filter((value) => value !== "" && value !== undefined).length;

  if (!filterOptions) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" size="sm" asChild>
        <SheetTrigger className="text-[11px] h-8">
          <Filter className="h-3 w-3 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
              {activeFilterCount}
            </Badge>
          )}
        </SheetTrigger>
      </Button>
      <SheetContent className="!w-[280px] max-w-[280px]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm">Filters</SheetTitle>
          <SheetDescription className="text-[10px]">
            Filter document records by various criteria
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-2">
          <div className="px-3 py-1 space-y-3">
            <div className="flex items-center justify-between">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onResetAll();
                  }}
                  className="h-6 text-[10px] px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Document Name
                </label>
                <Input
                  placeholder="Search documents..."
                  value={filters.documentName || ""}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, documentName: e.target.value })
                  }
                  className="h-7 text-[10px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Document Type
                </label>
                <Select
                  value={filters.documentType || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, documentType: value === "all" || !value ? "" : value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {filterOptions.documentTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-[10px]">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Status
                </label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, status: value === "all" || !value ? "" : value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {filterOptions.statuses.map((status) => (
                      <SelectItem key={status} value={status} className="text-[10px]">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Site Name
                </label>
                <Select
                  value={filters.siteName || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, siteName: value === "all" || !value ? "" : value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {filterOptions.siteNames.map((site) => (
                      <SelectItem key={site} value={site} className="text-[10px]">{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Project ID
                </label>
                <Select
                  value={filters.projectId || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, projectId: value === "all" || !value ? "" : value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {filterOptions.projectIds.map((project) => (
                      <SelectItem key={project} value={project} className="text-[10px]">{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Expiration Status
                </label>
                <Select
                  value={filters.expirationStatus || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, expirationStatus: value === "all" || !value ? "" : value })
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="expired" className="text-[10px]">Expired</SelectItem>
                    <SelectItem value="expiring_soon" className="text-[10px]">Expiring Soon (≤30 days)</SelectItem>
                    <SelectItem value="not_expired" className="text-[10px]">Not Expired (&gt;30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
