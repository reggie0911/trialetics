"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, X, FileText, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  createUploadJob,
  startUploadJob,
  updateJobProgress,
  completeUploadJob,
  failUploadJob,
} from "@/lib/actions/upload-jobs";

// Site Data Entry required columns (matching SDV format)
const SITE_DATA_ENTRY_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "FormName",
  "ItemId",
  "ItemExportLabel",
  "EditDateTime",
  "EditBy"
];

// SDV Data required columns
const SDV_DATA_COLUMNS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "FormName",
  "ItemId",
  "ItemName",
  "SdvBy",
  "SdvDate"
];

export interface SiteDataEntryRecord {
  [key: string]: string | undefined;
}

export interface SDVDataRecord {
  [key: string]: string | undefined;
}

interface SDVCSVUploadDialogProps {
  onSiteDataEntryUpload: (data: SiteDataEntryRecord[], fileName: string, existingUploadId?: string) => Promise<string | null>;
  onSDVDataUpload: (primaryUploadId: string, data: SDVDataRecord[], fileName: string) => Promise<void>;
  selectedUploadId: string | null;
  companyId: string;
  profileId: string;
  useBackgroundUpload?: boolean; // Enable background processing with Realtime updates
}

export function SDVCSVUploadDialog({ 
  onSiteDataEntryUpload, 
  onSDVDataUpload, 
  selectedUploadId,
  companyId, 
  profileId,
  useBackgroundUpload = true, // Default to background processing
}: SDVCSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"site_data" | "sdv_data">("site_data");
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // Site Data Entry state
  const [siteFile, setSiteFile] = useState<File | null>(null);
  const [sitePreviewData, setSitePreviewData] = useState<SiteDataEntryRecord[]>([]);
  const [siteTotalRowCount, setSiteTotalRowCount] = useState(0);
  const [siteParsing, setSiteParsing] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [siteDragActive, setSiteDragActive] = useState(false);
  const siteFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPrimaryId, setUploadedPrimaryId] = useState<string | null>(null);

  // SDV Data state
  const [sdvFile, setSDVFile] = useState<File | null>(null);
  const [sdvPreviewData, setSDVPreviewData] = useState<SDVDataRecord[]>([]);
  const [sdvTotalRowCount, setSDVTotalRowCount] = useState(0);
  const [sdvParsing, setSDVParsing] = useState(false);
  const [sdvError, setSDVError] = useState<string | null>(null);
  const [sdvDragActive, setSDVDragActive] = useState(false);
  const sdvFileInputRef = useRef<HTMLInputElement>(null);

  // Build column index map
  const buildColumnMap = (headers: string[], requiredColumns: string[]): Map<string, number> => {
    const columnMap = new Map<string, number>();
    
    headers.forEach((header, index) => {
      const trimmedHeader = header.trim();
      // Check for exact match or case-insensitive match
      const matchedCol = requiredColumns.find(col => 
        col === trimmedHeader || col.toLowerCase() === trimmedHeader.toLowerCase()
      );
      if (matchedCol) {
        columnMap.set(matchedCol, index);
      }
    });
    
    return columnMap;
  };

  // Convert a raw data row to record using column map
  const rowToRecord = (rowArray: string[], columnMap: Map<string, number>, requiredColumns: string[]): Record<string, string> => {
    const record: Record<string, string> = {};
    
    requiredColumns.forEach((col) => {
      const colIndex = columnMap.get(col);
      if (colIndex !== undefined && colIndex < rowArray.length) {
        record[col] = rowArray[colIndex]?.trim() || "";
      } else {
        record[col] = "";
      }
    });
    
    return record;
  };

  // Parse Site Data Entry CSV
  const parseSiteDataCSV = (csvFile: File) => {
    setSiteParsing(true);
    setSiteError(null);

    Papa.parse(csvFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        setSiteParsing(false);
        
        if (results.errors.length > 0) {
          setSiteError(`CSV parsing errors: ${results.errors[0].message}`);
          return;
        }

        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setSiteError("CSV file must have at least 3 rows (2 header rows + data)");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        if (dataRows.length === 0) {
          setSiteError("CSV file has no data rows");
          return;
        }

        const columnMap = buildColumnMap(headers, SITE_DATA_ENTRY_COLUMNS);
        
        // Verify we found the essential columns
        if (!columnMap.has("SubjectId")) {
          setSiteError("CSV missing required column: SubjectId. Found headers: " + headers.join(", "));
          return;
        }

        const parsedData = dataRows
          .map((rowArray) => rowToRecord(rowArray, columnMap, SITE_DATA_ENTRY_COLUMNS))
          .filter((row) => {
            // Filter out rows without SubjectId
            const subjectId = row["SubjectId"] || "";
            return subjectId.trim() !== "";
          });
        
        if (parsedData.length === 0) {
          setSiteError("No valid records found in CSV");
          return;
        }

        setSiteTotalRowCount(parsedData.length);
        setSitePreviewData(parsedData.slice(0, 5));
      },
      error: (error) => {
        setSiteParsing(false);
        setSiteError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  // Parse SDV Data CSV
  const parseSDVDataCSV = (csvFile: File) => {
    setSDVParsing(true);
    setSDVError(null);

    Papa.parse(csvFile, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        setSDVParsing(false);
        
        if (results.errors.length > 0) {
          setSDVError(`CSV parsing errors: ${results.errors[0].message}`);
          return;
        }

        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setSDVError("CSV file must have at least 3 rows (2 header rows + data)");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        if (dataRows.length === 0) {
          setSDVError("CSV file has no data rows");
          return;
        }

        const columnMap = buildColumnMap(headers, SDV_DATA_COLUMNS);
        
        // Verify we found the essential columns
        if (!columnMap.has("SubjectId")) {
          setSDVError("CSV missing required column: SubjectId. Found headers: " + headers.join(", "));
          return;
        }

        const parsedData = dataRows
          .map((rowArray) => rowToRecord(rowArray, columnMap, SDV_DATA_COLUMNS))
          .filter((row) => {
            const subjectId = row["SubjectId"] || "";
            return subjectId.trim() !== "";
          });
        
        if (parsedData.length === 0) {
          setSDVError("No valid records found in CSV");
          return;
        }

        setSDVTotalRowCount(parsedData.length);
        setSDVPreviewData(parsedData.slice(0, 5));
      },
      error: (error) => {
        setSDVParsing(false);
        setSDVError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleSiteFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setSiteError("Please select a CSV file");
      return;
    }

    setSiteFile(selectedFile);
    setSiteError(null);
    parseSiteDataCSV(selectedFile);
  };

  const handleSDVFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setSDVError("Please select a CSV file");
      return;
    }

    setSDVFile(selectedFile);
    setSDVError(null);
    parseSDVDataCSV(selectedFile);
  };

  const handleSiteDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setSiteDragActive(true);
    } else if (e.type === "dragleave") {
      setSiteDragActive(false);
    }
  };

  const handleSDVDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setSDVDragActive(true);
    } else if (e.type === "dragleave") {
      setSDVDragActive(false);
    }
  };

  const handleSiteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSiteDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSiteFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSDVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSDVDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSDVFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSiteUpload = async () => {
    if (!siteFile) return;

    Papa.parse(siteFile, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setSiteError("CSV file must have at least 3 rows (2 header rows + data)");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        const columnMap = buildColumnMap(headers, SITE_DATA_ENTRY_COLUMNS);
        const parsedData = dataRows
          .map((rowArray) => rowToRecord(rowArray, columnMap, SITE_DATA_ENTRY_COLUMNS))
          .filter((row) => {
            const subjectId = row["SubjectId"] || "";
            return subjectId.trim() !== "";
          });

        // Upload in chunks to avoid JSON parsing errors with large files
        // Using 1000 records per chunk to stay well under the 10MB middleware limit
        const CHUNK_SIZE = 1000;
        let uploadId: string | null = null;
        let jobId: string | null = null;

        try {
          setIsUploading(true);
          setSiteParsing(true);
          setSiteError(null);
          setUploadProgress(0);

          // Create background job if enabled
          if (useBackgroundUpload) {
            const jobResult = await createUploadJob(
              companyId,
              profileId,
              'sdv_site_data_entry',
              siteFile.name,
              parsedData.length
            );
            
            if (jobResult.success && jobResult.data) {
              jobId = jobResult.data;
              setCurrentJobId(jobId);
              await startUploadJob(jobId);
            }
          }

          const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);

          for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
            const chunk = parsedData.slice(i, i + CHUNK_SIZE);
            const isFirstChunk = i === 0;
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const processedRecords = Math.min(i + CHUNK_SIZE, parsedData.length);
            const progress = Math.round((processedRecords / parsedData.length) * 100);

            console.log(`Uploading chunk ${chunkNumber}/${totalChunks} (${chunk.length} records)...`);

            if (isFirstChunk) {
              uploadId = await onSiteDataEntryUpload(chunk, siteFile.name);
              
              // Update job with upload ID
              if (jobId && uploadId) {
                await startUploadJob(jobId, uploadId);
              }
            } else if (uploadId) {
              await onSiteDataEntryUpload(chunk, siteFile.name, uploadId);
            }

            // Update progress
            setUploadProgress(progress);

            // Update background job progress
            if (jobId) {
              await updateJobProgress({
                jobId,
                processedRecords,
                progress,
              });
            }
          }

          // Complete the job
          if (jobId && uploadId) {
            await completeUploadJob(jobId, uploadId);
          }

          setSiteParsing(false);
          setIsUploading(false);
          setUploadProgress(100);

          if (uploadId) {
            setUploadedPrimaryId(uploadId);
            setActiveTab("sdv_data");
          }
        } catch (error) {
          setSiteParsing(false);
          setIsUploading(false);
          setUploadProgress(0);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setSiteError(`Upload failed: ${errorMessage}`);
          
          // Fail the job
          if (jobId) {
            await failUploadJob(jobId, errorMessage);
          }
        }
      },
    });
  };

  const handleSDVUpload = async () => {
    if (!sdvFile) return;
    
    const primaryId = uploadedPrimaryId || selectedUploadId;
    if (!primaryId) {
      setSDVError("Please upload Site Data Entry first or select an existing upload");
      return;
    }

    Papa.parse(sdvFile, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const allRows = results.data as string[][];
        
        if (!allRows || allRows.length < 3) {
          setSDVError("CSV file must have at least 3 rows (2 header rows + data)");
          return;
        }

        // Row 0: Human-readable headers (skip)
        // Row 1: Technical headers (use for column mapping)
        // Row 2+: Actual data
        const headers = allRows[1];
        const dataRows = allRows.slice(2);
        
        const columnMap = buildColumnMap(headers, SDV_DATA_COLUMNS);
        const parsedData = dataRows
          .map((rowArray) => rowToRecord(rowArray, columnMap, SDV_DATA_COLUMNS))
          .filter((row) => {
            const subjectId = row["SubjectId"] || "";
            return subjectId.trim() !== "";
          });

        await onSDVDataUpload(primaryId, parsedData, sdvFile.name);
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setOpen(false);
    setActiveTab("site_data");
    setSiteFile(null);
    setSitePreviewData([]);
    setSiteTotalRowCount(0);
    setSiteError(null);
    setSiteDragActive(false);
    setUploadedPrimaryId(null);
    setSDVFile(null);
    setSDVPreviewData([]);
    setSDVTotalRowCount(0);
    setSDVError(null);
    setSDVDragActive(false);
    // Reset upload progress state
    setUploadProgress(0);
    setIsUploading(false);
    setCurrentJobId(null);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Upload SDV Tracker Data</DialogTitle>
          <DialogDescription className="text-[11px]">
            Upload Site Data Entry (primary) and SDV Data files to generate the SDV report.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "site_data" | "sdv_data")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="site_data" className="text-[11px]">
              1. Site Data Entry (Primary)
            </TabsTrigger>
            <TabsTrigger value="sdv_data" className="text-[11px]">
              2. SDV Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="site_data" className="space-y-4">
            <div className="text-[11px] text-muted-foreground">
              Required columns: SiteName, SubjectId, EventName, FormName, ItemId, ItemExportLabel, EditDateTime, EditBy
            </div>

            {!siteFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  siteDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragEnter={handleSiteDrag}
                onDragLeave={handleSiteDrag}
                onDragOver={handleSiteDrag}
                onDrop={handleSiteDrop}
                onClick={() => siteFileInputRef.current?.click()}
              >
                <input
                  ref={siteFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSiteFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Drop your Site Data Entry CSV here</p>
                <p className="text-[11px] text-muted-foreground">or click to browse</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{siteFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(siteFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSiteFile(null);
                      setSitePreviewData([]);
                      setSiteTotalRowCount(0);
                      setSiteError(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {siteParsing && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Parsing CSV...
                  </div>
                )}

                {siteError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-destructive">{siteError}</p>
                  </div>
                )}

                {!siteParsing && !siteError && sitePreviewData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Successfully parsed {siteTotalRowCount.toLocaleString()} records</span>
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
                              <th className="text-left p-1">EditDateTime</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sitePreviewData.map((row, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{row["SiteName"]}</td>
                                <td className="p-1">{row["SubjectId"]}</td>
                                <td className="p-1">{row["EventName"]}</td>
                                <td className="p-1">{row["FormName"]}</td>
                                <td className="p-1">{row["EditDateTime"]}</td>
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

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-[11px] text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading {siteTotalRowCount.toLocaleString()} records...</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <div className="text-[10px] text-blue-600 text-right">{uploadProgress}% complete</div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleSiteUpload}
                disabled={!siteFile || siteParsing || isUploading || !!siteError || sitePreviewData.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload & Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="sdv_data" className="space-y-4">
            <div className="text-[11px] text-muted-foreground">
              Required columns: SiteName, SubjectId, EventName, FormName, ItemId, ItemName, SdvBy, SdvDate
            </div>

            {(uploadedPrimaryId || selectedUploadId) && (
              <div className="flex items-center gap-2 text-[11px] text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {uploadedPrimaryId 
                    ? "Site Data Entry uploaded. Now upload SDV Data to complete the merge."
                    : "Using existing upload. Upload SDV Data to merge."
                  }
                </span>
              </div>
            )}

            {!sdvFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  sdvDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragEnter={handleSDVDrag}
                onDragLeave={handleSDVDrag}
                onDragOver={handleSDVDrag}
                onDrop={handleSDVDrop}
                onClick={() => sdvFileInputRef.current?.click()}
              >
                <input
                  ref={sdvFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSDVFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Drop your SDV Data CSV here</p>
                <p className="text-[11px] text-muted-foreground">or click to browse</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{sdvFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(sdvFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSDVFile(null);
                      setSDVPreviewData([]);
                      setSDVTotalRowCount(0);
                      setSDVError(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {sdvParsing && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Parsing CSV...
                  </div>
                )}

                {sdvError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-destructive">{sdvError}</p>
                  </div>
                )}

                {!sdvParsing && !sdvError && sdvPreviewData.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Successfully parsed {sdvTotalRowCount.toLocaleString()} records</span>
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
                              <th className="text-left p-1">SdvDate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sdvPreviewData.map((row, i) => (
                              <tr key={i} className="border-b last:border-b-0">
                                <td className="p-1">{row["SiteName"]}</td>
                                <td className="p-1">{row["SubjectId"]}</td>
                                <td className="p-1">{row["EventName"]}</td>
                                <td className="p-1">{row["FormName"]}</td>
                                <td className="p-1">{row["SdvDate"]}</td>
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

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSDVUpload}
                disabled={!sdvFile || sdvParsing || !!sdvError || sdvPreviewData.length === 0 || (!uploadedPrimaryId && !selectedUploadId)}
              >
                Upload & Merge
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
