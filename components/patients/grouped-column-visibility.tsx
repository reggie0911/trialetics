"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnConfig, VisitGroupSpan } from "@/lib/types/patient-data";
import { Eye, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GroupedColumnVisibilityProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  onVisitGroupSpansChange?: (spans: VisitGroupSpan[]) => void;
}

export function GroupedColumnVisibility({
  columns,
  onColumnsChange,
  onVisitGroupSpansChange,
}: GroupedColumnVisibilityProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Group columns by visitGroup
  const groupedColumns = columns.reduce((acc, col) => {
    const group = col.visitGroup || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  // Get ordered groups
  const groups = Object.keys(groupedColumns).sort((a, b) => {
    const aOrder = groupedColumns[a][0]?.tableOrder || 999;
    const bOrder = groupedColumns[b][0]?.tableOrder || 999;
    return aOrder - bOrder;
  });

  const toggleColumn = (columnId: string) => {
    onColumnsChange(
      columns.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const toggleGroup = (group: string, visible: boolean) => {
    const newColumns = columns.map(col =>
      col.visitGroup === group ? { ...col, visible } : col
    );
    onColumnsChange(newColumns);
    
    // Recalculate spans if callback provided
    if (onVisitGroupSpansChange) {
      const visibleCols = newColumns.filter(c => c.visible);
      const spans = recalculateVisitGroupSpans(visibleCols);
      onVisitGroupSpansChange(spans);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" size="sm" className="gap-2" asChild>
        <DialogTrigger>
          <Eye className="h-4 w-4" />
          Columns ({columns.filter(c => c.visible).length}/{columns.length})
        </DialogTrigger>
      </Button>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Column Visibility (Grouped by Visit)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {groups.map(group => {
            const groupCols = groupedColumns[group];
            const allVisible = groupCols.every(c => c.visible);
            const someVisible = groupCols.some(c => c.visible);
            
            return (
              <GroupSection
                key={group}
                group={group}
                columns={groupCols}
                allVisible={allVisible}
                someVisible={someVisible}
                onToggleGroup={toggleGroup}
                onToggleColumn={toggleColumn}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GroupSectionProps {
  group: string;
  columns: ColumnConfig[];
  allVisible: boolean;
  someVisible: boolean;
  onToggleGroup: (group: string, visible: boolean) => void;
  onToggleColumn: (columnId: string) => void;
}

function GroupSection({
  group,
  columns,
  allVisible,
  someVisible,
  onToggleGroup,
  onToggleColumn,
}: GroupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-3 bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <Checkbox
              checked={allVisible}
              onCheckedChange={(checked) => onToggleGroup(group, checked === true)}
              className={someVisible && !allVisible ? "opacity-50" : ""}
            />
            <span className="font-medium text-sm">{group}</span>
            <span className="text-xs text-muted-foreground">
              ({columns.filter(c => c.visible).length}/{columns.length})
            </span>
          </div>
          <CollapsibleTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <div className="p-2 space-y-1">
            {columns
              .sort((a, b) => (a.tableOrder || 0) - (b.tableOrder || 0))
              .map(col => (
                <div key={col.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded">
                  <Checkbox
                    checked={col.visible}
                    onCheckedChange={() => onToggleColumn(col.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{col.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {col.originalLabel}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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
