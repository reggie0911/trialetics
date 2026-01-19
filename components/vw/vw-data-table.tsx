"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { VWRecord } from "./vw-csv-upload-dialog";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import { MultiLevelVWHeader, VisitGroupSpan, GROUP_COLORS } from "./vw-multi-level-header";

const REQUIRED_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "EventStatus",
  "ProcedureDate",
  "DeathDate",
  "EventDate",
  "PlannedDate",
  "ProposedDate",
  "WindowStartDate",
  "WindowEndDate",
  "AlertStatus"
];

// Date columns that should be formatted as dd-mmm-yyyy
const DATE_COLUMNS = [
  "ProcedureDate",
  "DeathDate",
  "EventDate",
  "PlannedDate",
  "ProposedDate",
  "WindowStartDate",
  "WindowEndDate"
];

// Format date from YYYY-MM-DD to dd-mmm-yyyy
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === "" || dateStr === "—") {
    return "—";
  }

  try {
    // Parse YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (month < 1 || month > 12) return dateStr;

    const formattedDay = day.toString().padStart(2, '0');
    const formattedMonth = monthNames[month - 1];
    
    return `${formattedDay}-${formattedMonth}-${year}`;
  } catch (error) {
    return dateStr;
  }
};

// Alert status badge component with tooltip
const AlertStatusBadge = ({ 
  status, 
  row 
}: { 
  status?: string;
  row?: VWRecord;
}) => {
  if (!status) return <span>—</span>;
  
  const colors: Record<string, string> = {
    GREEN: "bg-green-500 text-white border-green-500",
    YELLOW: "bg-yellow-500 text-white border-yellow-500",
    RED: "bg-red-500 text-white border-red-500",
  };
  
  // Parse date string properly, handling timezone issues
  const parseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const str = dateStr.trim();
    
    // Try YYYY-MM-DD format (parse as local time, not UTC)
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try MM/DD/YYYY or M/D/YYYY format
    const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try DD-MMM-YYYY format (e.g., 05-Dec-2023)
    const monthNames: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const dmmyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (dmmyMatch) {
      const [, day, monthStr, year] = dmmyMatch;
      const month = monthNames[monthStr.toLowerCase()];
      if (month !== undefined) {
        return new Date(parseInt(year), month, parseInt(day));
      }
    }
    
    // Fallback: try native parsing but normalize to local midnight
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    
    return null;
  };

  // Calculate days out of window if applicable
  const calculateDaysOutOfWindow = (): string | null => {
    if (!row) return null;
    
    const eventDate = parseDate(row.EventDate);
    const windowStart = parseDate(row.WindowStartDate);
    const windowEnd = parseDate(row.WindowEndDate);
    
    if (!eventDate || !windowStart || !windowEnd) {
      return null;
    }
    
    // Check if event is within window (inclusive of boundary dates)
    const eventTime = eventDate.getTime();
    const windowStartTime = windowStart.getTime();
    const windowEndTime = windowEnd.getTime();
    
    if (eventTime >= windowStartTime && eventTime <= windowEndTime) {
      return null; // Within window, no need to show days out
    }
    
    // Calculate days outside window
    if (eventTime < windowStartTime) {
      const daysEarly = Math.floor((windowStartTime - eventTime) / (1000 * 60 * 60 * 24));
      return `${daysEarly} day${daysEarly !== 1 ? 's' : ''} early`;
    } else {
      const daysLate = Math.floor((eventTime - windowEndTime) / (1000 * 60 * 60 * 24));
      return `${daysLate} day${daysLate !== 1 ? 's' : ''} late`;
    }
  };
  
  const daysOutOfWindow = calculateDaysOutOfWindow();
  
  const baseTooltips: Record<string, string> = {
    GREEN: "On Track: Visit completed within window OR window opens ≥8 days from now",
    YELLOW: "Attention Required: Window opens ≤7 days OR >50% of window duration elapsed (applies to upcoming visits only)",
    RED: "Action Required: Visit was outside window OR window missed (overdue) OR ≤3 days remaining",
  };
  
  const getTooltipText = (): string => {
    const baseText = baseTooltips[status] || "Status information";
    if (daysOutOfWindow) {
      return `${baseText}\n\n⚠️ This visit occurred ${daysOutOfWindow}`;
    }
    return baseText;
  };
  
  return (
    <Tooltip>
      <TooltipTrigger className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-help ${colors[status] || ""}`}>
        {status}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-[11px] whitespace-pre-line">
        <p className="font-semibold mb-1">{status} Status</p>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

interface VWDataTableProps {
  data: VWRecord[];
  headerMappings?: Record<string, string>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  visitGroups?: Record<string, string>; // columnId -> visit group name
}

export function VWDataTable({ 
  data, 
  headerMappings = {},
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
  visitGroups = {},
}: VWDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [scrollShadow, setScrollShadow] = useState<{
    left: boolean;
    right: boolean;
  }>({ left: false, right: true });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Use external filters if provided, otherwise use internal
  const columnFilters = externalColumnFilters !== undefined ? externalColumnFilters : internalColumnFilters;
  const setColumnFilters = onColumnFiltersChange 
    ? (updaterOrValue: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
        const newValue = typeof updaterOrValue === 'function' 
          ? updaterOrValue(columnFilters)
          : updaterOrValue;
        onColumnFiltersChange(newValue);
      }
    : setInternalColumnFilters;

  // Handle scroll to show/hide shadows
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setScrollShadow({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1,
    });
  };

  useEffect(() => {
    handleScroll();
  }, [data]);

  // Get unique values for each column
  const columnUniqueValues = useMemo(() => {
    const uniqueValuesMap: Record<string, string[]> = {};
    
    REQUIRED_COLUMNS.forEach((col) => {
      const values = new Set<string>();
      data.forEach((row) => {
        const value = row[col as keyof VWRecord];
        if (value && value !== "") {
          values.add(String(value));
        }
      });
      uniqueValuesMap[col] = Array.from(values).sort();
    });
    
    return uniqueValuesMap;
  }, [data]);

  // Calculate visit group spans
  const visitGroupSpans = useMemo((): VisitGroupSpan[] => {
    const spans: VisitGroupSpan[] = [];
    let currentGroup = '';
    let startIndex = 0;
    let count = 0;

    REQUIRED_COLUMNS.forEach((col, index) => {
      const group = visitGroups[col] || '';
      
      if (!group) {
        // If no visit group, each column is its own span
        if (currentGroup) {
          spans.push({
            visitGroup: currentGroup,
            startIndex,
            columnCount: count,
          });
          currentGroup = '';
          count = 0;
        }
        return;
      }

      if (group !== currentGroup) {
        // Save previous group if exists
        if (currentGroup && count > 0) {
          spans.push({
            visitGroup: currentGroup,
            startIndex,
            columnCount: count,
          });
        }
        // Start new group
        currentGroup = group;
        startIndex = index;
        count = 1;
      } else {
        count++;
      }
    });

    // Add last group
    if (currentGroup && count > 0) {
      spans.push({
        visitGroup: currentGroup,
        startIndex,
        columnCount: count,
      });
    }

    return spans;
  }, [visitGroups]);

  // Create column-to-group mapping for cell coloring
  const columnToGroupIndex = useMemo(() => {
    const map = new Map<string, number>();
    visitGroupSpans.forEach((span, groupIdx) => {
      for (let i = span.startIndex; i < span.startIndex + span.columnCount; i++) {
        if (REQUIRED_COLUMNS[i]) {
          map.set(REQUIRED_COLUMNS[i], groupIdx);
        }
      }
    });
    return map;
  }, [visitGroupSpans]);

  // Create columns from required columns
  const columns: ColumnDef<VWRecord>[] = REQUIRED_COLUMNS.map((col) => ({
    id: col,
    accessorFn: (row) => row[col],
    header: headerMappings[col] || col,
    cell: ({ getValue, row }) => {
      const value = getValue() as string | undefined;
      
      // Special rendering for AlertStatus
      if (col === "AlertStatus") {
        return <AlertStatusBadge status={value} row={row.original} />;
      }
      
      // Date formatting
      if (DATE_COLUMNS.includes(col)) {
        return formatDate(value);
      }
      
      return value || "—";
    },
    filterFn: "equals",
  }));

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-[11px] space-y-2">
        <p className="font-medium">No visit window data available</p>
        <p className="text-center">Upload a CSV file to populate the table</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Left scroll shadow */}
      {scrollShadow.left && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-20" />
      )}
      
      {/* Right scroll shadow */}
      {scrollShadow.right && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-20" />
      )}
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-x-auto border rounded-md"
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-30 bg-background">
            <MultiLevelVWHeader
              headerGroups={table.getHeaderGroups()}
              visitGroupSpans={visitGroupSpans}
              columnIds={REQUIRED_COLUMNS}
              columnUniqueValues={columnUniqueValues}
              columnFilters={columnFilters}
              onColumnFilterChange={(columnId, value) => {
                const column = table.getColumn(columnId);
                column?.setFilterValue(value);
              }}
              onSortingChange={(columnId) => {
                const column = table.getColumn(columnId);
                column?.toggleSorting(column.getIsSorted() === "asc");
              }}
              getSortingState={(columnId) => {
                const column = table.getColumn(columnId);
                return column?.getIsSorted() || false;
              }}
              headerMappings={headerMappings}
            />
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {table.getRowModel().rows.length === 0 ? (
              <tr className="border-b">
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-[12px] text-muted-foreground p-2"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group h-[40px] hover:bg-[#79D7BE] border-b transition-all duration-500 ease-in-out">
                  {row.getVisibleCells().map((cell) => {
                    const value = cell.getValue() as string | undefined;
                    const columnId = cell.column.id;
                    const groupIndex = columnToGroupIndex.get(columnId) ?? 0;
                    const bgColorClass = groupIndex % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd;
                    
                    // Apply date formatting for date columns
                    let formattedValue = value;
                    if (DATE_COLUMNS.includes(columnId) && columnId !== "AlertStatus") {
                      formattedValue = formatDate(value);
                    }
                    
                    // Format cell value
                    const fullValue = formattedValue || "—";
                    let displayValue = fullValue;
                    const isTruncated = displayValue.length > 50;
                    
                    // Truncate long text
                    if (isTruncated) {
                      displayValue = displayValue.substring(0, 50) + "...";
                    }

                    return (
                      <td
                        key={cell.id}
                        className={`text-[12px] p-1 px-2 whitespace-nowrap align-middle ${bgColorClass} group-hover:!bg-transparent`}
                        style={columnId === "SiteName" ? { width: '160px', minWidth: '160px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' } : undefined}
                      >
                        {columnId === "AlertStatus" ? (
                          <AlertStatusBadge status={value} row={row.original} />
                        ) : isTruncated ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="cursor-help">{displayValue}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md text-[12px]">
                              {fullValue}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          displayValue
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <p className="text-[11px] text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
