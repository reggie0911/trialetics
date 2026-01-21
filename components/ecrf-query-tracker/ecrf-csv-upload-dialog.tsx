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

// Define the required columns for eCRF Query Tracker
const REQUIRED_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "EventDate",
  "FormName",
  "QueryType",
  "QueryText",
  "QueryState",
  "QueryResolution",
  "UserName",
  "DateTime",
  "UserRole",
  "QueryRaisedByRole"
];

export interface ECRFRecord {
  [key: string]: string | undefined;
}

interface ECRFCSVUploadDialogProps {
  onUpload: (data: ECRFRecord[], fileName: string) => Promise<void>;
  companyId: string;
  profileId: string;
}

export function ECRFCSVUploadDialog({ onUpload, companyId, profileId }: ECRFCSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ECRFRecord[]>([]);
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

  // Build column index map from Row 2 (technical headers) to REQUIRED_COLUMNS
  const buildColumnMap = (row2Headers: string[]): Map<string, number> => {
    const columnMap = new Map<string, number>();
    
    // Map from technical header names to their column indices
    row2Headers.forEach((header, index) => {
      const trimmedHeader = header.trim();
      if (REQUIRED_COLUMNS.includes(trimmedHeader)) {
        columnMap.set(trimmedHeader, index);
      }
    });
    
    return columnMap;
  };

  // Convert a raw data row (array) to ECRFRecord using column map
  const rowToRecord = (rowArray: string[], columnMap: Map<string, number>): ECRFRecord => {
    const record: ECRFRecord = {};
    
    REQUIRED_COLUMNS.forEach((col) => {
      const colIndex = columnMap.get(col);
      if (colIndex !== undefined && colIndex < rowArray.length) {
        record[col] = rowArray[colIndex]?.trim() || "";
      } else {
        record[col] = "";
      }
    });
    
    return record;
  };

  // Filter and transform CSV data
  const filterCSVData = (dataRows: string[][], columnMap: Map<string, number>): ECRFRecord[] => {
    const validQueryStates = ['Query Approved', 'Query Closed', 'Query Resolved', 'Query Raised', 'Query Removed', 'Query Rejected'];
    
    return dataRows
      .map((rowArray) => rowToRecord(rowArray, columnMap))
      .filter((row) => {
        // Filter out rows without a SiteName, SubjectId, or valid QueryState
        return (
          row.SiteName && row.SiteName.trim() !== "" && 
          row.SubjectId && row.SubjectId.trim() !== "" &&
          row.QueryState && validQueryStates.includes(row.QueryState)
        );
      });
  };

  const parseCSV = (csvFile: File) => {
    setParsing(true);
    setError(null);

    // Parse WITHOUT headers - we'll use Row 2 as our header row
    Papa.parse(csvFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors[0].message}`);
          return;
        }

        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setError("CSV file must have at least 3 rows (2 header rows + data)");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const row2Headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        if (dataRows.length === 0) {
          setError("CSV file has no data rows");
          return;
        }

        const columnMap = buildColumnMap(row2Headers);
        
        // Verify we found the essential columns
        if (!columnMap.has("SiteName") || !columnMap.has("SubjectId")) {
          setError("CSV missing required columns: SiteName, SubjectId. Found headers: " + row2Headers.join(", "));
          return;
        }

        const filteredData = filterCSVData(dataRows, columnMap);
        
        if (filteredData.length === 0) {
          setError("No valid query records found in CSV");
          return;
        }

        setTotalRowCount(filteredData.length);
        setPreviewData(filteredData.slice(0, 5));
      },
      error: (error) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    // Parse WITHOUT headers - we'll use Row 2 as our header row
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setError("CSV file must have at least 3 rows");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const row2Headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        const columnMap = buildColumnMap(row2Headers);
        const filteredData = filterCSVData(dataRows, columnMap);

        await onUpload(filteredData, file.name);
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPreviewData([]);
    setTotalRowCount(0);
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
          <DialogTitle className="text-lg">Upload eCRF Query Tracker CSV</DialogTitle>
          <DialogDescription className="text-[11px]">
            Upload a CSV file with query data. Required columns: SiteName, SubjectId, EventName, EventDate, FormName, QueryType, QueryText, QueryState, QueryResolution, UserName, DateTime, UserRole, QueryRaisedByRole
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
                    <span>Successfully parsed {totalRowCount.toLocaleString()} query records</span>
                  </div>
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-[11px] font-medium mb-2">Preview (first 5 records):</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">Site</th>
                            <th className="text-left p-1">Subject</th>
                            <th className="text-left p-1">Event</th>
                            <th className="text-left p-1">Form</th>
                            <th className="text-left p-1">State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b last:border-b-0">
                              <td className="p-1">{row.SiteName}</td>
                              <td className="p-1">{row.SubjectId}</td>
                              <td className="p-1">{row.EventName}</td>
                              <td className="p-1">{row.FormName}</td>
                              <td className="p-1">{row.QueryState}</td>
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
