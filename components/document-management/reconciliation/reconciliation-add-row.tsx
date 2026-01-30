"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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

interface ReconciliationAddRowProps {
  categoryId: string;
  columns: ColumnDefinition[];
  commonColumns: ColumnDefinition[];
  onAdd: (document: ReconciliationDocument) => void;
}

export function ReconciliationAddRow({
  categoryId,
  columns,
  commonColumns,
  onAdd,
}: ReconciliationAddRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [fields, setFields] = useState<Record<string, string | null>>({});
  const [presentOnSite, setPresentOnSite] = useState<ReconciliationStatus>(null);
  const [presentInTMF, setPresentInTMF] = useState<ReconciliationStatus>(null);
  const [collectedDate, setCollectedDate] = useState<string>("");

  const handleAdd = () => {
    const newDocument: ReconciliationDocument = {
      id: `${categoryId}-${Date.now()}`,
      categoryId,
      fields,
      presentOnSite,
      presentInTMF,
      collectedDate: collectedDate || null,
    };
    onAdd(newDocument);
    // Reset form
    setFields({});
    setPresentOnSite(null);
    setPresentInTMF(null);
    setCollectedDate("");
    setIsAdding(false);
  };

  const handleCancel = () => {
    setFields({});
    setPresentOnSite(null);
    setPresentInTMF(null);
    setCollectedDate("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <tr className="border-t border-dashed">
        <td colSpan={columns.length + commonColumns.length + 1} className="p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Row
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-dashed bg-blue-50/50">
      {/* Dynamic columns */}
      {columns.map((column) => (
        <td key={column.id} className="p-1 border-r" style={{ width: column.width }}>
          {column.type === "readonly" ? (
            <span className="text-[11px] text-muted-foreground px-1.5">—</span>
          ) : column.type === "date" ? (
            <ReconciliationDatePicker
              value={fields[column.id] || null}
              onChange={(value) =>
                setFields((prev) => ({ ...prev, [column.id]: value }))
              }
              placeholder="DD-MMM-YY"
              className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-white"
            />
          ) : (
            <Input
              type="text"
              value={fields[column.id] || ""}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, [column.id]: e.target.value }))
              }
              className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-white"
              placeholder={column.label}
            />
          )}
        </td>
      ))}

      {/* Present On-Site */}
      <td className="p-1 border-r" style={{ width: 90 }}>
        <ReconciliationStatusCell
          value={presentOnSite}
          onChange={setPresentOnSite}
          showNA={true}
        />
      </td>

      {/* Present in TMF */}
      <td className="p-1 border-r" style={{ width: 90 }}>
        <ReconciliationStatusCell
          value={presentInTMF}
          onChange={setPresentInTMF}
          showNA={true}
          highlightNo={true}
        />
      </td>

      {/* Collected Date */}
      <td className="p-1 border-r" style={{ width: 150 }}>
        <ReconciliationDatePicker
          value={collectedDate || null}
          onChange={(value) => setCollectedDate(value || "")}
          placeholder="DD-MMM-YY"
          className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-white"
        />
      </td>

      {/* Actions */}
      <td className="p-1 text-center w-10">
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[11px] text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleAdd}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
