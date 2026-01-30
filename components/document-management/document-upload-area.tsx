"use client";

import { useState, useRef } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PendingDocumentRecord } from "@/lib/actions/document-management-data";

interface DocumentUploadAreaProps {
  onDocumentsStaged: (documents: PendingDocumentRecord[]) => void;
}

export function DocumentUploadArea({ onDocumentsStaged }: DocumentUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const createPendingDocument = (file: File): PendingDocumentRecord => {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const tempId = globalThis.crypto.randomUUID();
    
    return {
      tempId,
      file,
      uploadStatus: 'pending',
      documentName: nameWithoutExt,
      documentType: "",
      documentCategory: "",
      version: "1.0",
      status: "Draft",
      siteName: "",
      projectId: "",
      uploadDate: new Date().toISOString().split('T')[0],
      approvalDate: "",
      expirationDate: "",
      approvedBy: "",
      artifactName: "",
      recommendedSubArtifacts: "",
    };
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

    if (e.dataTransfer.files) {
      handleFilesSelect(Array.from(e.dataTransfer.files));
    }
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
      const errorMsg = errors.join('\n');
      setError(errorMsg);
      toast({
        title: "Some Files Invalid",
        description: `${errors.length} file(s) could not be added`,
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      const pendingDocs = validFiles.map(file => createPendingDocument(file));
      onDocumentsStaged(pendingDocs);
      
      toast({
        title: "Files Staged",
        description: `${validFiles.length} file(s) added to upload queue. Edit details and click Save.`,
      });
      
      setError(null);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">Upload Documents</h2>
        <p className="text-xs text-muted-foreground">
          Select files to stage for upload. Documents will appear in the table below where you can edit metadata before saving.
        </p>
      </div>

      {/* Bulk File Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-green-500 bg-green-50" : "border-green-400 bg-green-50/50"
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
        <Upload className="h-12 w-12 mx-auto mb-4 text-green-600" />
        <p className="text-xs text-muted-foreground mb-2">
          Click to upload or drag and drop multiple files
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs bg-green-600 text-white hover:bg-green-700 border-green-600"
        >
          Select Files
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          PDF, DOCX, XLSX (max 50MB each)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-xs text-destructive whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
