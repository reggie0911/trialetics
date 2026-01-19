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

// Define the columns we want to keep
const REQUIRED_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "EventStatus",
  "EventDate",
  "PlannedDate",
  "ProposedDate",
  "WindowStartDate",
  "WindowEndDate"
];

export interface VWRecord {
  [key: string]: string | undefined;
}

interface VWCSVUploadDialogProps {
  onUpload: (data: VWRecord[], fileName: string) => Promise<void>;
  companyId: string;
  profileId: string;
}

export function VWCSVUploadDialog({ onUpload, companyId, profileId }: VWCSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<VWRecord[]>([]);
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

  // Event names to exclude from import
  const EXCLUDED_EVENT_NAMES = [
    "Add Subject",
    "Screening",
    "Selection",
    "Procedure",
    "Discharge / Day 7",
    "Year 5",
    "EventName",
    "Additional Assessments",
    "Unscheduled Visit"
  ];

  // Filter CSV data to only include required columns and exclude certain event names
  const filterCSVData = (csvData: any[], csvHeaders: string[]): VWRecord[] => {
    // Create a map of required column names to their indices in the CSV
    const columnMap = new Map<string, number>();
    
    REQUIRED_COLUMNS.forEach((col) => {
      const index = findColumnIndex(csvHeaders, col);
      if (index !== -1) {
        columnMap.set(col, index);
      }
    });

    // Filter data to only include required columns and exclude certain event names
    return csvData
      .map((row) => {
        const filteredRow: VWRecord = {};
        REQUIRED_COLUMNS.forEach((col) => {
          const csvIndex = columnMap.get(col);
          if (csvIndex !== undefined && csvIndex !== -1) {
            // Get the actual CSV header name (preserve original case/spacing)
            const csvHeader = csvHeaders[csvIndex];
            filteredRow[col] = row[csvHeader] || row[csvIndex] || "";
          } else {
            filteredRow[col] = "";
          }
        });
        return filteredRow;
      })
      .filter((row) => {
        // Exclude rows with specific event names
        const eventName = row.EventName?.trim() || "";
        return !EXCLUDED_EVENT_NAMES.includes(eventName);
      });
  };

  const parseCSV = (csvFile: File) => {
    setParsing(true);
    setError(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors[0].message}`);
          return;
        }

        if (!results.data || results.data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        // Get headers from the CSV
        const firstRow = results.data[0] as any;
        const csvHeaders = Object.keys(firstRow);
        
        const filteredData = filterCSVData(results.data as any[], csvHeaders);
        
        if (filteredData.length === 0) {
          setError("No matching columns found. Please ensure the CSV contains the required columns.");
          return;
        }

        setPreviewData(filteredData.slice(0, 5));
      },
      error: (error) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleConfirmUpload = async () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data || results.data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        const firstRow = results.data[0] as any;
        const csvHeaders = Object.keys(firstRow);
        
        const filteredData = filterCSVData(results.data as any[], csvHeaders);
        await onUpload(filteredData, file.name);
        setOpen(false);
        resetDialog();
      },
    });
  };

  const resetDialog = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={!companyId || !profileId}
        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-3"
      >
        <Upload className="w-3 h-3" />
        Upload VW Data
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Upload Visit Window CSV</DialogTitle>
          <DialogDescription className="text-xs">
            Upload a visit window CSV file with event dates and window information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
              id="vw-csv-upload"
            />
            
            {!file ? (
              <label htmlFor="vw-csv-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-xs font-medium mb-1">
                  Drop CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv files only
                </p>
              </label>
            ) : (
              <div className="space-y-2">
                <FileText className="w-10 h-10 mx-auto text-primary" />
                <p className="text-xs font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetDialog();
                  }}
                  className="text-xs h-7"
                >
                  <X className="w-3 h-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {parsing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              Parsing CSV file...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {previewData.length > 0 && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Successfully parsed {previewData.length} rows (showing preview)
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {REQUIRED_COLUMNS.slice(0, 5).map((key) => (
                          <th
                            key={key}
                            className="px-2 py-1 text-left font-medium whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                        <th className="px-2 py-1 text-left font-medium">...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {REQUIRED_COLUMNS.slice(0, 5).map((col) => (
                            <td
                              key={col}
                              className="px-2 py-1 whitespace-nowrap"
                            >
                              {String(row[col] || "—")}
                            </td>
                          ))}
                          <td className="px-2 py-1">...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpload}
            disabled={!file || !!error || parsing || previewData.length === 0}
            className="text-xs h-8"
          >
            Upload Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
