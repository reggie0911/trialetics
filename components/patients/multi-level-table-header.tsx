"use client";

import { CSSProperties } from "react";
import {
  Header,
  flexRender,
} from "@tanstack/react-table";
import {
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PatientRecord, ColumnConfig, VisitGroupSpan } from "@/lib/types/patient-data";
import { EditableTableHeader } from "./editable-table-header";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

// Alternating group colors - using Tailwind classes for better CSS specificity
const GROUP_COLORS = {
  even: 'bg-white',           // White
  odd: 'bg-gray-100',         // Light grey (more visible)
};

interface MultiLevelTableHeaderProps {
  headerGroups: any[];
  visitGroupSpans: VisitGroupSpan[];
  columnConfigs: ColumnConfig[];
  onColumnLabelChange: (columnId: string, newLabel: string) => void;
}

export function MultiLevelTableHeader({
  headerGroups,
  visitGroupSpans,
  columnConfigs,
  onColumnLabelChange,
}: MultiLevelTableHeaderProps) {
  // Only render visit group row if we have spans
  const hasVisitGroups = visitGroupSpans.length > 0;

  // Create a mapping of column id to group index for coloring
  const columnToGroupIndex = new Map<string, number>();
  visitGroupSpans.forEach((span, groupIdx) => {
    // Get columns for this span based on startIndex and columnCount
    const visibleConfigs = columnConfigs;
    for (let i = span.startIndex; i < span.startIndex + span.columnCount; i++) {
      if (visibleConfigs[i]) {
        columnToGroupIndex.set(visibleConfigs[i].id, groupIdx);
      }
    }
  });

  return (
    <>
      {/* Visit Group Row */}
      {hasVisitGroups && (
        <TableRow>
          {visitGroupSpans.map((span, idx) => (
            <TableHead
              key={`visit-group-${idx}`}
              colSpan={span.columnCount}
              className={`text-center font-bold border-r text-xs py-2 ${idx % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd}`}
            >
              {span.visitGroup}
            </TableHead>
          ))}
        </TableRow>
      )}

      {/* Column Name Row */}
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header: any, idx: number) => {
            const groupIndex = columnToGroupIndex.get(header.column.id) ?? 0;
            return (
              <DraggableTableHeader
                key={header.id}
                header={header}
                isFirstColumn={idx === 0}
                columnConfig={columnConfigs.find((c) => c.id === header.column.id)}
                onColumnLabelChange={onColumnLabelChange}
                groupIndex={groupIndex}
              />
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

// Export for use in data cells
export { GROUP_COLORS };

// Draggable Table Header Component
interface DraggableTableHeaderProps {
  header: Header<PatientRecord, unknown>;
  isFirstColumn: boolean;
  columnConfig?: ColumnConfig;
  onColumnLabelChange: (columnId: string, newLabel: string) => void;
  groupIndex: number;
}

function DraggableTableHeader({
  header,
  isFirstColumn,
  columnConfig,
  onColumnLabelChange,
  groupIndex,
}: DraggableTableHeaderProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
  });

  // Use alternating group color class
  const bgColorClass = groupIndex % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd;

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: isFirstColumn ? "sticky" : "relative",
    left: isFirstColumn ? 0 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: "nowrap",
    minWidth: "120px",
    zIndex: isDragging ? 1 : isFirstColumn ? 30 : 0,
  };

  return (
    <TableHead
      ref={setNodeRef}
      className={`text-xs font-semibold text-center ${bgColorClass}`}
      style={style}
    >
      <div className="flex items-center justify-center gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3 opacity-60" aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-center">
          {columnConfig ? (
            <EditableTableHeader
              columnId={header.column.id}
              label={columnConfig.label}
              originalLabel={columnConfig.originalLabel}
              onLabelChange={onColumnLabelChange}
            />
          ) : (
            <span>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
          )}
        </div>
      </div>
    </TableHead>
  );
}
