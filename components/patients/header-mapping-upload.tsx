"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasscodeDialog } from "@/components/ui/passcode-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseTransposedHeaderCSV, HeaderMapping, VisitGroupSpan } from "@/lib/utils/header-mapper";

const MAPPING_PASSCODE_STORAGE_KEY = "patients-mapping-passcode-verified";

function isMappingPasscodeVerified(): boolean {
  try {
    return sessionStorage.getItem(MAPPING_PASSCODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

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
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);

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

  const openUploadDialog = () => {
    if (disabled) return;
    if (!isMappingPasscodeVerified()) {
      setShowPasscodeDialog(true);
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <PasscodeDialog
        open={showPasscodeDialog}
        onVerified={() => {
          setShowPasscodeDialog(false);
          setIsOpen(true);
        }}
        onDismiss={() => setShowPasscodeDialog(false)}
        storageKey={MAPPING_PASSCODE_STORAGE_KEY}
        mode="account_password"
        title="Confirm your identity"
        description="Enter your login password to load or change the header mapping."
      />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={openUploadDialog}
          className={`h-9 px-4 text-xs font-medium gap-2 ${
            hasExistingMapping
              ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              : ""
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
        </Button>
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
                    <Button variant="secondary" size="sm" render={<span />} disabled={isProcessing}>
                      Browse Files
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
    </>
  );
}
