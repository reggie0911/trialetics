"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AERecord } from "./ae-csv-upload-dialog";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

const REQUIRED_COLUMNS = [
  "SiteName",
  "SubjectId",
  "AESTDAT",
  "RWOSDAT",
  "AESER",
  "AESERCAT1",
  "AEEXP",
  "AEDECOD",
  "AEOUT",
  "IM_AEREL",
  "IS_AEREL",
  "DS_AEREL",
  "LT_AEREL",
  "PR_AEREL",
];

// Date columns that should be formatted as dd-mmm-yyyy
const DATE_COLUMNS = ["AESTDAT", "RWOSDAT"];

// Format date from YYYY-MM-DD to dd-mmm-yyyy
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || dateStr === "" || dateStr === "—") {
    return "—";
  }

  try {
    // Parse YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr; // Return original if not in expected format

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    // Month names abbreviated
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (month < 1 || month > 12) return dateStr;

    // Format as dd-mmm-yyyy
    const formattedDay = day.toString().padStart(2, '0');
    const formattedMonth = monthNames[month - 1];
    
    return `${formattedDay}-${formattedMonth}-${year}`;
  } catch (error) {
    return dateStr; // Return original if parsing fails
  }
};

interface AEDataTableProps {
  data: AERecord[];
  headerMappings?: Record<string, string>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}

export function AEDataTable({ 
  data, 
  headerMappings = {},
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
}: AEDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
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
        const value = row[col as keyof AERecord];
        if (value && value !== "") {
          values.add(String(value));
        }
      });
      uniqueValuesMap[col] = Array.from(values).sort();
    });
    
    return uniqueValuesMap;
  }, [data]);

  // Create columns from required columns
  const columns: ColumnDef<AERecord>[] = REQUIRED_COLUMNS.map((col) => ({
    accessorKey: col,
    header: headerMappings[col] || col,
    cell: ({ getValue }) => {
      const value = getValue() as string | undefined;
      
      // Format date columns
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
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-[11px] space-y-2">
        <p className="font-medium">No adverse event data available</p>
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
        className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] border rounded-md"
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-30 bg-background">
            {/* Combined Column Headers & Filters Row */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-background border-b">
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const uniqueValues = columnUniqueValues[column.id] || [];
                  const currentValue = column.getFilterValue() as string | undefined;
                  
                  return (
                    <th
                      key={header.id}
                      className="text-[12px] p-1 px-2 font-medium whitespace-nowrap bg-background border-b text-left align-middle"
                    >
                      {/* Header Label with Sort */}
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 mb-1"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      
                      {/* Filter Dropdown */}
                      <Select
                        value={currentValue || "all"}
                        onValueChange={(value) => {
                          column.setFilterValue(value === "all" ? undefined : value);
                        }}
                      >
                        <SelectTrigger className="h-3.5 text-[11px] bg-background text-muted-foreground border-0 shadow-none">
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
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#F000FF]/20 border-b transition-all duration-500 ease-in-out">
                  {row.getVisibleCells().map((cell) => {
                    const value = cell.getValue() as string | undefined;
                    const columnId = cell.column.id;
                    
                    // Apply date formatting for date columns
                    let formattedValue = value;
                    if (DATE_COLUMNS.includes(columnId)) {
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
                        className="text-[12px] p-1 px-2 whitespace-nowrap align-middle"
                      >
                        {isTruncated ? (
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
    </div>
  );
}
