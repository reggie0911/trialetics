'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  createUploadRecord,
  insertSiteDataBatch,
  insertSDVDataBatch,
  updateUploadProgress,
  completeUpload,
  failUpload,
  type SiteDataRecord,
  type SDVDataRecord,
} from '@/lib/actions/sdv-upload-v2';

// Batch size for chunked uploads
const BATCH_SIZE = 1000;

// Required columns for each file type (for display)
const SITE_DATA_REQUIRED_COLUMNS = [
  'SiteName', 'SubjectId', 'EventName', 'FormName',
  'ItemExportLabel', 'EditBy', 'EditDateTime', 'EditReason',
];

const SDV_DATA_REQUIRED_COLUMNS = [
  'SiteName', 'SubjectId', 'EventName', 'FormName',
  'ItemName', 'SdvBy', 'SdvDate',
];

interface SDVUploadWizardV2Props {
  companyId: string;
  profileId: string;
  reportId: string;
  hasSiteData: boolean;
  hasSDVData: boolean;
  onUploadComplete: () => void;
}

type UploadStep = 'site_data' | 'sdv_data' | 'complete';
type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'success' | 'error';

interface FileUploadState {
  file: File | null;
  uploadId: string | null;
  status: UploadStatus;
  progress: number;
  recordCount: number;
  totalRecords: number;
  error: string | null;
}

const initialFileState: FileUploadState = {
  file: null,
  uploadId: null,
  status: 'idle',
  progress: 0,
  recordCount: 0,
  totalRecords: 0,
  error: null,
};

