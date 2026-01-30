"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react";
import { DocumentRecord } from "./document-csv-upload-dialog";
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
  "DocumentName",
  "DocumentType",
  "DocumentCategory",
  "Version",
  "Status",
  "SiteName",
  "ProjectId",
  "UploadDate",
  "ApprovalDate",
  "ExpirationDate",
  "ApprovedBy",
  "FileUrl",
  "FileSize",
];

// Calculate expiration alert status
const calculateExpirationAlert = (expirationDate: string | undefined) => {
  if (!expirationDate) {
    return { daysUntilExpiration: null, alertStatus: "none" };
  }
  
  const expDate = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  // Check if date is valid
  if (isNaN(expDate.getTime())) {
    return { daysUntilExpiration: null, alertStatus: "none" };
  }
  
  const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Expired
  if (daysUntilExpiration < 0) {
    return { daysUntilExpiration: Math.abs(daysUntilExpiration), alertStatus: "red" };
  }
  // Expiring soon (≤30 days)
  else if (daysUntilExpiration <= 30) {
    return { daysUntilExpiration, alertStatus: "yellow" };
  }
  // Not expired (>30 days)
  else {
    return { daysUntilExpiration, alertStatus: "green" };
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
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getAlertLabel = (alertStatus: string, daysUntilExpiration: number | null) => {
  if (alertStatus === "none" || daysUntilExpiration === null) {
    return "—";
  }
  
  if (alertStatus === "red") {
    return `Expired ${daysUntilExpiration}d ago`;
  } else if (alertStatus === "yellow") {
    return `Expires in ${daysUntilExpiration}d`;
  } else {
    return `${daysUntilExpiration}d remaining`;
  }
};

interface DocumentDataTableProps {
  data: DocumentRecord[];
  headerMappings?: Record<string, string>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (updaterOrValue: Updater<ColumnFiltersState>) => void;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onViewDocument?: (filePath: string, fileName?: string) => void;
}

export function DocumentDataTable({ 
  data, 
  headerMappings = {},
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
  currentPage,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  onViewDocument,
}: DocumentDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);

  const columnFilters = externalColumnFilters !== undefined ? externalColumnFilters : internalColumnFilters;
  const setColumnFilters = onColumnFiltersChange 
    ? onColumnFiltersChange 
    : setInternalColumnFilters;

  const pageCount = Math.ceil(totalRecords / pageSize);

  const columns: ColumnDef<DocumentRecord>[] = useMemo(() => {
    const dataColumns: ColumnDef<DocumentRecord>[] = REQUIRED_COLUMNS.map((columnId) => ({
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

    // Add Actions column with View button if onViewDocument is provided
    if (onViewDocument) {
      dataColumns.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const fileUrl = row.original.FileUrl;
          const documentName = row.original.DocumentName;
          
          if (!fileUrl) {
            return <div className="text-[11px] text-muted-foreground">—</div>;
          }

          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDocument(fileUrl, documentName)}
              className="h-6 text-[10px] px-2"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          );
        },
      });
    }

    return dataColumns;
  }, [headerMappings, onViewDocument]);

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
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full text-[11px] bg-white">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left p-2 font-medium text-[11px] border-r last:border-r-0 cursor-pointer hover:bg-muted/70"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
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
                  No document records found
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
              <option value={20}>20</option>
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
