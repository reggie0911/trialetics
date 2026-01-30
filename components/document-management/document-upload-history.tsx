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
import { History, FileText, Calendar, BarChart2, Trash2 } from "lucide-react";
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

interface DocumentUploadHistoryProps {
  uploads: Tables<'document_uploads'>[];
  selectedUploadId: string | null;
  onUploadSelect: (uploadId: string) => void;
  onUploadDelete?: (uploadId: string) => void;
}

export function DocumentUploadHistory({
  uploads,
  selectedUploadId,
  onUploadSelect,
  onUploadDelete,
}: DocumentUploadHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);

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

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <Button variant="outline" size="sm" asChild>
          <SheetTrigger className="text-[11px] h-8">
            <History className="h-3 w-3 mr-2" />
            Upload History
            {uploads.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                {uploads.length}
              </Badge>
            )}
          </SheetTrigger>
        </Button>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Document Upload History</SheetTitle>
            <SheetDescription className="text-xs">
              View and manage previous document data uploads
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="px-4 py-2">
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-xs text-muted-foreground">
                    No uploads yet. Upload your first document data CSV file to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploads.map((upload) => {
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
                        {isSelected && (
                          <Badge 
                            variant="default" 
                            className="absolute top-2 right-2 text-[9px] h-5 px-1.5"
                          >
                            Active
                          </Badge>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate pr-12">
                                {upload.file_name}
                              </p>
                            </div>
                            {onUploadDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => handleDeleteClick(upload.id, e)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
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
              This will permanently delete this upload and all associated document records.
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
