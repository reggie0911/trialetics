"use client";

import { CSSProperties } from "react";
import {
  Header,
  flexRender,
} from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MCRecord } from "./mc-csv-upload-dialog";

// Alternating group colors
const GROUP_COLORS = {
  even: 'bg-white',
  odd: 'bg-gray-200',
};

export { GROUP_COLORS };

export interface VisitGroupSpan {
  visitGroup: string;
  startIndex: number;
  columnCount: number;
}

interface MultiLevelMCHeaderProps {
  headerGroups: any[];
  visitGroupSpans: VisitGroupSpan[];
  columnIds: string[];
  columnUniqueValues: Record<string, string[]>;
  columnFilters: any[];
  onColumnFilterChange: (columnId: string, value: string | undefined) => void;
  onSortingChange: (columnId: string) => void;
  getSortingState: (columnId: string) => false | "asc" | "desc";
  headerMappings: Record<string, string>;
}

export function MultiLevelMCHeader({
  headerGroups,
  visitGroupSpans,
  columnIds,
  columnUniqueValues,
  columnFilters,
  onColumnFilterChange,
  onSortingChange,
  getSortingState,
  headerMappings,
}: MultiLevelMCHeaderProps) {
  const hasVisitGroups = visitGroupSpans.length > 0;

  // Create a mapping of column id to group index for coloring
  const columnToGroupIndex = new Map<string, number>();
  visitGroupSpans.forEach((span, groupIdx) => {
    for (let i = span.startIndex; i < span.startIndex + span.columnCount; i++) {
      if (columnIds[i]) {
        columnToGroupIndex.set(columnIds[i], groupIdx);
      }
    }
  });

  return (
    <>
      {/* Visit Group Row */}
      {hasVisitGroups && (
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
      )}

      {/* Column Name Row */}
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} className="bg-background border-b">
          {headerGroup.headers.map((header: any) => {
            const column = header.column;
            const columnId = column.id;
            const uniqueValues = columnUniqueValues[columnId] || [];
            const currentValue = columnFilters.find((f: any) => f.id === columnId)?.value as string | undefined;
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
                  onClick={() => onSortingChange(columnId)}
                >
                  {headerMappings[columnId] || columnId}
                  {{
                    asc: " ↑",
                    desc: " ↓",
                  }[getSortingState(columnId) as string] ?? null}
                </div>
                
                {/* Filter Dropdown */}
                <Select
                  value={currentValue || "all"}
                  onValueChange={(value) => {
                    onColumnFilterChange(columnId, value === "all" ? undefined : (value || undefined));
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
    </>
  );
}
