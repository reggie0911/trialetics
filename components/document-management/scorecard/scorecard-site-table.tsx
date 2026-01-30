"use client";

import { useState, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight, ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteComplianceScore, SortField, SortDirection } from "./scorecard-types";
import { getComplianceColor, getComplianceBgColor } from "./scorecard-calculator";
import { ScorecardCategoryDetails } from "./scorecard-category-details";

interface ScorecardSiteTableProps {
  siteScores: SiteComplianceScore[];
  onViewMissing: (site: SiteComplianceScore) => void;
}

export function ScorecardSiteTable({ siteScores, onViewMissing }: ScorecardSiteTableProps) {
  const [sortField, setSortField] = useState<SortField>("siteNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  // Sort sites
  const sortedSites = useMemo(() => {
    return [...siteScores].sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [siteScores, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleExpanded = (siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={cn(
        "text-left p-2 font-medium text-[11px] cursor-pointer hover:bg-muted/50 select-none",
        className
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={cn(
            "h-3 w-3",
            sortField === field ? "text-foreground" : "text-muted-foreground/50"
          )}
        />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-sm border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-semibold">Site Compliance Breakdown</h2>
        <p className="text-[11px] text-muted-foreground">
          Click on a row to view category-level details
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-[#B8D4E3] border-b">
            <tr>
              <th className="w-8 p-2"></th>
              <SortableHeader field="siteNumber" className="w-20">
                Site #
              </SortableHeader>
              <SortableHeader field="siteName" className="min-w-[150px]">
                Site Name
              </SortableHeader>
              <SortableHeader field="lastUpdated" className="w-28">
                Last Updated
              </SortableHeader>
              <SortableHeader field="overallCompletionPercent" className="w-32">
                Completion
              </SortableHeader>
              <SortableHeader field="tmfCompliancePercent" className="w-24">
                TMF %
              </SortableHeader>
              <SortableHeader field="siteCompliancePercent" className="w-24">
                Site %
              </SortableHeader>
              <SortableHeader field="missingDocuments" className="w-24">
                Missing
              </SortableHeader>
              <th className="w-24 p-2 text-center font-medium text-[11px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSites.map((site, index) => {
              const isExpanded = expandedSites.has(site.siteId);
              const isOdd = index % 2 === 1;

              return (
                <Fragment key={site.siteId}>
                  <tr
                    className={cn(
                      "border-b hover:bg-muted/30 cursor-pointer",
                      isOdd ? "bg-[#D6EAF8]/30" : "bg-white"
                    )}
                    onClick={() => toggleExpanded(site.siteId)}
                  >
                    <td className="p-2 text-center">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-2 font-medium">{site.siteNumber}</td>
                    <td className="p-2">{site.siteName}</td>
                    <td className="p-2 text-muted-foreground">{site.lastUpdated}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              getComplianceBgColor(site.overallCompletionPercent)
                            )}
                            style={{
                              width: `${Math.min(site.overallCompletionPercent, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            getComplianceColor(site.overallCompletionPercent)
                          )}
                        >
                          {site.overallCompletionPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <span
                        className={cn(
                          "font-medium",
                          getComplianceColor(site.tmfCompliancePercent)
                        )}
                      >
                        {site.tmfCompliancePercent}%
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={cn(
                          "font-medium",
                          getComplianceColor(site.siteCompliancePercent)
                        )}
                      >
                        {site.siteCompliancePercent}%
                      </span>
                    </td>
                    <td className="p-2">
                      {site.missingDocuments > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewMissing(site);
                          }}
                        >
                          {site.missingDocuments} missing
                        </Button>
                      ) : (
                        <span className="text-green-600 font-medium">0</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <Link
                        href={`/protected/document-management/reconciliation?siteId=${site.siteId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <ScorecardCategoryDetails
                          categoryScores={site.categoryScores}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
