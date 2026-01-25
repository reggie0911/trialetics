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
import { History, FileText, Calendar, BarChart2, Trash2, Merge, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Tables } from "@/lib/types/database.types";
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

interface SDVUploadHistoryProps {
  uploads: Tables<'sdv_uploads'>[];
  selectedUploadId: string | null;
  onUploadSelect: (uploadId: string) => void;
  onUploadDelete?: (uploadId: string) => void;
}

export function SDVUploadHistory({
  uploads,
  selectedUploadId,
  onUploadSelect,
  onUploadDelete,
}: SDVUploadHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);

  // Filter to only show site_data_entry uploads (primary uploads)
  const primaryUploads = uploads.filter(u => u.upload_type === 'site_data_entry');

  const handleSelect = (uploadId: string) => {
    onUploadSelect(uploadId);
    setIsOpen(false);
  };

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

  const getMergeStatusBadge = (upload: Tables<'sdv_uploads'>) => {
    const status = (upload as any).merge_status || 'pending';
    const hasSdvData = !!(upload as any).sdv_upload_id;

    if (status === 'completed') {
      return (
        <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-green-500 text-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          SDV Complete
        </Badge>
      );
    }

    if (status === 'processing') {
      return (
        <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-blue-500 text-blue-600">
          <Clock className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-red-500 text-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }

    // If SDV data is linked, the view automatically calculates metrics
    if (hasSdvData) {
      return (
        <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-green-500 text-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          SDV Linked
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-muted-foreground">
        <Clock className="h-3 w-3 mr-1" />
        Awaiting SDV
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <Button variant="outline" size="sm" asChild>
          <SheetTrigger className="text-[11px] h-8 hover:bg-accent/80 hover:scale-[1.02] transition-all duration-150">
            <History className="h-3 w-3 mr-2" />
            Upload History
            {primaryUploads.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {primaryUploads.length}
              </Badge>
            )}
          </SheetTrigger>
        </Button>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>SDV Tracker Upload History</SheetTitle>
            <SheetDescription className="text-xs">
              View and manage previous SDV data uploads
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="px-4 py-2">
              {primaryUploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-xs text-muted-foreground">
                    No uploads yet. Upload your Site Data Entry CSV file to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {primaryUploads.map((upload) => {
                    const isSelected = upload.id === selectedUploadId;
                    const uploadDate = new Date(upload.created_at);
                    return (
                      <div
                        key={upload.id}
                        className={`
                          relative p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }
                        `}
                        onClick={() => handleSelect(upload.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {isSelected && (
                              <Badge 
                                variant="default" 
                                className="text-[9px] h-5 px-1.5 mb-2"
                              >
                                Active
                              </Badge>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {upload.file_name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDistanceToNow(uploadDate, { addSuffix: true })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <BarChart2 className="h-3 w-3" />
                                  <span>{upload.row_count.toLocaleString()} records</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {getMergeStatusBadge(upload)}
                              </div>
                            </div>
                          </div>

                          {onUploadDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => handleDeleteClick(upload.id, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Upload</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this upload and all associated SDV records.
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
