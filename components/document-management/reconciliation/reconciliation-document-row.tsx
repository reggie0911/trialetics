"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReconciliationStatusCell } from "./reconciliation-status-cell";
import { ReconciliationDatePicker } from "./reconciliation-date-picker";
import { ReconciliationDocumentLinkInput } from "./reconciliation-document-link-input";
import { ReconciliationDocumentViewer } from "./reconciliation-document-viewer";
import { ReconciliationDeleteModal } from "./reconciliation-delete-modal";
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
  categoryName: string;
  onFieldUpdate: (fieldId: string, value: string | null) => void;
  onStatusUpdate: (
    statusType: "presentOnSite" | "presentInTMF",
    value: ReconciliationStatus
  ) => void;
  onDocumentLinkUpdate: (value: string | null) => void;
  onDelete: () => void;
}

export function ReconciliationDocumentRow({
  document,
  columns,
  commonColumns,
  isOdd,
  categoryName,
  onFieldUpdate,
  onStatusUpdate,
  onDocumentLinkUpdate,
  onDelete,
}: ReconciliationDocumentRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

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
    <>
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

        {/* Document Link Location */}
        <td className="p-1 border-r" style={{ width: 250 }}>
          <ReconciliationDocumentLinkInput
            value={document.documentLink}
            onChange={onDocumentLinkUpdate}
            onView={() => {
              if (document.documentLink) {
                setViewerUrl(document.documentLink);
              }
            }}
            className="h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-transparent"
          />
        </td>

        {/* Actions */}
        <td className="p-1 text-center w-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </td>
      </tr>
      {/* Delete Confirmation Modal - Rendered outside table via portal */}
      <ReconciliationDeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={onDelete}
        categoryName={categoryName}
        documentFields={document.fields}
      />
      {/* Document Viewer Modal */}
      {viewerUrl && (
        <ReconciliationDocumentViewer
          open={!!viewerUrl}
          onOpenChange={(open) => {
            if (!open) {
              setViewerUrl(null);
            }
          }}
          url={viewerUrl}
        />
      )}
    </>
  );
}