export function SDVUploadWizardV2({
  companyId,
  profileId,
  reportId,
  hasSiteData: hasSiteDataProp,
  hasSDVData: hasSDVDataProp,
  onUploadComplete,
}: SDVUploadWizardV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<UploadStep>(
    hasSiteDataProp && !hasSDVDataProp ? 'sdv_data' : 'site_data'
  );
  const [siteDataState, setSiteDataState] = useState<FileUploadState>(initialFileState);
  const [sdvDataState, setSDVDataState] = useState<FileUploadState>(initialFileState);
  
  // Abort controller for cancelling uploads
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Derived state
  const hasSiteData = hasSiteDataProp || siteDataState.status === 'success';
  const hasSDVData = hasSDVDataProp || sdvDataState.status === 'success';

  // Parse CSV with PapaParse, skipping first row (human-readable headers)
  const parseCSV = useCallback((file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      let isFirstChunk = true;
      const allResults: Record<string, string>[] = [];
      
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        beforeFirstChunk: (chunk: string) => {
          // Remove the first line (human-readable headers)
          const lines = chunk.split('\n');
          lines.shift();
          return lines.join('\n');
        },
        chunk: (results) => {
          if (isFirstChunk) {
            isFirstChunk = false;
          }
          allResults.push(...results.data);
        },
        complete: () => {
          resolve(allResults);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  }, []);

  // Process file upload with client-side parsing
  const handleUpload = useCallback(async (file: File, fileType: 'site_data_entry' | 'sdv_data') => {
    const setState = fileType === 'site_data_entry' ? setSiteDataState : setSDVDataState;
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    // Reset state
    setState({
      file,
      uploadId: null,
      status: 'parsing',
      progress: 0,
      recordCount: 0,
      totalRecords: 0,
      error: null,
    });
    
    try {
      // Step 1: Parse CSV client-side
      const records = await parseCSV(file);
      const totalRecords = records.length;
      
      if (totalRecords === 0) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'CSV file is empty or has no valid data rows',
        }));
        return;
      }
      
      setState(prev => ({
        ...prev,
        status: 'uploading',
        totalRecords,
      }));
      
      // Step 2: Create upload record
      const { data: upload, error: createError } = await createUploadRecord(
        companyId,
        profileId,
        reportId,
        fileType,
        file.name,
        totalRecords
      );
      
      if (createError || !upload) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: createError || 'Failed to create upload record',
        }));
        return;
      }
      
      setState(prev => ({
        ...prev,
        uploadId: upload.id,
      }));
      
      // Step 3: Upload in batches
      let processedCount = 0;
      const batches = Math.ceil(totalRecords / BATCH_SIZE);
      
      for (let i = 0; i < batches; i++) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }
        
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalRecords);
        const batch = records.slice(start, end);
        
        // Insert batch
        let result;
        if (fileType === 'site_data_entry') {
          result = await insertSiteDataBatch(
            upload.id,
            companyId,
            reportId,
            batch as SiteDataRecord[]
          );
        } else {
          result = await insertSDVDataBatch(
            upload.id,
            companyId,
            reportId,
            batch as SDVDataRecord[]
          );
        }
        
        if (!result.success) {
          await failUpload(upload.id, result.error || 'Failed to insert batch');
          setState(prev => ({
            ...prev,
            status: 'error',
            error: result.error || 'Failed to insert batch',
          }));
          return;
        }
        
        processedCount += result.insertedCount;
        const progress = Math.round((processedCount / totalRecords) * 100);
        
        // Update progress in state
        setState(prev => ({
          ...prev,
          progress,
          recordCount: processedCount,
        }));
        
        // Update progress in database (every 10 batches to reduce API calls)
        if (i % 10 === 0 || i === batches - 1) {
          await updateUploadProgress(upload.id, processedCount, progress);
        }
      }
      
      // Step 4: Complete upload (no refresh needed with regular view)
      await completeUpload(upload.id, reportId, fileType, processedCount);
      
      setState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        recordCount: processedCount,
      }));
      
      // Move to next step or complete
      if (fileType === 'site_data_entry') {
        if (hasSDVDataProp) {
          setCurrentStep('complete');
          onUploadComplete();
        } else {
          setCurrentStep('sdv_data');
        }
      } else {
        setCurrentStep('complete');
        onUploadComplete();
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [companyId, profileId, reportId, hasSDVDataProp, onUploadComplete, parseCSV]);

  // Handle retry
  const handleRetry = useCallback(async (fileType: 'site_data_entry' | 'sdv_data') => {
    const state = fileType === 'site_data_entry' ? siteDataState : sdvDataState;
    
    if (state.file) {
      handleUpload(state.file, fileType);
    }
  }, [siteDataState, sdvDataState, handleUpload]);

  // Site Data dropzone
  const siteDataDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0], 'site_data_entry');
      }
    }, [handleUpload]),
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: siteDataState.status === 'parsing' || siteDataState.status === 'uploading',
  });

  // SDV Data dropzone
  const sdvDataDropzone = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0], 'sdv_data');
      }
    }, [handleUpload]),
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: sdvDataState.status === 'parsing' || sdvDataState.status === 'uploading',
  });

  // Render upload area
  const renderUploadArea = (
    dropzone: ReturnType<typeof useDropzone>,
    state: FileUploadState,
    title: string,
    requiredColumns: string[],
    fileType: 'site_data_entry' | 'sdv_data'
  ) => {
    const { getRootProps, getInputProps, isDragActive } = dropzone;

    if (state.status === 'success') {
      return (
        <div className="border-2 border-dashed border-green-200 rounded-lg p-8 bg-green-50">
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-700">Upload Complete</h3>
            <p className="text-sm text-green-600 mt-1">
              {state.recordCount.toLocaleString()} records uploaded successfully
            </p>
          </div>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="border-2 border-dashed border-red-200 rounded-lg p-8 bg-red-50">
          <div className="flex flex-col items-center justify-center text-center">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700">Upload Failed</h3>
            <p className="text-sm text-red-600 mt-1">{state.error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRetry(fileType)}
              className="mt-4 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (state.status === 'parsing' || state.status === 'uploading') {
      return (
        <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 bg-primary/5">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold">
              {state.status === 'parsing' ? 'Parsing CSV...' : 'Uploading Records...'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {state.file?.name}
            </p>
            {state.status === 'uploading' && (
              <div className="w-full max-w-xs mt-4">
                <Progress value={state.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {state.progress}% complete
                  {state.recordCount > 0 && ` • ${state.recordCount.toLocaleString()} / ${state.totalRecords.toLocaleString()} records`}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop a CSV file, or click to browse
          </p>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Required columns:</p>
          <div className="flex flex-wrap gap-1">
            {requiredColumns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Upload CSV Files
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload SDV Data</DialogTitle>
          <DialogDescription>
            Upload your Site Data Entry and SDV Data CSV files to generate the SDV report.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={`flex items-center gap-2 ${currentStep === 'site_data' ? 'text-primary' : siteDataState.status === 'success' || hasSiteData ? 'text-green-600' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${currentStep === 'site_data' ? 'border-primary bg-primary text-white' : siteDataState.status === 'success' || hasSiteData ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
              {siteDataState.status === 'success' || hasSiteData ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Site Data Entry</span>
          </div>
          <div className="w-8 h-px bg-muted-foreground/25" />
          <div className={`flex items-center gap-2 ${currentStep === 'sdv_data' ? 'text-primary' : sdvDataState.status === 'success' || hasSDVData ? 'text-green-600' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${currentStep === 'sdv_data' ? 'border-primary bg-primary text-white' : sdvDataState.status === 'success' || hasSDVData ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'}`}>
              {sdvDataState.status === 'success' || hasSDVData ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span className="text-sm font-medium">SDV Data</span>
          </div>
        </div>

        {/* Upload areas */}
        <div className="space-y-6">
          {currentStep === 'site_data' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Step 1: Upload Site Data Entry</CardTitle>
                <CardDescription>
                  Upload the Site Data Entry CSV file containing data entry records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUploadArea(
                  siteDataDropzone,
                  siteDataState,
                  'Upload Site Data Entry CSV',
                  SITE_DATA_REQUIRED_COLUMNS,
                  'site_data_entry'
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 'sdv_data' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Step 2: Upload SDV Data</CardTitle>
                <CardDescription>
                  Upload the SDV Data CSV file containing source data verification records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUploadArea(
                  sdvDataDropzone,
                  sdvDataState,
                  'Upload SDV Data CSV',
                  SDV_DATA_REQUIRED_COLUMNS,
                  'sdv_data'
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 'complete' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-green-700">All Files Uploaded</h3>
                  <p className="text-muted-foreground mt-2">
                    Both CSV files have been processed successfully. The SDV report is now ready.
                  </p>
                  <Button 
                    className="mt-6" 
                    onClick={() => {
                      setIsOpen(false);
                      onUploadComplete();
                    }}
                  >
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
