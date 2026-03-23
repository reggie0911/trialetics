'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateEtmfDocument, uploadEtmfDocumentFile, getEtmfDocument } from '@/lib/actions/etmf';
import type { EtmfDocument } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface EditDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EtmfDocument;
  onSuccess: (updatedDoc: EtmfDocument) => void;
}

export function EditDocumentModal({ open, onOpenChange, document, onSuccess }: EditDocumentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [documentName, setDocumentName] = useState(document.document_name);
  const [version, setVersion] = useState(document.version || '');
  const [versionType, setVersionType] = useState(document.version_type || '');
  const [language, setLanguage] = useState(document.language || '');
  const [documentSignedDate, setDocumentSignedDate] = useState(document.document_signed_date || '');
  const [approvalDate, setApprovalDate] = useState(document.approval_date || '');
  const [expirationDate, setExpirationDate] = useState(document.expiration_date || '');
  const [versionDate, setVersionDate] = useState(document.version_date || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      const { success, error } = await updateEtmfDocument({
        id: document.id,
        document_name: documentName,
        version: version || null,
        version_type: versionType || null,
        language: language || null,
        document_signed_date: documentSignedDate || null,
        approval_date: approvalDate || null,
        expiration_date: expirationDate || null,
        version_date: versionDate || null,
      });

      if (!success) {
        toast.error(error || 'Failed to update document');
        return;
      }

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await uploadEtmfDocumentFile(document.id, formData);
        if (!uploadRes.success) {
          toast.error(uploadRes.error || 'Failed to upload file');
        }
      }

      const { data: updatedDoc } = await getEtmfDocument(document.id);
      if (updatedDoc) {
        toast.success('Document updated successfully');
        onSuccess(updatedDoc);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>Update document metadata and upload a new file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs">Document Name</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Version</Label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Version Type</Label>
              <Input
                value={versionType}
                onChange={(e) => setVersionType(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Language</Label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Document Signed Date</Label>
              <Input
                type="date"
                value={documentSignedDate}
                onChange={(e) => setDocumentSignedDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Approval Date</Label>
              <Input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Expiration Date</Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Version Date</Label>
              <Input
                type="date"
                value={versionDate}
                onChange={(e) => setVersionDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Replace File</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id="edit-file-upload"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
              />
              <label
                htmlFor="edit-file-upload"
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                {selectedFile ? selectedFile.name : document.file_name || 'Click to upload a file'}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
