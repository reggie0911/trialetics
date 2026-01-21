"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { ECRFRecord } from "./ecrf-csv-upload-dialog";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Updater,
} from "@tanstack/react-table";

const REQUIRED_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "EventDate",
  "FormName",
  "QueryType",
  "QueryText",
  "QueryState",
  "QueryResolution",
  "UserName",
  "DateTime",
  "UserRole",
  "QueryRaisedByRole"
];

// Calculate days open and alert status
const calculateAlert = (eventDate: string | undefined, dateTime: string | undefined, queryState: string | undefined) => {
  // Only show alert for "Query Raised" state
  if (queryState !== 'Query Raised') {
    return { daysOpen: 0, alertStatus: "none" };
  }
  
  if (!eventDate || !dateTime) return { daysOpen: 0, alertStatus: "none" };
  
  const startDate = new Date(eventDate);
  const endDate = new Date(dateTime);
  
  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { daysOpen: 0, alertStatus: "none" };
  }
  
  const daysOpen = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Ensure daysOpen is a valid number
  if (isNaN(daysOpen) || daysOpen < 0) {
    return { daysOpen: 0, alertStatus: "none" };
  }
  
  // For "Query Raised" only
  if (daysOpen <= 7) {
    return { daysOpen, alertStatus: "green" };
  } else if (daysOpen <= 30) {
    return { daysOpen, alertStatus: "yellow" };
  } else {
    return { daysOpen, alertStatus: "red" };
  }
};

const getAlertColor = (alertStatus: string) => {
  switch (alertStatus) {
    case "green":
      return "bg-green-100 text-green-800 border-green-200";
    case "yellow":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "red":
      return "bg-red-100 text-red-800 border-red-200";
    case "resolved":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

interface ECRFDataTableProps {
  data: ECRFRecord[];
  headerMappings?: Record<string, string>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (updaterOrValue: Updater<ColumnFiltersState>) => void;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ECRFDataTable({ 
  data, 
  headerMappings = {},
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: ECRFDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);

  const columnFilters = externalColumnFilters !== undefined ? externalColumnFilters : internalColumnFilters;
  const setColumnFilters = onColumnFiltersChange 
    ? onColumnFiltersChange 
    : setInternalColumnFilters;

  const pageCount = Math.ceil(totalRecords / pageSize);

  const columns: ColumnDef<ECRFRecord>[] = useMemo(() => {
    // Add alert column
    const alertColumn: ColumnDef<ECRFRecord> = {
      id: "alert",
      header: "Alert",
      cell: ({ row }) => {
        const { daysOpen, alertStatus } = calculateAlert(
          row.original.EventDate,
          row.original.DateTime,
          row.original.QueryState
        );
        
        // Only show alert for "Query Raised" state
        if (alertStatus === "none") {
          return <div className="flex flex-col items-center gap-1">—</div>;
        }
        
        return (
          <div className="flex flex-col items-center gap-1">
            <div className={`px-2 py-1 rounded text-[10px] font-medium border ${getAlertColor(alertStatus)}`}>
              {daysOpen} days
            </div>
          </div>
        );
      },
      size: 80,
    };

    const dataColumns: ColumnDef<ECRFRecord>[] = REQUIRED_COLUMNS.map((columnId) => ({
      id: columnId,
      accessorKey: columnId,
      header: headerMappings[columnId] || columnId,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className="text-[11px] truncate max-w-[200px]" title={value}>
            {value || "—"}
          </div>
        );
      },
    }));

    return [alertColumn, ...dataColumns];
  }, [headerMappings]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left p-2 font-medium text-[11px] border-r last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 border-r last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  No query records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          Showing {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} to{" "}
          {Math.min(currentPage * pageSize, totalRecords)}{" "}
          of {totalRecords} records
        </div>

        <div className="flex items-center gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 text-[11px] border rounded px-2 bg-background"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="h-7 text-[11px]"
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-7 text-[11px]"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="h-7 text-[11px]"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageCount)}
              disabled={currentPage >= pageCount}
              className="h-7 text-[11px]"
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
