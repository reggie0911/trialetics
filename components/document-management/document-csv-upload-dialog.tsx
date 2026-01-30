"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Define the required columns for Document Management
const REQUIRED_COLUMNS = [
  "DocumentName",
  "DocumentType",
  "Status",
  "Version",
  "SiteName",
  "UploadDate",
  "ExpirationDate",
];

// Optional columns
const OPTIONAL_COLUMNS = [
  "DocumentCategory",
  "ProjectId",
  "ApprovalDate",
  "ApprovedBy",
  "FileUrl",
  "FileSize",
];

export interface DocumentRecord {
  [key: string]: string | undefined;
}

interface DocumentCSVUploadDialogProps {
  onUpload: (data: DocumentRecord[], fileName: string) => Promise<void>;
  companyId: string;
  profileId: string;
}

export function DocumentCSVUploadDialog({ onUpload, companyId, profileId }: DocumentCSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DocumentRecord[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError(null);
    parseCSV(selectedFile);
  };

  // Normalize header names for matching
  const normalizeHeader = (header: string): string => {
    return header.trim().replace(/\s+/g, "").toUpperCase();
  };

  // Find matching column index in CSV headers
  const findColumnIndex = (csvHeaders: string[], targetColumn: string): number => {
    const normalizedTarget = normalizeHeader(targetColumn);
    return csvHeaders.findIndex((h) => normalizeHeader(h) === normalizedTarget);
  };

  // Filter CSV data to only include required columns
  const filterCSVData = (csvData: any[], csvHeaders: string[]): DocumentRecord[] => {
    // Create a map of normalized header names to actual header names
    const headerMap = new Map<string, string>();
    csvHeaders.forEach((header) => {
      headerMap.set(normalizeHeader(header), header);
    });

    // Create a map of required column names to their actual CSV header names
    const columnMap = new Map<string, string>();
    
    REQUIRED_COLUMNS.forEach((col) => {
      const normalizedCol = normalizeHeader(col);
      const actualHeader = headerMap.get(normalizedCol);
      if (actualHeader) {
        columnMap.set(col, actualHeader);
      }
    });

    // Check if all required columns are present
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !columnMap.has(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }

    // Map optional columns
    const optionalColumnMap = new Map<string, string>();
    OPTIONAL_COLUMNS.forEach((col) => {
      const normalizedCol = normalizeHeader(col);
      const actualHeader = headerMap.get(normalizedCol);
      if (actualHeader) {
        optionalColumnMap.set(col, actualHeader);
      }
    });

    // Transform CSV rows to DocumentRecord objects
    // When header: true, csvData contains objects with keys matching headers
    return csvData.map((row: any) => {
      const record: DocumentRecord = {};
      
      // Add required columns (using actual CSV header names)
      REQUIRED_COLUMNS.forEach((col) => {
        const actualHeader = columnMap.get(col);
        if (actualHeader && row[actualHeader] !== undefined) {
          record[col] = String(row[actualHeader] || "").trim();
        } else {
          record[col] = "";
        }
      });

      // Add optional columns if present
      OPTIONAL_COLUMNS.forEach((col) => {
        const actualHeader = optionalColumnMap.get(col);
        if (actualHeader && row[actualHeader] !== undefined) {
          record[col] = String(row[actualHeader] || "").trim();
        }
      });

      // Add any other columns as extra fields
      csvHeaders.forEach((header) => {
        const normalizedHeaderName = normalizeHeader(header);
        const isRequired = REQUIRED_COLUMNS.some((col) => normalizeHeader(col) === normalizedHeaderName);
        const isOptional = OPTIONAL_COLUMNS.some((col) => normalizeHeader(col) === normalizedHeaderName);
        
        if (!isRequired && !isOptional && row[header] !== undefined) {
          record[header] = String(row[header] || "").trim();
        }
      });

      return record;
    }).filter((row) => {
      // Filter out rows without required data
      return (
        row.DocumentName && row.DocumentName.trim() !== "" &&
        row.DocumentType && row.DocumentType.trim() !== ""
      );
    });
  };

  const parseCSV = (csvFile: File) => {
    setParsing(true);
    setError(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      newline: '\n',
      complete: (results) => {
        setParsing(false);
        
        // Filter out delimiter detection warnings - they're not critical errors
        const criticalErrors = results.errors.filter(
          (error) => error.type !== 'Delimiter' && error.type !== 'Quotes'
        );
        
        if (criticalErrors.length > 0) {
          setError(`CSV parsing errors: ${criticalErrors[0].message}`);
          return;
        }

        const csvData = results.data as any[];
        
        if (!csvData || csvData.length === 0) {
          setError("CSV file has no data rows");
          return;
        }

        try {
          const csvHeaders = results.meta.fields || [];
          const filteredData = filterCSVData(csvData, csvHeaders);
          
          if (filteredData.length === 0) {
            setError("No valid document records found in CSV");
            return;
          }

          setTotalRowCount(filteredData.length);
          setPreviewData(filteredData.slice(0, 5));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process CSV data");
        }
      },
      error: (error) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      newline: '\n',
      complete: async (results) => {
        const csvData = results.data as any[];
        
        if (!csvData || csvData.length === 0) {
          setError("CSV file has no data rows");
          return;
        }

        try {
          const csvHeaders = results.meta.fields || [];
          const filteredData = filterCSVData(csvData, csvHeaders);
          await onUpload(filteredData, file.name);
          handleClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process CSV data");
        }
      },
    });
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPreviewData([]);
    setError(null);
    setDragActive(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="text-[11px] h-8" />
        }
      >
        <Upload className="h-3 w-3 mr-2" />
        Upload CSV
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Upload Document Management CSV</DialogTitle>
          <DialogDescription className="text-[11px]">
            Upload a CSV file with document data. Required columns: DocumentName, DocumentType, Status, Version, SiteName, UploadDate, ExpirationDate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drop your CSV file here</p>
              <p className="text-[11px] text-muted-foreground">or click to browse</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setTotalRowCount(0);
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parsing && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Parsing CSV...
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-destructive">{error}</p>
                </div>
              )}

              {!parsing && !error && previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Successfully parsed {totalRowCount.toLocaleString()} document records (showing preview of first 5)</span>
                  </div>
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-[11px] font-medium mb-2">Preview (first 5 records):</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">Document Name</th>
                            <th className="text-left p-1">Type</th>
                            <th className="text-left p-1">Status</th>
                            <th className="text-left p-1">Site</th>
                            <th className="text-left p-1">Expiration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b last:border-b-0">
                              <td className="p-1">{row.DocumentName}</td>
                              <td className="p-1">{row.DocumentType}</td>
                              <td className="p-1">{row.Status}</td>
                              <td className="p-1">{row.SiteName}</td>
                              <td className="p-1">{row.ExpirationDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || parsing || !!error || previewData.length === 0}
          >
            Upload Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
