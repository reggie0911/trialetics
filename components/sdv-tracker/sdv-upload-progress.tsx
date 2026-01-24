"use client";

import { useState, useRef } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUploadJobSubscription, UploadJob } from "@/hooks/use-upload-job-subscription";
import { cancelUploadJob } from "@/lib/actions/upload-jobs";

interface SDVUploadProgressProps {
  companyId: string;
  onComplete?: (job: UploadJob) => void;
}

export function SDVUploadProgress({ companyId, onComplete }: SDVUploadProgressProps) {
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState<UploadJob[]>([]);
  // Track which jobs we've already shown completion for to prevent duplicates
  const notifiedJobsRef = useRef<Set<string>>(new Set());

  const { activeJobs, isConnected } = useUploadJobSubscription({
    companyId,
    onComplete: (job) => {
      // Prevent duplicate notifications
      if (notifiedJobsRef.current.has(job.id)) {
        return;
      }
      notifiedJobsRef.current.add(job.id);

      // Add to recently completed for display (single card notification)
      setRecentlyCompleted((prev) => {
        // Check if already in the list
        if (prev.some(j => j.id === job.id)) {
          return prev;
        }
        return [job, ...prev.slice(0, 4)];
      });

      // Call parent callback
      if (onComplete) {
        onComplete(job);
      }

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setRecentlyCompleted((prev) => prev.filter((j) => j.id !== job.id));
      }, 8000);
    },
    onError: (job) => {
      // Prevent duplicate notifications
      if (notifiedJobsRef.current.has(job.id)) {
        return;
      }
      notifiedJobsRef.current.add(job.id);

      // Add to recently completed with error status
      setRecentlyCompleted((prev) => {
        if (prev.some(j => j.id === job.id)) {
          return prev;
        }
        return [job, ...prev.slice(0, 4)];
      });

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setRecentlyCompleted((prev) => prev.filter((j) => j.id !== job.id));
      }, 10000);
    },
  });

  // Filter out dismissed jobs and deduplicate by ID
  const visibleActiveJobs = activeJobs
    .filter((job) => !dismissedJobs.has(job.id))
    .filter((job, index, self) => self.findIndex((j) => j.id === job.id) === index);
  const visibleCompletedJobs = recentlyCompleted
    .filter((job) => !dismissedJobs.has(job.id))
    .filter((job, index, self) => self.findIndex((j) => j.id === job.id) === index);

  const handleCancel = async (jobId: string) => {
    const result = await cancelUploadJob(jobId);
    if (result.success) {
      setDismissedJobs((prev) => new Set(prev).add(jobId));
    }
  };

  const handleDismiss = (jobId: string) => {
    setDismissedJobs((prev) => new Set(prev).add(jobId));
  };

  // Don't render if no visible jobs
  if (visibleActiveJobs.length === 0 && visibleCompletedJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {/* Active jobs */}
      {visibleActiveJobs.map((job) => (
        <Card key={job.id} className="p-4 shadow-lg border-l-4 border-l-blue-500 bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <div>
                <p className="text-[12px] font-medium truncate max-w-[200px]">
                  {job.file_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {job.status === "pending" ? "Waiting..." : "Processing..."}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleCancel(job.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="mt-3 space-y-1">
            <Progress value={job.progress} className="h-2" />
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {job.processed_records.toLocaleString()} / {job.total_records.toLocaleString()} records
                </span>
                <span>{job.progress}%</span>
              </div>
              {/* Show chunk progress if job is chunked */}
              {job.metadata && 
               typeof job.metadata.isChunked === 'boolean' && 
               job.metadata.isChunked && 
               typeof job.metadata.totalChunks === 'number' && (
                <div className="text-[10px] text-muted-foreground">
                  Processing chunk {(typeof job.metadata.currentChunk === 'number' ? job.metadata.currentChunk : 0)} of {job.metadata.totalChunks}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Recently completed jobs */}
      {visibleCompletedJobs.map((job) => (
        <Card 
          key={job.id} 
          className={`p-4 shadow-lg border-l-4 bg-white ${
            job.status === "completed" ? "border-l-green-500" : "border-l-red-500"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {job.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <p className="text-[12px] font-medium truncate max-w-[200px]">
                  {job.file_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {job.status === "completed" 
                    ? `${job.processed_records.toLocaleString()} records uploaded${
                        job.metadata?.isChunked && job.metadata?.totalChunks 
                          ? ` (${job.metadata.totalChunks} chunks)` 
                          : ''
                      }`
                    : job.error_message || "Upload failed"
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleDismiss(job.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      ))}

      {/* Connection indicator (dev only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-[9px] text-muted-foreground text-right">
          {isConnected ? "🟢 Connected" : "🔴 Connecting..."}
        </div>
      )}
    </div>
  );
}
