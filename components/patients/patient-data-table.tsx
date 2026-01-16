import { useState, useEffect, useId, CSSProperties } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Header,
  Cell,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PatientRecord, ColumnConfig, VisitGroupSpan } from "@/lib/types/patient-data";
import { MultiLevelTableHeader, GROUP_COLORS } from "./multi-level-table-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PatientDataTableProps {
  data: PatientRecord[];
  columnConfigs: ColumnConfig[];
  visitGroupSpans: VisitGroupSpan[];
  onColumnLabelChange: (columnId: string, newLabel: string) => void;
  columnOrder: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
  onVisitGroupSpansChange: (spans: VisitGroupSpan[]) => void;
  onRowDoubleClick?: (patient: PatientRecord) => void;
}

export function PatientDataTable({
  data,
  columnConfigs,
  visitGroupSpans,
  onColumnLabelChange,
  columnOrder,
  onColumnOrderChange,
  onVisitGroupSpansChange,
  onRowDoubleClick,
}: PatientDataTableProps) {
  const [scrollShadow, setScrollShadow] = useState<{
    left: boolean;
    right: boolean;
  }>({ left: false, right: true });
  const [sorting, setSorting] = useState<SortingState>([]);
  const dndId = useId();

  const visibleColumns = columnConfigs.filter((col) => col.visible);

  // Create a mapping of column id to group index for alternating colors
  const columnToGroupIndex = new Map<string, number>();
  visitGroupSpans.forEach((span, groupIdx) => {
    for (let i = span.startIndex; i < span.startIndex + span.columnCount; i++) {
      if (visibleColumns[i]) {
        columnToGroupIndex.set(visibleColumns[i].id, groupIdx);
      }
    }
  });

  // Create TanStack Table columns from config - simplified for draggable headers
  // IMPORTANT: Use accessorFn instead of accessorKey to handle column names with 
  // special characters like dots and brackets (e.g., "E01_V1[1].SCR_01.VS[1].SEX")
  // accessorKey would interpret these as nested property paths, causing undefined values
  const columns: ColumnDef<PatientRecord>[] = visibleColumns.map((col) => ({
    accessorFn: (row) => row[col.id],
    id: col.id,
    enableSorting: true,
  }));

  // Initialize TanStack Table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: (updaterOrValue) => {
      const newOrder = typeof updaterOrValue === 'function' 
        ? updaterOrValue(columnOrder) 
        : updaterOrValue;
      onColumnOrderChange(newOrder);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      onColumnOrderChange(newOrder);
      
      // Recalculate visit group spans after reorder
      const reorderedConfigs = newOrder.map(id => columnConfigs.find(c => c.id === id)!).filter(Boolean);
      const newSpans = recalculateVisitGroupSpans(reorderedConfigs);
      onVisitGroupSpansChange(newSpans);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const scrollWidth = target.scrollWidth;
    const clientWidth = target.clientWidth;

    setScrollShadow({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1,
    });
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-xs space-y-2">
        <p className="font-medium">No patient data available</p>
        <p className="text-center">
          1. Upload header mapping CSV to define column structure<br />
          2. Upload patient data CSV to populate the table
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll shadows */}
      {scrollShadow.left && (
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}
      {scrollShadow.right && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}

      <div
        className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] border rounded-md"
        onScroll={handleScroll}
      >
        <DndContext
          id={dndId}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table>
            <TableHeader className="sticky top-0 z-20">
              <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                <MultiLevelTableHeader
                  headerGroups={table.getHeaderGroups()}
                  visitGroupSpans={visitGroupSpans}
                  columnConfigs={visibleColumns}
                  onColumnLabelChange={onColumnLabelChange}
                />
              </SortableContext>
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id}
                    onDoubleClick={() => onRowDoubleClick?.(row.original)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell, colIdx) => {
                      const groupIndex = columnToGroupIndex.get(cell.column.id) ?? 0;
                      const columnConfig = visibleColumns.find(c => c.id === cell.column.id);
                      return (
                        <SortableContext key={cell.id} items={columnOrder} strategy={horizontalListSortingStrategy}>
                          <DragAlongCell
                            key={cell.id}
                            cell={cell}
                            isFirstColumn={colIdx === 0}
                            columnConfig={columnConfig}
                            groupIndex={groupIndex}
                            rowData={row.original}
                          />
                        </SortableContext>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Table info - removed since pagination info is shown below */}
      <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
        {sorting.length > 0 && (
          <div className="flex items-center gap-1">
            <span>Sorted by:</span>
            {sorting.map((sort, idx) => {
              const col = visibleColumns.find(c => c.id === sort.id);
              return (
                <span key={sort.id} className="font-medium">
                  {col?.label || sort.id} ({sort.desc ? "desc" : "asc"}){idx < sorting.length - 1 && ","}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to recalculate visit group spans
function recalculateVisitGroupSpans(configs: ColumnConfig[]): VisitGroupSpan[] {
  const spans: VisitGroupSpan[] = [];
  let currentGroup = '';
  let startIndex = 0;
  let count = 0;

  configs.forEach((config, index) => {
    const group = config.visitGroup || 'Other';
    
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
}

// Draggable Cell Component
interface DragAlongCellProps {
  cell: Cell<PatientRecord, unknown>;
  isFirstColumn: boolean;
  columnConfig?: ColumnConfig;
  groupIndex: number;
  rowData: PatientRecord;
}

function DragAlongCell({ cell, isFirstColumn, columnConfig, groupIndex, rowData }: DragAlongCellProps) {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
  });

  // Use alternating group color class
  const bgColorClass = groupIndex % 2 === 0 ? GROUP_COLORS.even : GROUP_COLORS.odd;

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: isFirstColumn ? "sticky" : "relative",
    left: isFirstColumn ? 0 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : isFirstColumn ? 10 : 0,
  };

  const value = cell.getValue() as string | undefined;
  const formattedValue = formatCellValue(value, columnConfig?.dataType || "text");
  const colorClass = getCellColor(cell.column.id, value);

  // Get patient context info for tooltip
  const patientId = rowData.SubjectId || rowData['Subject ID'] || '—';
  const siteName = rowData.SiteName || rowData['Site Name'] || '—';
  const visitGroup = columnConfig?.visitGroup || 'Other';

  return (
    <TableCell
      ref={setNodeRef}
      className={`text-xs p-1 px-2 whitespace-nowrap text-center ${bgColorClass} ${
        isFirstColumn ? "font-medium" : ""
      }`}
      style={style}
    >
      <Tooltip>
        <TooltipTrigger className={`cursor-default ${colorClass}`}>
          {formattedValue}
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-sm" side="top">
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-muted-foreground">Patient:</span>
              <span className="font-medium">{patientId}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Site:</span>
              <span className="font-medium">{siteName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Visit Group:</span>
              <span className="font-medium">{visitGroup}</span>
            </div>
            {value && value.length > 50 && (
              <div className="pt-1 border-t mt-1">
                <span className="text-muted-foreground">Value:</span>
                <p className="mt-0.5">{value}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

// Helper functions for cell formatting
function formatCellValue(value: string | undefined, dataType: string) {
  if (!value || value === "") return "—";
  
  // Format dates
  if (dataType === "date" && value.includes("/")) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return value;
    }
  }
  
  // Truncate long text
  if (value.length > 50) {
    return value.substring(0, 50) + "...";
  }
  
  return value;
}

function getCellColor(columnId: string, value: string | undefined) {
  // Color coding for status fields
  if (columnId.includes("RAMCD")) {
    if (value === "Green") return "text-green-600";
    if (value === "Yellow") return "text-yellow-600";
    if (value === "Red") return "text-red-600";
  }
  
  if (columnId.includes("Locked") && value) {
    return "text-blue-600 font-medium";
  }
  
  return "";
}
