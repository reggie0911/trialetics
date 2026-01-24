"use client";

import { useState } from "react";
import { Merge, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { triggerMerge } from "@/lib/actions/sdv-file-upload";

interface SDVMergeButtonProps {
  siteDataUploadId: string;
  companyId: string;
  hasSdvData: boolean;
  mergeStatus: "pending" | "processing" | "completed" | "failed";
  onMergeComplete?: () => void;
}

export function SDVMergeButton({
  siteDataUploadId,
  companyId,
  hasSdvData,
  mergeStatus,
  onMergeComplete,
}: SDVMergeButtonProps) {
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async () => {
    setIsMerging(true);
    setError(null);

    try {
      const result = await triggerMerge(siteDataUploadId, companyId);

      if (result.success) {
        if (onMergeComplete) {
          onMergeComplete();
        }
      } else {
        setError(result.error || "Merge failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setIsMerging(false);
    }
  };

  // Already merged
  if (mergeStatus === "completed") {
    return (
      <Button variant="outline" size="sm" disabled className="text-[11px] h-8 text-green-600">
        <CheckCircle2 className="h-3 w-3 mr-2" />
        Merged
      </Button>
    );
  }

  // Currently merging
  if (mergeStatus === "processing" || isMerging) {
    return (
      <Button variant="outline" size="sm" disabled className="text-[11px] h-8">
        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
        Merging...
      </Button>
    );
  }

  // Failed merge
  if (mergeStatus === "failed") {
    return (
      <AlertDialog>
        <AlertDialogTrigger
          render={(props) => (
            <button
              {...props}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all rounded-md border border-red-200 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-[11px] h-8 px-3 py-2 gap-1.5 text-red-600"
            >
              <AlertCircle className="h-3 w-3 mr-2" />
              Retry Merge
            </button>
          )}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry Merge?</AlertDialogTitle>
            <AlertDialogDescription>
              The previous merge failed. Would you like to try again?
              {error && <span className="block mt-2 text-red-500">{error}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge}>Retry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // No SDV data yet
  if (!hasSdvData) {
    return (
      <Button variant="outline" size="sm" disabled className="text-[11px] h-8 text-muted-foreground">
        <Merge className="h-3 w-3 mr-2" />
        Waiting for SDV Data...
      </Button>
    );
  }

  // Ready to merge
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={(props) => (
          <button
            {...props}
            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all rounded-md bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 text-[11px] h-8 px-3 py-2 gap-1.5"
          >
            <Merge className="h-3 w-3 mr-2" />
            Merge Data
          </button>
        )}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Merge SDV Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will combine your Site Data Entry and SDV Data uploads, calculate all metrics 
            (SDV%, data verified, estimates, etc.), and generate the merged report.
            <br /><br />
            This process may take a few moments for large datasets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMerge}>
            <Merge className="h-4 w-4 mr-2" />
            Start Merge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
