'use client';

import { useState } from 'react';
import { TmfFolderTree } from './tmf-folder-tree';
import { DocumentPreview } from './document-preview';
import { DocumentDetailsPanel } from './document-details-panel';
import { EditDocumentModal } from './edit-document-modal';
import type { EtmfDocument, TmfZoneNode, EtmfAuditLog } from '@/lib/types/etmf';

interface DocumentViewClientProps {
  document: EtmfDocument;
  tmfTree: TmfZoneNode[];
  auditLog: EtmfAuditLog[];
}

export function DocumentViewClient({ document, tmfTree, auditLog }: DocumentViewClientProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(document);

  const handleDocumentUpdated = (updatedDoc: EtmfDocument) => {
    setCurrentDocument(updatedDoc);
    setShowEditModal(false);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex">
      <div className="w-64 border-r overflow-y-auto p-4">
        <TmfFolderTree
          tree={tmfTree}
          selectedArtifact={document.tmf_reference?.artifact_number}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <DocumentPreview
          document={currentDocument}
          onEdit={() => setShowEditModal(true)}
        />
      </div>

      <div className="w-80 border-l overflow-y-auto">
        <DocumentDetailsPanel document={currentDocument} auditLog={auditLog} />
      </div>

      <EditDocumentModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        document={currentDocument}
        onSuccess={handleDocumentUpdated}
      />
    </div>
  );
}
