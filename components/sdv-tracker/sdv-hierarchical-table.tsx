"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { HierarchyNode, flattenHierarchy } from "@/lib/utils/sdv-hierarchy";

interface SDVHierarchicalTableProps {
  hierarchy: HierarchyNode[];
  headerMappings: Record<string, string>;
  onSiteToggle?: (siteName: string) => void;
  loadingSites?: Set<string>;
}

// SDV% badge color logic
function getSDVBadgeColor(percent: number): string {
  if (percent >= 100) return "bg-green-500 text-white";
  if (percent >= 50) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

// Get background color for hierarchy level
function getLevelBackgroundColor(level: string, depth: number): string {
  const colors = {
    site: "bg-blue-50 hover:bg-blue-100",
    subject: "bg-purple-50 hover:bg-purple-100",
    visit: "bg-green-50 hover:bg-green-100",
    crf: "bg-amber-50 hover:bg-amber-100",
    field: "bg-white hover:bg-muted/50",
  };
  return colors[level as keyof typeof colors] || "bg-white hover:bg-muted/50";
}

// Format number with comma separators
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function SDVHierarchicalTable({
  hierarchy,
  headerMappings,
  onSiteToggle,
  loadingSites = new Set(),
}: SDVHierarchicalTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, level: string, siteName: string | null | undefined) => {
    // If it's a site-level node and we have onSiteToggle, use lazy loading
    if (level === 'site' && siteName && onSiteToggle) {
      onSiteToggle(siteName);
    } else {
      // For other levels, just toggle local state
      const newExpanded = new Set(expandedIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpandedIds(newExpanded);
    }
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0 && node.id) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(hierarchy);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Flatten hierarchy for rendering
  const flattenedData = flattenHierarchy(hierarchy, expandedIds);

  // Column headers
  const visibleColumns = [
    { key: "expand", label: "", width: "40px", align: "left" },
    { key: "site_name", label: headerMappings["site_name"] || "Site Name", align: "left" },
    { key: "subject_id", label: headerMappings["subject_id"] || "Subject ID", align: "left" },
    { key: "visit_type", label: headerMappings["visit_type"] || "Visit Type", align: "left" },
    { key: "crf_name", label: headerMappings["crf_name"] || "CRF Name", align: "left" },
    { key: "crf_field", label: headerMappings["crf_field"] || "CRF Field", align: "left" },
    { key: "sdv_percent", label: headerMappings["sdv_percent"] || "SDV%", align: "center" },
    { key: "data_verified", label: headerMappings["data_verified"] || "Data Verified", align: "center" },
    { key: "data_needing_review", label: headerMappings["data_needing_review"] || "Data Needing Review", align: "center" },
    { key: "data_expected", label: headerMappings["data_expected"] || "Data Expected", align: "center" },
    { key: "estimate_hours", label: headerMappings["estimate_hours"] || "Estimate Hours", align: "center" },
    { key: "estimate_days", label: headerMappings["estimate_days"] || "Estimate Days", align: "center" },
  ];

  return (
    <div className="space-y-4">
      {/* Expand/Collapse Controls */}
      <div className="flex gap-2">
        <button
          onClick={expandAll}
          className="text-[11px] text-blue-600 hover:text-blue-800 underline"
        >
          Expand All
        </button>
        <span className="text-[11px] text-muted-foreground">|</span>
        <button
          onClick={collapseAll}
          className="text-[11px] text-blue-600 hover:text-blue-800 underline"
        >
          Collapse All
        </button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-[11px] font-medium whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-[11px] text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              flattenedData.map((row) => {
                const indentPixels = row.depth * 24;
                const isBold = row.level !== 'field';

                return (
                  <TableRow
                    key={row.id}
                    className={getLevelBackgroundColor(row.level, row.depth)}
                  >
                    {/* Expand/Collapse Button with Indentation */}
                    <TableCell className="p-2" style={{ paddingLeft: `${8 + indentPixels}px` }}>
                      {row.hasChildren ? (
                        <button
                          onClick={() => toggleExpand(row.id || '', row.level, row.site_name)}
                          className="hover:bg-gray-200 rounded p-1"
                          disabled={row.level === 'site' && loadingSites.has(row.site_name || '')}
                        >
                          {row.level === 'site' && loadingSites.has(row.site_name || '') ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : row.isExpanded || !row.isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block w-6"></span>
                      )}
                    </TableCell>

                    {/* Site Name - show on all rows */}
                    <TableCell className={`text-[11px] max-w-[200px] truncate ${isBold ? 'font-semibold' : ''}`}>
                      {row.site_name || '-'}
                    </TableCell>

                    {/* Subject ID - show on all rows except site level */}
                    <TableCell className={`text-[11px] ${isBold ? 'font-semibold' : ''}`}>
                      {row.level !== 'site' ? (row.subject_id || '-') : '-'}
                    </TableCell>

                    {/* Visit Type - show on all rows except site and subject levels */}
                    <TableCell className={`text-[11px] ${isBold ? 'font-semibold' : ''}`}>
                      {row.level !== 'site' && row.level !== 'subject' ? (row.visit_type || '-') : '-'}
                    </TableCell>

                    {/* CRF Name - show on all rows except site, subject, and visit levels */}
                    <TableCell className={`text-[11px] ${isBold ? 'font-semibold' : ''}`}>
                      {row.level !== 'site' && row.level !== 'subject' && row.level !== 'visit' ? (row.crf_name || '-') : '-'}
                    </TableCell>

                    {/* CRF Field - only show for field level */}
                    <TableCell className={`text-[11px] ${isBold ? 'font-semibold' : ''}`}>
                      {row.level === 'field' ? (row.crf_field || '-') : '-'}
                    </TableCell>

                    {/* SDV% with colored badge */}
                    <TableCell className="text-[11px] text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-semibold min-w-[40px] ${
                          getSDVBadgeColor(row.sdv_percent || 0)
                        }`}
                      >
                        {Math.round(row.sdv_percent || 0)}%
                      </span>
                    </TableCell>

                    {/* Data Verified */}
                    <TableCell className={`text-[11px] text-center ${isBold ? 'font-semibold' : ''}`}>
                      {formatNumber(row.data_verified || 0)}
                    </TableCell>

                    {/* Data Needing Review */}
                    <TableCell className={`text-[11px] text-center ${isBold ? 'font-semibold' : ''}`}>
                      {formatNumber(row.data_needing_review || 0)}
                    </TableCell>

                    {/* Data Expected */}
                    <TableCell className={`text-[11px] text-center ${isBold ? 'font-semibold' : ''}`}>
                      {formatNumber(row.data_expected || 0)}
                    </TableCell>

                    {/* Estimate Hours */}
                    <TableCell className={`text-[11px] text-center ${isBold ? 'font-semibold' : ''}`}>
                      {formatNumber(Math.round(row.estimate_hours || 0))}
                    </TableCell>

                    {/* Estimate Days */}
                    <TableCell className={`text-[11px] text-center ${isBold ? 'font-semibold' : ''}`}>
                      {formatNumber(Math.round(row.estimate_days || 0))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div>
          Showing {flattenedData.length} rows ({hierarchy.length} sites)
        </div>
      </div>
    </div>
  );
}
