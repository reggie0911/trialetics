"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, FileText, Calendar, BarChart2, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SDVUpload } from "@/lib/actions/sdv-tracker";

interface SDVUploadHistoryProps {
  uploads: SDVUpload[];
  onUploadDelete?: (uploadId: string) => void;
}

export function SDVUploadHistory({
  uploads,
  onUploadDelete,
}: SDVUploadHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);

  const handleDeleteClick = (uploadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadToDelete(uploadId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (uploadToDelete && onUploadDelete) {
      onUploadDelete(uploadToDelete);
    }
    setDeleteDialogOpen(false);
    setUploadToDelete(null);
  };

  // Group uploads by file type
  const siteDataUploads = uploads.filter(u => u.file_type === 'site_data_entry');
  const sdvDataUploads = uploads.filter(u => u.file_type === 'sdv_data');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Completed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 gap-1">
            <XCircle className="h-2.5 w-2.5" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getFileTypeBadge = (fileType: string) => {
    if (fileType === 'site_data_entry') {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
          Site Data
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200">
        SDV Data
      </Badge>
    );
  };

  const renderUploadItem = (upload: SDVUpload) => {
    const uploadDate = new Date(upload.created_at);
    return (
      <div
        key={upload.id}
        className="group relative border rounded-md p-3 transition-colors hover:bg-accent"
      >
        {/* File Name & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-xs truncate">
              {upload.file_name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusBadge(upload.status)}
            {onUploadDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteClick(upload.id, e)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* File Type & Stats Row */}
        <div className="flex items-center gap-2 mt-1.5">
          {getFileTypeBadge(upload.file_type)}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <BarChart2 className="h-2.5 w-2.5" />
            <span>{upload.record_count.toLocaleString()} records</span>
          </div>
        </div>

        {/* Error Message (if failed) */}
        {upload.status === 'failed' && upload.error_message && (
          <div className="text-[10px] text-red-600 mt-1.5 bg-red-50 rounded px-2 py-1">
            {upload.error_message}
          </div>
        )}

        {/* Upload Time */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1.5">
          <Calendar className="h-2.5 w-2.5" />
          <span>
            {uploadDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })} at {uploadDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span>
            {formatDistanceToNow(uploadDate, { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" className="text-[11px] h-8" />}>
          <History className="h-3 w-3 mr-2" />
          Upload History
          {uploads.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
              {uploads.length}
            </Badge>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>SDV Upload History</SheetTitle>
            <SheetDescription className="text-xs">
              View and manage SDV data uploads
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="px-4 py-2">
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-xs text-muted-foreground">
                    No uploads yet. Upload your Site Data Entry and SDV Data CSV files to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Site Data Entry Uploads */}
                  {siteDataUploads.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Site Data Entry Uploads
                      </h3>
                      <div className="space-y-2">
                        {siteDataUploads.map(renderUploadItem)}
                      </div>
                    </div>
                  )}

                  {/* SDV Data Uploads */}
                  {sdvDataUploads.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        SDV Data Uploads
                      </h3>
                      <div className="space-y-2">
                        {sdvDataUploads.map(renderUploadItem)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Upload?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this upload and all associated records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
