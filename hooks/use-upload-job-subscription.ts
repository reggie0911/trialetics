"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface UploadJob {
  id: string;
  company_id: string;
  created_by: string;
  job_type: string;
  upload_id: string | null;
  file_name: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_message: string | null;
  error_details: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseUploadJobSubscriptionOptions {
  companyId: string;
  jobId?: string;
  onStatusChange?: (job: UploadJob) => void;
  onComplete?: (job: UploadJob) => void;
  onError?: (job: UploadJob) => void;
}

export function useUploadJobSubscription({
  companyId,
  jobId,
  onStatusChange,
  onComplete,
  onError,
}: UseUploadJobSubscriptionOptions) {
  const [activeJobs, setActiveJobs] = useState<UploadJob[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch active jobs on mount
  const fetchActiveJobs = useCallback(async () => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("upload_jobs")
      .select("*")
      .eq("company_id", companyId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActiveJobs(data as UploadJob[]);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      try {
        // Fetch initial active jobs
        if (isMounted) {
          await fetchActiveJobs();
        }

        // Check if still mounted before setting up subscription
        if (!isMounted) return;

        // Set up realtime subscription
        const filter = jobId 
          ? `id=eq.${jobId}` 
          : `company_id=eq.${companyId}`;

        channel = supabase
          .channel(`upload-jobs-${companyId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "upload_jobs",
              filter,
            },
            (payload) => {
              if (!isMounted) return;
              
              const job = payload.new as UploadJob;
              
              // Update active jobs list - ensure uniqueness by ID
              setActiveJobs((prev) => {
                if (payload.eventType === "INSERT") {
                  // Check if job already exists (avoid duplicates)
                  if (prev.some((j) => j.id === job.id)) {
                    return prev;
                  }
                  return [job, ...prev];
                } else if (payload.eventType === "UPDATE") {
                  // Remove completed/failed jobs from active list
                  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
                    return prev.filter((j) => j.id !== job.id);
                  }
                  // Update existing job or add if not present
                  const exists = prev.some((j) => j.id === job.id);
                  if (exists) {
                    return prev.map((j) => (j.id === job.id ? job : j));
                  }
                  return [job, ...prev];
                } else if (payload.eventType === "DELETE") {
                  return prev.filter((j) => j.id !== (payload.old as UploadJob).id);
                }
                return prev;
              });

              // Call status change callback
              if (onStatusChange) {
                onStatusChange(job);
              }

              // Call completion callback
              if (job.status === "completed" && onComplete) {
                onComplete(job);
              }

              // Call error callback
              if (job.status === "failed" && onError) {
                onError(job);
              }
            }
          )
          .subscribe((status) => {
            if (isMounted) {
              setIsConnected(status === "SUBSCRIBED");
            }
            
            // Log subscription errors (won't show during normal unmount)
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.error('[Upload Jobs] Subscription error:', status);
            }
          });
      } catch (error) {
        console.error('[Upload Jobs] Setup error:', error);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      
      // Clean up channel if it exists
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          // Silently catch cleanup errors during Fast Refresh
          console.debug('[Upload Jobs] Cleanup error (expected during HMR):', error);
        }
      }
    };
  }, [companyId, jobId, onStatusChange, onComplete, onError, fetchActiveJobs]);

  return {
    activeJobs,
    isConnected,
    refetch: fetchActiveJobs,
  };
}
