'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ExternalLink, FileUp, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  deleteIpOrderShippingDocument,
  getIpOrderShippingDocumentSignedUrl,
  listIpOrderDocuments,
  uploadIpOrderShippingDocument,
} from '@/lib/actions/ip-management';
import type { IpOrderDocumentRow } from '@/lib/types/ip-management';

const DOC_KIND_LABELS: Record<IpOrderDocumentRow['doc_kind'], string> = {
  packing_slip: 'Packing slip',
  other: 'Other',
};

export interface IpOrderShippingDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  orderId: string;
  /** Short label for header (e.g. order reference). */
  contextLabel: string;
  /** When false, list and view only (archived order). */
  canUpload: boolean;
  onSuccess?: () => void | Promise<void>;
}

export function IpOrderShippingDocumentsDialog({
  open,
  onOpenChange,
  studyId,
  orderId,
  contextLabel,
  canUpload,
  onSuccess,
}: IpOrderShippingDocumentsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<IpOrderDocumentRow[]>([]);
  const [docKind, setDocKind] = useState<IpOrderDocumentRow['doc_kind']>('packing_slip');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listIpOrderDocuments({ studyId, orderId });
      setRows(list);
    } catch (e) {
      toast({
        title: 'Could not load documents',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [studyId, orderId, toast]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    setLabel('');
    setFile(null);
    setDocKind('packing_slip');
  }, [open, studyId, orderId, refresh]);

  const handleView = async (id: string) => {
    try {
      const url = await getIpOrderShippingDocumentSignedUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast({
        title: 'Could not open document',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: 'Choose a file', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      await uploadIpOrderShippingDocument({
        studyId,
        orderId,
        file,
        docKind,
        label: label.trim() || null,
      });
      toast({ title: 'Document uploaded' });
      setFile(null);
      setLabel('');
      await refresh();
      await onSuccess?.();
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteIpOrderShippingDocument(deleteId);
      toast({ title: 'Document removed' });
      setDeleteId(null);
      await refresh();
      await onSuccess?.();
    } catch (e) {
      toast({
        title: 'Could not remove document',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipping documents</DialogTitle>
            <DialogDescription>
              Packing slips and other files for <span className="font-medium text-foreground">{contextLabel}</span>.
              {!canUpload && ' This order is archived — you can view existing files only.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Uploaded files</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No documents yet.</p>
              ) : (
                <ul className="space-y-2 border rounded-md divide-y">
                  {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {r.label?.trim() || r.original_filename || 'Document'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {DOC_KIND_LABELS[r.doc_kind] ?? r.doc_kind}
                          {' · '}
                          {(() => {
                            try {
                              return format(parseISO(r.created_at), 'dd-MMM-yyyy HH:mm', { locale: enUS });
                            } catch {
                              return r.created_at;
                            }
                          })()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[12px] h-8"
                        onClick={() => void handleView(r.id)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      {canUpload && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-destructive hover:text-destructive"
                          aria-label="Remove document"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canUpload && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium">Add document</h4>
                <div className="space-y-1">
                  <Label className="text-xs">Document type</Label>
                  <Select value={docKind} onValueChange={(v) => setDocKind(v as IpOrderDocumentRow['doc_kind'])}>
                    <SelectTrigger className="text-[12px] h-9">
                      <SelectValue placeholder="Select document type">
                        {DOC_KIND_LABELS[docKind]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="packing_slip" className="text-[12px]">
                        Packing slip
                      </SelectItem>
                      <SelectItem value="other" className="text-[12px]">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    className="text-[12px] h-9"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Carrier tracking sheet"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">File</Label>
                  <Input
                    className="text-[12px] h-9 cursor-pointer"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-[11px] text-muted-foreground">PDF or image, up to 15 MB.</p>
                </div>
                <Button
                  type="button"
                  className="text-[12px]"
                  disabled={uploading || !file}
                  onClick={() => void handleUpload()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && !deleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              The file will be permanently deleted from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
