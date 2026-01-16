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
import { History, FileText, Calendar, Users, Trash2 } from "lucide-react";
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

interface UploadHistoryProps {
  uploads: Tables<'patient_uploads'>[];
  selectedUploadId: string | null;
  onUploadSelect: (uploadId: string) => void;
  onUploadDelete?: (uploadId: string) => void;
}

export function UploadHistory({
  uploads,
  selectedUploadId,
  onUploadSelect,
  onUploadDelete,
}: UploadHistoryProps) {
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
          <SheetTrigger>
            <History className="h-4 w-4 mr-2" />
            Upload History
            {uploads.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {uploads.length}
              </Badge>
            )}
          </SheetTrigger>
        </Button>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Upload History</SheetTitle>
            <SheetDescription>
              View and manage previous patient data uploads
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="px-4 py-2">
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-xs text-muted-foreground">
                    No uploads yet. Upload your first patient data CSV file to get started.
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
                        className={`group relative border rounded-md p-3 cursor-pointer transition-colors hover:bg-accent ${
                          isSelected ? 'bg-accent border-primary' : ''
                        }`}
                        onClick={() => handleSelect(upload.id)}
                      >
                        {/* File Name & Delete */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-xs truncate">
                              {upload.file_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                Current
                              </Badge>
                            )}
                            {/* Delete button hidden for now */}
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                          <div className="flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            <span>{upload.row_count} patients</span>
                          </div>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{upload.column_count} columns</span>
                        </div>

                        {/* Upload Time */}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1">
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
                  })}
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
              This will permanently delete this upload and all associated patient data.
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
