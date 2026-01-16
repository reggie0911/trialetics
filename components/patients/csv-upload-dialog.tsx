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
import { PatientRecord } from "@/lib/types/patient-data";

interface CSVUploadDialogProps {
  onUpload: (data: PatientRecord[], fileName: string) => void;
  disabled?: boolean;
}

export function CSVUploadDialog({ onUpload, disabled = false }: CSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PatientRecord[]>([]);
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

        const data = results.data as PatientRecord[];
        
        if (data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        // Show preview of first 5 rows
        setPreviewData(data.slice(0, 5));
      },
      error: (error) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleConfirmUpload = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as PatientRecord[];
        onUpload(data, file.name);
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
        disabled={disabled}
        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-9 px-4"
      >
        <Upload className="w-3 h-3" />
        Upload Patient Data
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Upload Patient Data CSV</DialogTitle>
          <DialogDescription className="text-[10px]">
            Upload a monthly patient data export. The data will replace the current dataset.
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
              id="csv-upload"
            />
            
            {!file ? (
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Drop CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv files only
                </p>
              </label>
            ) : (
              <div className="space-y-2">
                <FileText className="w-10 h-10 mx-auto text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetDialog();
                  }}
                  className="text-xs"
                >
                  <X className="w-3 h-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {parsing && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              Parsing CSV file...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive">{error}</p>
            </div>
          )}

          {previewData.length > 0 && !error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Successfully parsed {previewData.length} rows (showing preview)
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-[10px]">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {Object.keys(previewData[0]).slice(0, 5).map((key) => (
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
                          {Object.values(row).slice(0, 5).map((val, valIdx) => (
                            <td
                              key={valIdx}
                              className="px-2 py-1 whitespace-nowrap"
                            >
                              {String(val || "—")}
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
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpload}
            disabled={!file || !!error || parsing || previewData.length === 0}
            className="text-xs"
          >
            Upload Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
