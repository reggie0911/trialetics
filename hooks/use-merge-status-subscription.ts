"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface MergeStatus {
  id: string;
  upload_type: string;
  merge_status: "pending" | "processing" | "completed" | "failed";
  merge_error: string | null;
  merged_at: string | null;
  file_name: string;
  row_count: number;
  created_at: string;
}

interface UseMergeStatusSubscriptionOptions {
  uploadId: string | null;
  onStatusChange?: (status: MergeStatus) => void;
  onComplete?: (status: MergeStatus) => void;
  onError?: (status: MergeStatus) => void;
}

export function useMergeStatusSubscription({
  uploadId,
  onStatusChange,
  onComplete,
  onError,
}: UseMergeStatusSubscriptionOptions) {
  const [mergeStatus, setMergeStatus] = useState<MergeStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch current merge status
  const fetchMergeStatus = useCallback(async () => {
    if (!uploadId) return;

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("sdv_uploads")
      .select("id, upload_type, merge_status, merge_error, merged_at, file_name, row_count, created_at")
      .eq("id", uploadId)
      .single();

    if (!error && data) {
      setMergeStatus(data as MergeStatus);
    }
  }, [uploadId]);

  useEffect(() => {
    if (!uploadId) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      // Fetch initial status
      await fetchMergeStatus();

      // Set up realtime subscription for this specific upload
      channel = supabase
        .channel(`sdv-merge-${uploadId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sdv_uploads",
            filter: `id=eq.${uploadId}`,
          },
          (payload) => {
            const status = payload.new as MergeStatus;
            
            // Update state
            setMergeStatus(status);

            // Call status change callback
            if (onStatusChange) {
              onStatusChange(status);
            }

            // Call completion callback
            if (status.merge_status === "completed" && onComplete) {
              onComplete(status);
            }

            // Call error callback
            if (status.merge_status === "failed" && onError) {
              onError(status);
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [uploadId, onStatusChange, onComplete, onError, fetchMergeStatus]);

  return {
    mergeStatus,
    isConnected,
    refetch: fetchMergeStatus,
  };
}
