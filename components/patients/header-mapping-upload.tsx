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
import { Upload, FileSpreadsheet } from "lucide-react";
import { parseTransposedHeaderCSV, HeaderMapping, VisitGroupSpan } from "@/lib/utils/header-mapper";

interface HeaderMappingUploadProps {
  onMappingLoad: (mappings: HeaderMapping[], spans: VisitGroupSpan[]) => void;
  disabled?: boolean;
}

export function HeaderMappingUpload({ onMappingLoad, disabled = false }: HeaderMappingUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    
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
      <Button variant="outline" size="sm" className="gap-2" asChild disabled={disabled}>
        <DialogTrigger>
          <FileSpreadsheet className="h-4 w-4" />
          {uploadedFile ? `Loaded: ${uploadedFile}` : 'Load Header Map'}
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Header Mapping CSV</DialogTitle>
          <DialogDescription>
            Upload your Polares header mapping file to organize columns by visit groups
          </DialogDescription>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
}
