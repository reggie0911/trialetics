"use client";

import { useState, useEffect } from "react";
import { X, Download, Loader2, AlertCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDocumentSignedUrl } from "@/lib/actions/document-management-data";

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  fileName?: string;
}

export function DocumentViewerModal({ open, onOpenChange, filePath, fileName }: DocumentViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");

  useEffect(() => {
    if (open && filePath) {
      loadDocument();
    } else {
      // Reset state when modal closes
      setSignedUrl(null);
      setError(null);
      setFileType("");
    }
  }, [open, filePath]);

  const loadDocument = async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      // Determine file type from path
      const pathLower = filePath.toLowerCase();
      if (pathLower.endsWith('.pdf')) {
        setFileType('pdf');
      } else if (pathLower.endsWith('.docx')) {
        setFileType('docx');
      } else if (pathLower.endsWith('.xlsx')) {
        setFileType('xlsx');
      } else {
        setFileType('unknown');
      }

      // Check if it's an external URL or Supabase Storage path
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // External URL - use directly
        setSignedUrl(filePath);
      } else {
        // Supabase Storage path - get signed URL
        const result = await getDocumentSignedUrl(filePath);
        if (result.success && result.data) {
          setSignedUrl(result.data.url);
        } else {
          setError(result.error || "Failed to load document");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName || filePath?.split('/').pop() || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'xlsx':
        return '📊';
      default:
        return '📎';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getFileIcon()}</span>
              {fileName || filePath?.split('/').pop() || 'Document Viewer'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {signedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-lg font-medium mb-2">Failed to load document</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={loadDocument}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <div className="flex-1 overflow-hidden border rounded-lg">
              {fileType === 'pdf' ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0"
                  title="Document Viewer"
                />
              ) : fileType === 'docx' || fileType === 'xlsx' ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {fileType === 'docx' ? 'Word Document' : 'Excel Spreadsheet'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Preview is not available for this file type. Please download to view.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Document Preview</p>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Preview is not available for this file type.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !signedUrl && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No document selected</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
