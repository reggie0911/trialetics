'use client';

import { useState, useTransition } from 'react';
import { FileText, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from '../library/document-status-badge';
import { updateEtmfDocumentStatus, getEtmfDocumentDownloadUrl } from '@/lib/actions/etmf';
import type { EtmfDocument, EtmfDocumentStatus } from '@/lib/types/etmf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentPreviewProps {
  document: EtmfDocument;
  onEdit: () => void;
}

const statusOrder: EtmfDocumentStatus[] = ['placeholder', 'qc_review', 'rejected', 'approved'];

const statusConfig: Record<EtmfDocumentStatus, { label: string; color: string }> = {
  placeholder: { label: 'Placeholder', color: 'bg-gray-400' },
  qc_review: { label: 'QC Review', color: 'bg-yellow-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
};

export function DocumentPreview({ document, onEdit }: DocumentPreviewProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState('');

  const handleStatusChange = (newStatus: EtmfDocumentStatus) => {
    startTransition(async () => {
      const { success, error } = await updateEtmfDocumentStatus({
        id: document.id,
        document_status: newStatus,
        rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
      });

      if (success) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        window.location.reload();
      } else {
        toast.error(error || 'Failed to update status');
      }
    });
  };

  const handleDownload = async () => {
    const { success, url, error } = await getEtmfDocumentDownloadUrl(document.id);
    if (success && url) {
      window.open(url, '_blank');
    } else {
      toast.error(error || 'Failed to get download URL');
    }
  };

  const currentIndex = statusOrder.indexOf(document.document_status);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        {statusOrder.map((status, idx) => (
          <div key={status} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors',
                idx <= currentIndex
                  ? statusConfig[status].color + ' text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {statusConfig[status].label}
            </div>
            {idx < statusOrder.length - 1 && (
              <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/20 min-h-[300px]">
        {document.storage_path ? (
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium">{document.file_name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {document.file_format} - {((document.file_size_bytes || 0) / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>missing element</p>
            <p className="text-xs mt-1">No file uploaded yet</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <Button variant="outline" onClick={onEdit} disabled={isPending}>
          Edit Document
        </Button>

        {document.document_status === 'placeholder' && (
          <Button
            onClick={() => handleStatusChange('qc_review')}
            disabled={isPending}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            Submit for QC Review
          </Button>
        )}

        {document.document_status === 'qc_review' && (
          <>
            <Button
              onClick={() => handleStatusChange('approved')}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
            <Button
              onClick={() => handleStatusChange('rejected')}
              disabled={isPending}
              variant="destructive"
            >
              Reject
            </Button>
          </>
        )}

        {document.document_status === 'rejected' && (
          <Button
            onClick={() => handleStatusChange('qc_review')}
            disabled={isPending}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            Resubmit for QC Review
          </Button>
        )}
      </div>
    </div>
  );
}
