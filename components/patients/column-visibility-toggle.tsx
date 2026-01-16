"use client";

import { useState } from "react";
import { Eye, EyeOff, Columns } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ColumnConfig } from "@/lib/types/patient-data";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export function ColumnVisibilityToggle({
  columns,
  onColumnsChange,
}: ColumnVisibilityToggleProps) {
  const [open, setOpen] = useState(false);

  // Group columns by category
  const groupedColumns = columns.reduce(
    (acc, col) => {
      const category = col.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(col);
      return acc;
    },
    {} as Record<string, ColumnConfig[]>
  );

  const categoryLabels: Record<string, string> = {
    demographics: "Demographics",
    visits: "Visit Information",
    measurements: "Clinical Measurements",
    adverse_events: "Adverse Events",
    other: "Other",
  };

  const handleToggleColumn = (columnId: string) => {
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const handleToggleCategory = (category: string, visible: boolean) => {
    const updatedColumns = columns.map((col) =>
      col.category === category ? { ...col, visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const handleToggleAll = (visible: boolean) => {
    const updatedColumns = columns.map((col) => ({ ...col, visible }));
    onColumnsChange(updatedColumns);
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-none border-input hover:bg-accent hover:text-accent-foreground h-9 px-4"
      >
        <Columns className="w-3 h-3" />
        Columns ({visibleCount}/{columns.length})
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Column Visibility</DialogTitle>
          <DialogDescription className="text-[10px]">
            Show or hide columns in the patient data table
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle all buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(true)}
              className="text-xs"
            >
              <Eye className="w-3 h-3" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleAll(false)}
              className="text-xs"
            >
              <EyeOff className="w-3 h-3" />
              Hide All
            </Button>
          </div>

          {/* Column groups */}
          <ScrollArea className="h-[400px] border rounded-md p-3">
            <div className="space-y-4">
              {Object.entries(groupedColumns).map(([category, cols]) => {
                const categoryVisible = cols.filter((c) => c.visible).length;
                const categoryTotal = cols.length;

                return (
                  <div key={category} className="space-y-2">
                    {/* Category header */}
                    <div className="flex items-center justify-between sticky top-0 bg-background py-1 border-b">
                      <Label className="text-xs font-semibold">
                        {categoryLabels[category] || category}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {categoryVisible}/{categoryTotal}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleCategory(category, categoryVisible < categoryTotal)
                          }
                          className="h-6 text-xs"
                        >
                          {categoryVisible < categoryTotal ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Show All
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Hide All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Column checkboxes */}
                    <div className="space-y-2 pl-2">
                      {cols.map((col) => (
                        <div
                          key={col.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={col.id}
                            checked={col.visible}
                            onCheckedChange={() => handleToggleColumn(col.id)}
                          />
                          <Label
                            htmlFor={col.id}
                            className="text-xs cursor-pointer flex-1"
                          >
                            {col.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
