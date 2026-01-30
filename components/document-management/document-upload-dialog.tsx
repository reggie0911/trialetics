"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress, ProgressTrack, ProgressIndicator, ProgressValue } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  uploadDocumentFile,
  uploadDocumentFiles,
  createDocumentRecord,
  createDocumentRecords,
  DocumentRecordInput,
} from "@/lib/actions/document-management-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentUploadDialogProps {
  onUploadComplete: () => void;
  companyId: string;
  profileId: string;
}

type UploadMode = "single" | "bulk";

type FileUploadStatus = {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  filePath?: string;
  fileSize?: number;
};

export function DocumentUploadDialog({ onUploadComplete, companyId, profileId }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UploadMode>("single");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Single upload metadata
  const [singleMetadata, setSingleMetadata] = useState<DocumentRecordInput>({
    documentName: "",
    documentType: "",
    documentCategory: "",
    version: "",
    status: "Draft",
    siteName: "",
    projectId: "",
    uploadDate: new Date().toISOString().split('T')[0],
    approvalDate: "",
    expirationDate: "",
    approvedBy: "",
  });

  // Bulk upload metadata (applies to all files)
  const [bulkMetadata, setBulkMetadata] = useState<Omit<DocumentRecordInput, "documentName">>({
    documentType: "",
    documentCategory: "",
    version: "",
    status: "Draft",
    siteName: "",
    projectId: "",
    uploadDate: new Date().toISOString().split('T')[0],
    approvalDate: "",
    expirationDate: "",
    approvedBy: "",
  });

  // Individual file metadata overrides
  const [fileMetadataOverrides, setFileMetadataOverrides] = useState<Record<string, Partial<DocumentRecordInput>>>({});
  const [showIndividualMetadata, setShowIndividualMetadata] = useState(false);

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const allowedExtensions = ['.pdf', '.docx', '.xlsx'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return 'Invalid file type. Only PDF, DOCX, and XLSX files are allowed.';
    }
    if (file.size > maxFileSize) {
      return `File size exceeds 50MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }
    return null;
  };

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

    if (mode === "single") {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    } else {
      if (e.dataTransfer.files) {
        handleFilesSelect(Array.from(e.dataTransfer.files));
      }
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(selectedFile);
    setError(null);
    // Auto-populate document name from filename
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setSingleMetadata(prev => ({ ...prev, documentName: nameWithoutExt }));
  };

  const handleFilesSelect = (selectedFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(f => {
      const validationError = validateFile(f);
      if (validationError) {
        errors.push(`${f.name}: ${validationError}`);
      } else {
        validFiles.push(f);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadStatuses(prev => [
        ...prev,
        ...validFiles.map(f => ({
          file: f,
          status: "pending" as const,
          progress: 0,
        }))
      ]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
    const fileToRemove = files[index];
    if (fileToRemove) {
      const newOverrides = { ...fileMetadataOverrides };
      delete newOverrides[fileToRemove.name];
      setFileMetadataOverrides(newOverrides);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) return '📄';
    if (fileName.toLowerCase().endsWith('.docx')) return '📝';
    if (fileName.toLowerCase().endsWith('.xlsx')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleSingleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    // Validate required fields
    if (!singleMetadata.documentName || !singleMetadata.documentType || !singleMetadata.version || !singleMetadata.siteName || !singleMetadata.uploadDate) {
      setError("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload file
      const uploadResult = await uploadDocumentFile(file, companyId, profileId);
      if (!uploadResult.success || !uploadResult.data) {
        setError(uploadResult.error || "Failed to upload file");
        setUploading(false);
        return;
      }

      // Create document record
      const recordResult = await createDocumentRecord(
        singleMetadata,
        companyId,
        profileId,
        uploadResult.data.filePath,
        uploadResult.data.fileSize
      );

      if (!recordResult.success) {
        setError(recordResult.error || "Failed to create document record");
        setUploading(false);
        return;
      }

      toast({
        title: "Upload Successful",
        description: `Document "${singleMetadata.documentName}" uploaded successfully`,
      });

      setOpen(false);
      resetForm();
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file");
      return;
    }

    // Validate required fields
    if (!bulkMetadata.documentType || !bulkMetadata.version || !bulkMetadata.siteName || !bulkMetadata.uploadDate) {
      setError("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setError(null);

    // Update all statuses to uploading
    setUploadStatuses(prev => prev.map(s => ({ ...s, status: "uploading" as const, progress: 0 })));

    try {
      // Upload all files
      const uploadResult = await uploadDocumentFiles(files, companyId, profileId);
      if (!uploadResult.success || !uploadResult.data) {
        setError(uploadResult.error || "Failed to upload files");
        setUploading(false);
        return;
      }

      // Update statuses based on upload results
      const uploadResults = uploadResult.data;
      const records: Array<DocumentRecordInput & { filePath: string; fileSize: number }> = [];
      const errors: string[] = [];

      uploadResults.forEach((result, index) => {
        if (result.error) {
          setUploadStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[index] = {
              ...newStatuses[index],
              status: "error",
              error: result.error,
            };
            return newStatuses;
          });
          errors.push(`${result.fileName}: ${result.error}`);
        } else {
          setUploadStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[index] = {
              ...newStatuses[index],
              status: "success",
              progress: 100,
              filePath: result.filePath,
              fileSize: result.fileSize,
            };
            return newStatuses;
          });

          // Prepare record data
          const fileOverride = fileMetadataOverrides[result.fileName] || {};
          const documentName = fileOverride.documentName || result.fileName.replace(/\.[^/.]+$/, "");
          
          records.push({
            documentName,
            documentType: fileOverride.documentType || bulkMetadata.documentType!,
            documentCategory: fileOverride.documentCategory || bulkMetadata.documentCategory,
            version: fileOverride.version || bulkMetadata.version!,
            status: fileOverride.status || bulkMetadata.status!,
            siteName: fileOverride.siteName || bulkMetadata.siteName!,
            projectId: fileOverride.projectId || bulkMetadata.projectId,
            uploadDate: fileOverride.uploadDate || bulkMetadata.uploadDate!,
            approvalDate: fileOverride.approvalDate || bulkMetadata.approvalDate,
            expirationDate: fileOverride.expirationDate || bulkMetadata.expirationDate,
            approvedBy: fileOverride.approvedBy || bulkMetadata.approvedBy,
            filePath: result.filePath,
            fileSize: result.fileSize,
          });
        }
      });

      // Create document records for successful uploads
      if (records.length > 0) {
        const recordsResult = await createDocumentRecords(records, companyId, profileId);
        if (!recordsResult.success) {
          setError(recordsResult.error || "Failed to create document records");
          setUploading(false);
          return;
        }

        const successCount = recordsResult.data?.successCount || 0;
        const failedCount = recordsResult.data?.failedCount || 0;

        if (errors.length > 0) {
          toast({
            title: "Partial Upload Complete",
            description: `${successCount} documents uploaded successfully, ${failedCount} failed`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Upload Successful",
            description: `${successCount} documents uploaded successfully`,
          });
        }
      } else {
        setError("No files were uploaded successfully");
        setUploading(false);
        return;
      }

      // If all succeeded, close dialog
      if (errors.length === 0) {
        setTimeout(() => {
          setOpen(false);
          resetForm();
          onUploadComplete();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFiles([]);
    setUploadStatuses([]);
    setError(null);
    setSingleMetadata({
      documentName: "",
      documentType: "",
      documentCategory: "",
      version: "",
      status: "Draft",
      siteName: "",
      projectId: "",
      uploadDate: new Date().toISOString().split('T')[0],
      approvalDate: "",
      expirationDate: "",
      approvedBy: "",
    });
    setBulkMetadata({
      documentType: "",
      documentCategory: "",
      version: "",
      status: "Draft",
      siteName: "",
      projectId: "",
      uploadDate: new Date().toISOString().split('T')[0],
      approvalDate: "",
      expirationDate: "",
      approvedBy: "",
    });
    setFileMetadataOverrides({});
    setShowIndividualMetadata(false);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger render={<Button variant="default" size="sm" className="text-[11px] h-8" />}>
        <Upload className="h-3 w-3 mr-2" />
        Upload Document
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xs">Upload Document</DialogTitle>
          <DialogDescription className="text-xs">
            Upload PDF, DOCX, or XLSX documents with metadata
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as UploadMode)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="text-xs">Single Upload</TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs">Bulk Upload</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 max-h-[calc(90vh-200px)]">
            <TabsContent value="single" className="space-y-4 mt-0 pb-4">
              {/* File Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                {!file ? (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-2">
                      Drag and drop a file here, or click to select
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      Select File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF, DOCX, XLSX (max 50MB)
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <div className="text-left">
                        <p className="text-xs font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-xs"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Metadata Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docName" className="text-xs">Document Name *</Label>
                  <Input
                    id="docName"
                    value={singleMetadata.documentName}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, documentName: e.target.value }))}
                    placeholder="Enter document name"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docType">Document Type *</Label>
                  <Select
                    value={singleMetadata.documentType}
                    onValueChange={(value) => setSingleMetadata(prev => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger id="docType" className="text-xs h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Protocol" className="text-xs">Protocol</SelectItem>
                      <SelectItem value="ICF" className="text-xs">ICF</SelectItem>
                      <SelectItem value="IRB" className="text-xs">IRB</SelectItem>
                      <SelectItem value="Regulatory" className="text-xs">Regulatory</SelectItem>
                      <SelectItem value="Site File" className="text-xs">Site File</SelectItem>
                      <SelectItem value="Other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs">Category</Label>
                  <Input
                    id="category"
                    value={singleMetadata.documentCategory || ""}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, documentCategory: e.target.value }))}
                    placeholder="Optional"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version" className="text-xs">Version *</Label>
                  <Input
                    id="version"
                    value={singleMetadata.version}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="e.g., 1.0"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs">Status *</Label>
                  <Select
                    value={singleMetadata.status}
                    onValueChange={(value) => setSingleMetadata(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="status" className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft" className="text-xs">Draft</SelectItem>
                      <SelectItem value="Under Review" className="text-xs">Under Review</SelectItem>
                      <SelectItem value="Approved" className="text-xs">Approved</SelectItem>
                      <SelectItem value="Expired" className="text-xs">Expired</SelectItem>
                      <SelectItem value="Superseded" className="text-xs">Superseded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteName" className="text-xs">Site Name *</Label>
                  <Input
                    id="siteName"
                    value={singleMetadata.siteName}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="e.g., Site 001"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectId" className="text-xs">Project ID</Label>
                  <Input
                    id="projectId"
                    value={singleMetadata.projectId || ""}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, projectId: e.target.value }))}
                    placeholder="Optional"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uploadDate" className="text-xs">Upload Date *</Label>
                  <Input
                    id="uploadDate"
                    type="date"
                    value={singleMetadata.uploadDate}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, uploadDate: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approvalDate" className="text-xs">Approval Date</Label>
                  <Input
                    id="approvalDate"
                    type="date"
                    value={singleMetadata.approvalDate || ""}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, approvalDate: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expirationDate" className="text-xs">Expiration Date</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={singleMetadata.expirationDate || ""}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, expirationDate: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approvedBy" className="text-xs">Approved By</Label>
                  <Input
                    id="approvedBy"
                    value={singleMetadata.approvedBy || ""}
                    onChange={(e) => setSingleMetadata(prev => ({ ...prev, approvedBy: e.target.value }))}
                    placeholder="Optional"
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-0 pb-4">
              {/* Bulk File Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesSelect(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-2">
                  Drag and drop files here, or click to select multiple files
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Select Files
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, DOCX, XLSX (max 50MB each)
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Selected Files ({files.length})</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowIndividualMetadata(!showIndividualMetadata)}
                      className="text-xs"
                    >
                      {showIndividualMetadata ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showIndividualMetadata ? "Hide" : "Show"} Individual Metadata
                    </Button>
                  </div>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {files.map((f, index) => (
                      <div key={index} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xl">{getFileIcon(f.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
                          </div>
                          {uploadStatuses[index] && (
                            <div className="flex items-center gap-2">
                              {uploadStatuses[index].status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {uploadStatuses[index].status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                              {uploadStatuses[index].status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                          )}
                        </div>
                        {!uploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-xs"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Metadata Form */}
              <div className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xs font-semibold text-foreground">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkDocType" className="text-xs font-medium">Document Type *</Label>
                      <Select
                        value={bulkMetadata.documentType}
                        onValueChange={(value) => setBulkMetadata(prev => ({ ...prev, documentType: value }))}
                      >
                        <SelectTrigger id="bulkDocType" className="text-xs h-8">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Protocol" className="text-xs">Protocol</SelectItem>
                          <SelectItem value="ICF" className="text-xs">ICF</SelectItem>
                          <SelectItem value="IRB" className="text-xs">IRB</SelectItem>
                          <SelectItem value="Regulatory" className="text-xs">Regulatory</SelectItem>
                          <SelectItem value="Site File" className="text-xs">Site File</SelectItem>
                          <SelectItem value="Other" className="text-xs">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkCategory" className="text-xs font-medium">Category</Label>
                      <Input
                        id="bulkCategory"
                        value={bulkMetadata.documentCategory || ""}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, documentCategory: e.target.value }))}
                        placeholder="Optional"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkVersion" className="text-xs font-medium">Version *</Label>
                      <Input
                        id="bulkVersion"
                        value={bulkMetadata.version}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, version: e.target.value }))}
                        placeholder="e.g., 1.0"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkStatus" className="text-xs font-medium">Status *</Label>
                      <Select
                        value={bulkMetadata.status}
                        onValueChange={(value) => setBulkMetadata(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger id="bulkStatus" className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft" className="text-xs">Draft</SelectItem>
                          <SelectItem value="Under Review" className="text-xs">Under Review</SelectItem>
                          <SelectItem value="Approved" className="text-xs">Approved</SelectItem>
                          <SelectItem value="Expired" className="text-xs">Expired</SelectItem>
                          <SelectItem value="Superseded" className="text-xs">Superseded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Site & Project Information Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xs font-semibold text-foreground">Site & Project Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkSiteName" className="text-xs font-medium">Site Name *</Label>
                      <Input
                        id="bulkSiteName"
                        value={bulkMetadata.siteName}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, siteName: e.target.value }))}
                        placeholder="e.g., Site 001"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkProjectId" className="text-xs font-medium">Project ID</Label>
                      <Input
                        id="bulkProjectId"
                        value={bulkMetadata.projectId || ""}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, projectId: e.target.value }))}
                        placeholder="Optional"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates Section */}
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xs font-semibold text-foreground">Dates</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkUploadDate" className="text-xs font-medium">Upload Date *</Label>
                      <Input
                        id="bulkUploadDate"
                        type="date"
                        value={bulkMetadata.uploadDate}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, uploadDate: e.target.value }))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkApprovalDate" className="text-xs font-medium">Approval Date</Label>
                      <Input
                        id="bulkApprovalDate"
                        type="date"
                        value={bulkMetadata.approvalDate || ""}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, approvalDate: e.target.value }))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkExpirationDate" className="text-xs font-medium">Expiration Date</Label>
                      <Input
                        id="bulkExpirationDate"
                        type="date"
                        value={bulkMetadata.expirationDate || ""}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, expirationDate: e.target.value }))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulkApprovedBy" className="text-xs font-medium">Approved By</Label>
                      <Input
                        id="bulkApprovedBy"
                        value={bulkMetadata.approvedBy || ""}
                        onChange={(e) => setBulkMetadata(prev => ({ ...prev, approvedBy: e.target.value }))}
                        placeholder="Optional"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-xs text-destructive whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={mode === "single" ? handleSingleUpload : handleBulkUpload}
              disabled={uploading || (mode === "single" ? !file : files.length === 0)}
              className="text-xs"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {mode === "single" ? "Document" : `${files.length} Documents`}
                </>
              )}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
