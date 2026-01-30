"use client";

import { useState } from "react";
import { DocumentUploadArea } from "./document-upload-area";
import { DocumentTemplateImport } from "./document-template-import";
import { EditableDocumentTable } from "./editable-document-table";
import { DocumentViewerModal } from "./document-viewer-modal";
import { PendingDocumentRecord, DocumentRecordInput } from "@/lib/actions/document-management-data";

interface DocumentUploadPageClientProps {
  companyId: string;
  profileId: string;
}

export function DocumentUploadPageClient({ companyId, profileId }: DocumentUploadPageClientProps) {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocumentRecord[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFilePath, setViewerFilePath] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);

  const handleDocumentsStaged = (newDocs: PendingDocumentRecord[]) => {
    setPendingDocuments(prev => [...prev, ...newDocs]);
  };

  const handleDocumentUpdate = (tempId: string, updates: Partial<DocumentRecordInput>) => {
    setPendingDocuments(prev => 
      prev.map(doc => 
        doc.tempId === tempId 
          ? { ...doc, ...updates }
          : doc
      )
    );
  };

  const handleDocumentSave = async (tempId: string) => {
    // After successful save in EditableDocumentTable, remove from pending
    setPendingDocuments(prev => prev.filter(doc => doc.tempId !== tempId));
  };

  const handleDocumentDelete = (tempId: string) => {
    setPendingDocuments(prev => prev.filter(doc => doc.tempId !== tempId));
  };

  const handleViewDocument = (filePath: string, fileName?: string) => {
    setViewerFilePath(filePath);
    setViewerFileName(fileName);
    setViewerOpen(true);
  };

  return (
    <div className="flex gap-6">
      {/* Left Column - Upload Area */}
      <div className="w-[400px] flex-shrink-0 space-y-4">
        <DocumentUploadArea
          onDocumentsStaged={handleDocumentsStaged}
        />
        {/* Template import hidden - templates are now globally available */}
        {/* <DocumentTemplateImport companyId={companyId} /> */}
      </div>

      {/* Right Column - Document Records Table */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h2 className="text-sm font-semibold mb-1">Staged Documents ({pendingDocuments.length})</h2>
          <p className="text-xs text-muted-foreground">
            Edit document metadata in the table below, then click Save for each document to upload it to the system.
          </p>
        </div>

        <EditableDocumentTable
          pendingDocuments={pendingDocuments}
          onDocumentUpdate={handleDocumentUpdate}
          onDocumentSave={handleDocumentSave}
          onDocumentDelete={handleDocumentDelete}
          onViewDocument={handleViewDocument}
          companyId={companyId}
          profileId={profileId}
        />
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        filePath={viewerFilePath}
        fileName={viewerFileName}
      />
    </div>
  );
}
