"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseTransposedHeaderCSV, HeaderMapping, VisitGroupSpan } from "@/lib/utils/header-mapper";

interface HeaderMappingUploadProps {
  onMappingLoad: (mappings: HeaderMapping[], spans: VisitGroupSpan[]) => void;
  disabled?: boolean;
  hasExistingMapping?: boolean;
  mappingCount?: number;
}

export function HeaderMappingUpload({ 
  onMappingLoad, 
  disabled = false,
  hasExistingMapping = false,
  mappingCount = 0,
}: HeaderMappingUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFile = async (file: File) => {
    // If there's an existing mapping, show override warning first
    if (hasExistingMapping && !showOverrideWarning) {
      setPendingFile(file);
      setShowOverrideWarning(true);
      return;
    }

    setError(null);
    setIsProcessing(true);
    setShowOverrideWarning(false);
    setPendingFile(null);
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setIsProcessing(false);
      return;
    }

    try {
      const text = await file.text();
      const { mappings, visitGroupSpans } = parseTransposedHeaderCSV(text);
      
      if (mappings.length === 0) {
        setError('No valid header mappings found in CSV');
        setIsProcessing(false);
        return;
      }

      onMappingLoad(mappings, visitGroupSpans);
      setUploadedFile(file.name);
      
      // Show success briefly before closing
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsOpen(false);
    } catch (err) {
      setError(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOverride = () => {
    if (pendingFile) {
      handleFile(pendingFile);
    }
  };

  const handleCancelOverride = () => {
    setShowOverrideWarning(false);
    setPendingFile(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        disabled={disabled}
        className={`inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border shadow-sm h-9 px-4 ${
          hasExistingMapping 
            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-300' 
            : 'bg-background hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        {hasExistingMapping ? (
          <>
            <CheckCircle2 className="w-3 h-3" />
            Loaded ({mappingCount})
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-3 h-3" />
            Load Header Map
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Header Mapping CSV</DialogTitle>
          <DialogDescription>
            {hasExistingMapping 
              ? `Current mapping has ${mappingCount} columns. Upload a new file to override.`
              : 'Upload your Polares header mapping file to organize columns by visit groups'
            }
          </DialogDescription>
        </DialogHeader>
        
        {showOverrideWarning ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Override Existing Mapping?
                </p>
                <p className="text-sm text-amber-700">
                  You currently have {mappingCount} columns mapped. Uploading this new file will replace the existing header mapping and regenerate all column configurations.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancelOverride}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleConfirmOverride}>
                Yes, Override
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Processing header mapping...</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                    id="header-csv-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="header-csv-upload">
                    <Button variant="secondary" size="sm" asChild disabled={isProcessing}>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
