"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReconciliationStatusCell } from "./reconciliation-status-cell";
import { ReconciliationDatePicker } from "./reconciliation-date-picker";
import {
  ReconciliationDocument,
  ReconciliationStatus,
  ColumnDefinition,
} from "./reconciliation-types";

interface ReconciliationDocumentRowProps {
  document: ReconciliationDocument;
  columns: ColumnDefinition[];
  commonColumns: ColumnDefinition[];
  isOdd: boolean;
  onFieldUpdate: (fieldId: string, value: string | null) => void;
  onStatusUpdate: (
    statusType: "presentOnSite" | "presentInTMF",
    value: ReconciliationStatus
  ) => void;
  onCollectedDateUpdate: (value: string | null) => void;
  onDelete: () => void;
}

export function ReconciliationDocumentRow({
  document,
  columns,
  commonColumns,
  isOdd,
  onFieldUpdate,
  onStatusUpdate,
  onCollectedDateUpdate,
  onDelete,
}: ReconciliationDocumentRowProps) {
  // Determine row background based on highlighting
  const getRowBackground = () => {
    if (document.isHighlighted) {
      switch (document.highlightColor) {
        case "yellow":
          return "bg-yellow-100";
        case "blue":
          return "bg-[#00B0F0]/20";
        case "red":
          return "bg-red-100";
        default:
          return "bg-yellow-100";
      }
    }
    return isOdd ? "bg-[#D6EAF8]/30" : "bg-white";
  };

  return (
    <tr className={cn("border-b last:border-b-0 hover:bg-muted/30", getRowBackground())}>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const value = document.fields[column.id] || "";

        if (column.type === "readonly") {
          return (
            <td
              key={column.id}
              className="p-1.5 border-r text-[11px] font-medium text-muted-foreground"
              style={{ width: column.width }}
            >
              {value}
            </td>
          );
        }

        if (column.type === "date") {
          return (
            <td
              key={column.id}
              className="p-1 border-r"
              style={{ width: column.width }}
            >
              <ReconciliationDatePicker
                value={value}
                onChange={(newValue) => onFieldUpdate(column.id, newValue)}
                placeholder="DD-MMM-YY"
                className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-transparent"
              />
            </td>
          );
        }

        return (
          <td
            key={column.id}
            className="p-1 border-r"
            style={{ width: column.width }}
          >
            <Input
              type="text"
              value={value}
              onChange={(e) => onFieldUpdate(column.id, e.target.value)}
              className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-transparent"
            />
          </td>
        );
      })}

      {/* Common columns */}
      {/* Present On-Site */}
      <td className="p-1 border-r" style={{ width: 90 }}>
        <ReconciliationStatusCell
          value={document.presentOnSite}
          onChange={(value) => onStatusUpdate("presentOnSite", value)}
          showNA={true}
        />
      </td>

      {/* Present in TMF */}
      <td className="p-1 border-r" style={{ width: 90 }}>
        <ReconciliationStatusCell
          value={document.presentInTMF}
          onChange={(value) => onStatusUpdate("presentInTMF", value)}
          showNA={true}
          highlightNo={true}
        />
      </td>

      {/* Collected Date */}
      <td className="p-1 border-r" style={{ width: 150 }}>
        <ReconciliationDatePicker
          value={document.collectedDate}
          onChange={onCollectedDateUpdate}
          placeholder="DD-MMM-YY"
          className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-transparent"
        />
      </td>

      {/* Actions */}
      <td className="p-1 text-center w-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}
