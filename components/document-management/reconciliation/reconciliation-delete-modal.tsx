"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReconciliationDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  categoryName: string;
  documentFields: Record<string, string | null>;
}

export function ReconciliationDeleteModal({
  open,
  onOpenChange,
  onConfirm,
  categoryName,
  documentFields,
}: ReconciliationDeleteModalProps) {
  // Extract staff member name from common field names
  const getStaffName = (): string | null => {
    const fieldNames = ["investigatorName", "principalName", "piName", "coPrincipalName"];
    for (const fieldName of fieldNames) {
      const value = documentFields[fieldName];
      if (value && value.trim() !== "") {
        return value;
      }
    }
    return null;
  };

  // Extract version if available
  const getVersion = (): string | null => {
    const version = documentFields["version"];
    if (version && version.trim() !== "") {
      return version;
    }
    return null;
  };

  const staffName = getStaffName();
  const version = getVersion();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-semibold">
            Delete Document?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            This action cannot be undone. The document will be permanently removed from the tracker.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Document Information Card */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground min-w-[80px]">
                Category:
              </span>
              <span className="text-[11px] font-medium text-foreground flex-1">
                {categoryName}
              </span>
            </div>
            {staffName && (
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground min-w-[80px]">
                  Staff Member:
                </span>
                <span className="text-[11px] font-medium text-foreground flex-1">
                  {staffName}
                </span>
              </div>
            )}
            {version && (
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground min-w-[80px]">
                  Version:
                </span>
                <span className="text-[11px] font-medium text-foreground flex-1">
                  {version}
                </span>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="text-[11px] h-9">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[11px] h-9"
          >
            Delete Document
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
