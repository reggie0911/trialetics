"use client";

import { useState, useRef } from "react";
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
import { createUploadJob } from "@/lib/actions/sdv-file-upload";
import { createClient } from "@/lib/client";

interface SDVFileUploadDialogProps {
  companyId: string;
  profileId: string;
  selectedUploadId: string | null;
  onUploadStarted?: (jobId: string) => void;
  onMergeComplete?: () => void;
}

export function SDVFileUploadDialog({
  companyId,
  profileId,
  selectedUploadId,
  onUploadStarted,
  onMergeComplete,
}: SDVFileUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"site_data" | "sdv_data">("site_data");

  // Site Data Entry state
  const [siteFile, setSiteFile] = useState<File | null>(null);
  const [siteUploading, setSiteUploading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [siteDragActive, setSiteDragActive] = useState(false);
  const siteFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPrimaryJobId, setUploadedPrimaryJobId] = useState<string | null>(null);
  const [uploadedPrimaryUploadId, setUploadedPrimaryUploadId] = useState<string | null>(null);

  // SDV Data state
  const [sdvFile, setSDVFile] = useState<File | null>(null);
  const [sdvUploading, setSDVUploading] = useState(false);
  const [sdvError, setSDVError] = useState<string | null>(null);
  const [sdvDragActive, setSDVDragActive] = useState(false);
  const sdvFileInputRef = useRef<HTMLInputElement>(null);
  const [sdvUploadComplete, setSdvUploadComplete] = useState(false);

  const handleSiteFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setSiteError("Please select a CSV file");
      return;
    }
    setSiteFile(selectedFile);
    setSiteError(null);
  };

  const handleSDVFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setSDVError("Please select a CSV file");
      return;
    }
    setSDVFile(selectedFile);
    setSDVError(null);
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

    setSiteUploading(true);
    setSiteError(null);

    try {
      const supabase = createClient();

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = siteFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${companyId}/${timestamp}_${sanitizedFileName}`;

      // Upload file directly to Supabase Storage (client-side)
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(filePath, siteFile, {
          contentType: 'text/csv',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create job via server action (only metadata, no file)
      const result = await createUploadJob({
        filePath,
        fileName: siteFile.name,
        fileSize: siteFile.size,
        fileType: "sdv_site_data_entry",
        companyId,
        profileId,
        primaryUploadId: null,
      });

      if (result.success && result.jobId) {
        setUploadedPrimaryJobId(result.jobId);

        if (onUploadStarted) {
          onUploadStarted(result.jobId);
        }

        // Wait for the job to complete and get the upload_id
        // Poll the job until upload_id is available (Edge Function creates the sdv_uploads record)
        const supabaseClient = createClient();
        let attempts = 0;
        const maxAttempts = 60; // Max 60 seconds wait
        
        const pollForUploadId = async () => {
          while (attempts < maxAttempts) {
            const { data: jobData, error: jobError } = await supabaseClient
              .from('upload_jobs')
              .select('upload_id, status')
              .eq('id', result.jobId)
              .single();

            if (jobError) {
              console.error('Error polling job:', jobError);
              break;
            }

            if (jobData?.upload_id) {
              console.log('[Upload] Site Data upload_id retrieved:', jobData.upload_id);
              setUploadedPrimaryUploadId(jobData.upload_id);
              break;
            }

            if (jobData?.status === 'failed') {
              console.error('[Upload] Job failed, stopping poll');
              break;
            }

            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        };

        // Start polling in background (don't block tab switch)
        pollForUploadId();

        // Move to SDV data tab
        setActiveTab("sdv_data");
      } else {
        // Clean up uploaded file on error
        await supabase.storage.from('csv-uploads').remove([filePath]);
        setSiteError(result.error || "Upload failed");
      }
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSiteUploading(false);
    }
  };

  const handleSDVUpload = async () => {
    if (!sdvFile) return;

    // Need either a just-uploaded primary or a selected existing one
    const primaryId = uploadedPrimaryUploadId || selectedUploadId;
    
    if (!primaryId) {
      // If we have a job ID but no upload ID yet, the job is still processing
      if (uploadedPrimaryJobId) {
        setSDVError("Please wait for Site Data Entry to finish processing before uploading SDV Data");
      } else {
        setSDVError("Please upload Site Data Entry first or select an existing upload");
      }
      return;
    }

    setSDVUploading(true);
    setSDVError(null);

    try {
      const supabase = createClient();

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = sdvFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${companyId}/${timestamp}_${sanitizedFileName}`;

      // Upload file directly to Supabase Storage (client-side)
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(filePath, sdvFile, {
          contentType: 'text/csv',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create job via server action (only metadata, no file)
      const result = await createUploadJob({
        filePath,
        fileName: sdvFile.name,
        fileSize: sdvFile.size,
        fileType: "sdv_data",
        companyId,
        profileId,
        primaryUploadId: primaryId,
      });

      if (result.success && result.jobId) {
        if (onUploadStarted) {
          onUploadStarted(result.jobId);
        }

        setSdvUploadComplete(true);
        
        // Trigger data refresh after upload completes
        if (onMergeComplete) {
          onMergeComplete();
        }
        
        // Close dialog after short delay
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        // Clean up uploaded file on error
        await supabase.storage.from('csv-uploads').remove([filePath]);
        setSDVError(result.error || "Upload failed");
      }
    } catch (error) {
      setSDVError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSDVUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setActiveTab("site_data");
    setSiteFile(null);
    setSiteError(null);
    setSiteDragActive(false);
    setSiteUploading(false);
    setUploadedPrimaryJobId(null);
    setUploadedPrimaryUploadId(null);
    setSDVFile(null);
    setSDVError(null);
    setSDVDragActive(false);
    setSDVUploading(false);
    setSdvUploadComplete(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload SDV Tracker Data</DialogTitle>
          <DialogDescription>
            Upload Site Data Entry (primary) and SDV Data files. Calculations are performed automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "site_data" | "sdv_data")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="site_data" className="text-[11px]">
              1. Site Data Entry
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
                  siteDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
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
                    e.preventDefault();
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
                        {formatFileSize(siteFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSiteFile(null);
                      setSiteError(null);
                    }}
                    disabled={siteUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {siteError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-destructive">{siteError}</p>
                  </div>
                )}

                {uploadedPrimaryJobId && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>File uploaded! Processing in background. Continue to upload SDV Data.</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={siteUploading}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSiteUpload}
                disabled={!siteFile || siteUploading || !!uploadedPrimaryJobId}
              >
                {siteUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : uploadedPrimaryJobId ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Uploaded
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

            {/* Status indicator */}
            {uploadedPrimaryJobId && !uploadedPrimaryUploadId && (
              <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 p-2 rounded">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Site Data Entry processing... Please wait before uploading SDV Data.</span>
              </div>
            )}

            {(uploadedPrimaryUploadId || selectedUploadId) && (
              <div className="flex items-center gap-2 text-[11px] text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {uploadedPrimaryUploadId
                    ? "Site Data Entry ready! Upload SDV Data to complete."
                    : "Using existing upload. Upload SDV Data to complete."
                  }
                </span>
              </div>
            )}

            {!sdvFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  sdvDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
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
                    e.preventDefault();
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
                        {formatFileSize(sdvFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSDVFile(null);
                      setSDVError(null);
                    }}
                    disabled={sdvUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {sdvError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-destructive">{sdvError}</p>
                  </div>
                )}

                {sdvUploadComplete && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>SDV Data uploaded! Your data is now available to view.</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={sdvUploading}>
                {sdvUploadComplete ? "Done" : "Cancel"}
              </Button>
              <Button
                type="button"
                onClick={handleSDVUpload}
                disabled={!sdvFile || sdvUploading || sdvUploadComplete || (!selectedUploadId && !uploadedPrimaryUploadId)}
              >
                {sdvUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : sdvUploadComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </>
                ) : (
                  <>
                    Upload & Finish
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
