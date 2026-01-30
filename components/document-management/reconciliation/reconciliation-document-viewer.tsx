"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReconciliationDocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

export function ReconciliationDocumentViewer({
  open,
  onOpenChange,
  url,
}: ReconciliationDocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open && url) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
    }
  }, [open, url]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage("Failed to load document. The URL may be invalid or the document may not be accessible.");
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (!url || !isValidUrl(url)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invalid URL</DialogTitle>
            <DialogDescription>
              The provided URL is not valid. Please enter a valid HTTP or HTTPS URL.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="text-[11px]">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full sm:max-w-[90vw] sm:max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">Document Viewer</DialogTitle>
              <DialogDescription className="text-[11px] mt-1 truncate max-w-[600px]">
                {url}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {hasError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Failed to load document</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{errorMessage}</p>
                </div>
                <Button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    // Force iframe reload by changing key
                    const iframe = document.getElementById("document-viewer-iframe") as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              id="document-viewer-iframe"
              src={url}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="Document viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
