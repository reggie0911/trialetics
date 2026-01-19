"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { MCRecord } from "./mc-csv-upload-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  transformToPivotData,
  PivotRow,
  VisitData,
  FieldChange,
  generateVisitGroupSpans,
} from "@/lib/utils/mc-pivot-transformer";

// Alternating group colors
const GROUP_COLORS = {
  even: 'bg-white',
  odd: 'bg-gray-200',
};

// Date columns that should be formatted as dd-mmm-yyyy
const DATE_FIELDS = ['startDate', 'stopDate', 'procedureDate'];

// Format date from YYYY-MM-DD to dd-mmm-yyyy
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === "" || dateStr === "—") {
    return "—";
  }

  try {
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

// Header labels for visit fields
const VISIT_FIELD_LABELS: Record<string, string> = {
  medicationName: 'Medication Name',
  dose: 'Dose',
  unit: 'Unit',
  frequency: 'Frequency',
  startDate: 'Start Date',
  startDateUnknown: 'Start Date Unknown',
  stopDate: 'Stop Date',
  status: 'Status',
  changeStatus: 'Change Status',
};

const VISIT_FIELDS: (keyof VisitData)[] = [
  'medicationName',
  'dose',
  'unit',
  'frequency',
  'startDate',
  'startDateUnknown',
  'stopDate',
  'status',
  'changeStatus',
];

// Change status filter type
type ChangeStatusFilterType = 'all' | 'Yes' | 'No' | '-';

interface MCPivotDataTableProps {
  data: MCRecord[];
  headerMappings?: Record<string, string>;
  changeStatusFilter?: ChangeStatusFilterType;
}

export function MCPivotDataTable({ 
  data,
  changeStatusFilter = 'all', 
  headerMappings = {},
}: MCPivotDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [scrollShadow, setScrollShadow] = useState<{
    left: boolean;
    right: boolean;
  }>({ left: false, right: true });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Transform data to pivot format
  const pivotResult = useMemo(() => {
    return transformToPivotData(data);
  }, [data]);

  const { rows: allPivotRows, visitOrder } = pivotResult;
  
  // Filter pivot rows based on change status filter
  const pivotRows = useMemo(() => {
    if (changeStatusFilter === 'all') {
      return allPivotRows;
    }
    
    // Filter rows that have at least one visit with the selected change status
    return allPivotRows.filter(row => {
      return Object.values(row.visits).some(visitData => {
        return visitData.changeStatus === changeStatusFilter;
      });
    });
  }, [allPivotRows, changeStatusFilter]);

  // Generate visit group spans for header coloring
  const visitGroupSpans = useMemo(() => {
    return generateVisitGroupSpans(visitOrder);
  }, [visitOrder]);

  // Create column-to-group mapping for cell coloring
  const columnToGroupIndex = useMemo(() => {
    const map = new Map<string, number>();
    
    // Static columns are group 0
    map.set('siteName', 0);
    map.set('subjectId', 0);
    map.set('procedureDate', 0);
    
    // Visit columns
    visitOrder.forEach((visit, visitIdx) => {
      VISIT_FIELDS.forEach((field) => {
        map.set(`${visit}__${field}`, visitIdx + 1);
      });
    });
    
    return map;
  }, [visitOrder]);

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
  }, [pivotRows]);

  // Get unique values for each column for filtering
  const columnUniqueValues = useMemo(() => {
    const uniqueValuesMap: Record<string, string[]> = {};
    
    // Static columns
    ['siteName', 'subjectId', 'procedureDate', 'canonicalMedName'].forEach((col) => {
      const values = new Set<string>();
      pivotRows.forEach((row) => {
        const value = row[col as keyof PivotRow] as string;
        if (value && value !== "") {
          values.add(value);
        }
      });
      uniqueValuesMap[col] = Array.from(values).sort();
    });
    
    // Visit columns
    for (const visit of visitOrder) {
      for (const field of VISIT_FIELDS) {
        const colId = `${visit}__${field}`;
        const values = new Set<string>();
        pivotRows.forEach((row) => {
          const visitData = row.visits[visit];
          if (visitData) {
            const value = visitData[field];
            if (value && value !== "" && typeof value === 'string') {
              values.add(value);
            }
          }
        });
        uniqueValuesMap[colId] = Array.from(values).sort();
      }
    }
    
    return uniqueValuesMap;
  }, [pivotRows, visitOrder]);

  // Create column definitions
  const columns: ColumnDef<PivotRow>[] = useMemo(() => {
    const cols: ColumnDef<PivotRow>[] = [];
    
    // Static columns
    cols.push({
      id: 'siteName',
      accessorFn: (row) => row.siteName,
      header: headerMappings['SiteName'] || 'Site Name',
      cell: ({ getValue }) => getValue() || "—",
      filterFn: "equals",
    });
    
    cols.push({
      id: 'subjectId',
      accessorFn: (row) => row.subjectId,
      header: headerMappings['SubjectId'] || 'Patient ID',
      cell: ({ getValue }) => getValue() || "—",
      filterFn: "equals",
    });
    
    cols.push({
      id: 'procedureDate',
      accessorFn: (row) => row.procedureDate,
      header: headerMappings['E02_V2[1].PRO_01.PEP[1].PEPDAT'] || 'Procedure Date',
      cell: ({ getValue }) => formatDate(getValue() as string),
      filterFn: "equals",
    });
    
    // Visit columns
    for (const visit of visitOrder) {
      for (const field of VISIT_FIELDS) {
        const colId = `${visit}__${field}`;
        
        cols.push({
          id: colId,
          accessorFn: (row) => row.visits[visit]?.[field] || '',
          header: VISIT_FIELD_LABELS[field],
          cell: ({ getValue }) => {
            const value = getValue() as string;
            if (DATE_FIELDS.includes(field)) {
              return formatDate(value) || "—";
            }
            return value || "—";
          },
          filterFn: "equals",
          meta: {
            visitName: visit,
            field,
          },
        });
      }
    }
    
    return cols;
  }, [visitOrder, headerMappings]);

  const table = useReactTable({
    data: pivotRows,
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
        <p className="font-medium">No medication data available</p>
        <p className="text-center">Upload a CSV file to populate the table</p>
      </div>
    );
  }

  // Track previous subjectId for row grouping visual
  let prevSubjectId = '';

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
            {/* Visit Group Row */}
            <tr>
              {visitGroupSpans.map((span, idx) => (
                <th
                  key={`visit-group-${idx}`}
                  colSpan={span.columnCount}
                  className={`text-center font-bold border-r text-xs py-2 ${idx % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd}`}
                >
                  {span.visitGroup}
                </th>
              ))}
            </tr>
            
            {/* Column Name Row */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-background border-b">
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const uniqueValues = columnUniqueValues[columnId] || [];
                  const currentValue = columnFilters.find((f) => f.id === columnId)?.value as string | undefined;
                  const groupIndex = columnToGroupIndex.get(columnId) ?? 0;
                  const bgColorClass = groupIndex % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd;

                  return (
                    <th
                      key={header.id}
                      className={`text-[12px] p-1 px-2 font-medium whitespace-nowrap border-b text-left align-middle ${bgColorClass}`}
                    >
                      {/* Header Label with Sort */}
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 mb-1"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      
                      {/* Filter Dropdown */}
                      <Select
                        value={currentValue || "all"}
                        onValueChange={(value) => {
                          header.column.setFilterValue(value === "all" ? undefined : value);
                        }}
                      >
                        <SelectTrigger className="h-3.5 text-[11px] bg-background text-muted-foreground border-0 shadow-none pb-2 justify-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all" className="text-[11px]">
                            All
                          </SelectItem>
                          {uniqueValues.map((value) => (
                            <SelectItem key={value} value={value} className="text-[11px]">
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                  );
                })}
              </tr>
            ))}
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
              table.getRowModel().rows.map((row, rowIndex) => {
                const currentSubjectId = row.original.subjectId;
                const isNewPatient = currentSubjectId !== prevSubjectId;
                prevSubjectId = currentSubjectId;
                
                return (
                  <tr 
                    key={row.id} 
                    className={`group h-[40px] hover:bg-[#79D7BE] border-b transition-all duration-500 ease-in-out ${isNewPatient && rowIndex > 0 ? 'border-t-2 border-t-gray-400' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const value = cell.getValue() as string | undefined;
                      const columnId = cell.column.id;
                      const groupIndex = columnToGroupIndex.get(columnId) ?? 0;
                      const bgColorClass = groupIndex % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd;
                      
                      // Check if this is a changeStatus column
                      const meta = cell.column.columnDef.meta as { field?: string; visitName?: string } | undefined;
                      const isChangeStatus = meta?.field === 'changeStatus';
                      const isDateField = meta?.field && DATE_FIELDS.includes(meta.field);
                      const visitName = meta?.visitName;
                      
                      // Get changed fields for tooltip if this is a changeStatus column
                      let changedFields: FieldChange[] = [];
                      if (isChangeStatus && visitName && value === 'Yes') {
                        const visitData = row.original.visits[visitName];
                        if (visitData?.changedFields) {
                          changedFields = visitData.changedFields;
                        }
                      }
                      
                      // Format value
                      let displayValue = value || "—";
                      if (isDateField) {
                        displayValue = formatDate(value);
                      }
                      
                      // Change status styling
                      let changeStatusClass = '';
                      if (isChangeStatus && value === 'Yes') {
                        changeStatusClass = 'bg-yellow-200 text-yellow-800 font-medium';
                      } else if (isChangeStatus && value === 'No') {
                        changeStatusClass = 'bg-green-100 text-green-700';
                      }
                      
                      const isTruncated = displayValue.length > 30;
                      const truncatedValue = isTruncated ? displayValue.substring(0, 30) + "..." : displayValue;
                      
                      // Show tooltip for change status with changes, or for truncated text
                      const showChangeTooltip = isChangeStatus && value === 'Yes' && changedFields.length > 0;

                      return (
                        <td
                          key={cell.id}
                          className={`text-[12px] p-1 px-2 whitespace-nowrap align-middle ${bgColorClass} group-hover:!bg-transparent ${changeStatusClass}`}
                        >
                          {showChangeTooltip ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="cursor-help underline decoration-dotted">{displayValue}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md text-[12px] p-3">
                                <div className="font-semibold mb-2">Changes from previous visit:</div>
                                <div className="space-y-1.5">
                                  {changedFields.map((change, idx) => (
                                    <div key={idx} className="flex flex-col">
                                      <span className="font-medium text-yellow-700">{change.fieldLabel}:</span>
                                      <div className="ml-2 text-[11px]">
                                        <span className="text-red-600 line-through">{change.previousValue}</span>
                                        <span className="mx-1">→</span>
                                        <span className="text-green-600">{change.currentValue}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : isTruncated ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="cursor-help">{truncatedValue}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md text-[12px]">
                                {displayValue}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            displayValue
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
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
