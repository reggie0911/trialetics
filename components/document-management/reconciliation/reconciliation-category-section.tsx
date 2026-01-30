"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReconciliationDocumentRow } from "./reconciliation-document-row";
import { ReconciliationAddRow } from "./reconciliation-add-row";
import {
  ReconciliationCategory,
  ReconciliationDocument,
  ReconciliationStatus,
} from "./reconciliation-types";

interface ReconciliationCategorySectionProps {
  category: ReconciliationCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onFieldUpdate: (
    categoryId: string,
    documentId: string,
    fieldId: string,
    value: string | null
  ) => void;
  onStatusUpdate: (
    categoryId: string,
    documentId: string,
    statusType: "presentOnSite" | "presentInTMF",
    value: ReconciliationStatus
  ) => void;
  onDocumentLinkUpdate: (
    categoryId: string,
    documentId: string,
    value: string | null
  ) => void;
  onAddDocument: (categoryId: string, document: ReconciliationDocument) => void;
  onDeleteDocument: (categoryId: string, documentId: string) => void;
}

export function ReconciliationCategorySection({
  category,
  isExpanded,
  onToggle,
  onFieldUpdate,
  onStatusUpdate,
  onDocumentLinkUpdate,
  onAddDocument,
  onDeleteDocument,
}: ReconciliationCategorySectionProps) {
  // Common columns that appear in all categories
  const commonColumns = [
    { id: "presentOnSite", label: "Present On-Site?", type: "status" as const, width: 90 },
    { id: "presentInTMF", label: "Present in TMF?", type: "status" as const, width: 90 },
    { id: "documentLink", label: "Document Link Location", type: "url" as const, width: 250 },
  ];

  const allColumns = [...category.columns, ...commonColumns];

  // Calculate total width for table
  const totalWidth = allColumns.reduce((sum, col) => sum + (col.width || 150), 0) + 40; // +40 for actions

  return (
    <div
      id={`category-${category.id}`}
      className="bg-white rounded-sm border overflow-hidden"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 bg-[#4A90A4] text-white hover:bg-[#3d7a8c] transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span className="font-semibold text-[11px]">{category.name}</span>
        <span className="ml-auto text-[11px] opacity-75">
          {category.documents.length} document(s)
        </span>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table
            className="w-full text-[11px]"
            style={{ minWidth: `${totalWidth}px` }}
          >
            {/* Table Header */}
            <thead className="bg-[#B8D4E3] border-b">
              <tr>
                {allColumns.map((column) => (
                  <th
                    key={column.id}
                    className="text-left p-2 font-medium border-r last:border-r-0 whitespace-nowrap"
                    style={{ width: column.width || 150 }}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="text-center p-2 font-medium w-10">
                  {/* Actions */}
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {category.documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={allColumns.length + 1}
                    className="p-3 text-center text-muted-foreground text-[11px]"
                  >
                    No documents in this category
                  </td>
                </tr>
              ) : (
                category.documents.map((document, index) => (
                  <ReconciliationDocumentRow
                    key={document.id}
                    document={document}
                    columns={category.columns}
                    commonColumns={commonColumns}
                    isOdd={index % 2 === 1}
                    categoryName={category.name}
                    onFieldUpdate={(fieldId, value) =>
                      onFieldUpdate(category.id, document.id, fieldId, value)
                    }
                    onStatusUpdate={(statusType, value) =>
                      onStatusUpdate(category.id, document.id, statusType, value)
                    }
                    onDocumentLinkUpdate={(value) =>
                      onDocumentLinkUpdate(category.id, document.id, value)
                    }
                    onDelete={() => onDeleteDocument(category.id, document.id)}
                  />
                ))
              )}

              {/* Add Row */}
              {category.allowMultipleRows !== false && (
                <ReconciliationAddRow
                  categoryId={category.id}
                  columns={category.columns}
                  commonColumns={commonColumns}
                  onAdd={(newDoc) => onAddDocument(category.id, newDoc)}
                />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
