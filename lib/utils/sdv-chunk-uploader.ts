'use client';

import { createClient } from '@/lib/client';
import { createUploadJob } from '@/lib/actions/sdv-file-upload';

const CHUNK_SIZE_THRESHOLD = 10 * 1024 * 1024; // 10MB in bytes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

export interface ChunkUploadResult {
  success: boolean;
  jobId?: string;
  chunkPaths?: string[];
  error?: string;
}

export interface ChunkUploadProgress {
  currentChunk: number;
  totalChunks: number;
  processedChunks: number;
  percentage: number;
  currentChunkPath?: string;
}

/**
 * Upload CSV chunks sequentially to Supabase Storage and process them
 */
export async function uploadChunksToSupabase(
  chunks: string[],
  originalFileName: string,
  companyId: string,
  profileId: string,
  fileType: 'sdv_site_data_entry' | 'sdv_data',
  primaryUploadId: string | null,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  const supabase = createClient();
  const timestamp = Date.now();
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const chunkPaths: string[] = [];
  let jobId: string | null = null;

  try {
    // Create single upload job tracking all chunks (skip Edge Function - will be triggered per chunk)
    const result = await createUploadJob({
      filePath: '', // Will be updated with chunk paths
      fileName: originalFileName,
      fileSize: chunks.reduce((sum, chunk) => sum + new Blob([chunk]).size, 0),
      fileType,
      companyId,
      profileId,
      primaryUploadId,
      skipEdgeFunction: true, // Skip initial Edge Function invocation
      metadata: {
        totalChunks: chunks.length,
        currentChunk: 0,
        chunkFilePaths: [],
        isChunked: true,
      },
    });

    if (!result.success || !result.jobId) {
      return {
        success: false,
        error: result.error || 'Failed to create upload job',
      };
    }

    jobId = result.jobId;

    // Process chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunkNumber = i + 1;
      const chunk = chunks[i];
      const chunkFileName = `${sanitizedFileName}_chunk_${String(chunkNumber).padStart(3, '0')}.csv`;
      const chunkPath = `${companyId}/${timestamp}_${chunkFileName}`;

      // Convert chunk string to Blob
      const chunkBlob = new Blob([chunk], { type: 'text/csv' });

      // Upload chunk with retry logic
      let uploadSuccess = false;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { error: uploadError } = await supabase.storage
            .from('csv-uploads')
            .upload(chunkPath, chunkBlob, {
              contentType: 'text/csv',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          uploadSuccess = true;
          chunkPaths.push(chunkPath);
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown upload error');
          
          if (attempt < MAX_RETRIES) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          }
        }
      }

      if (!uploadSuccess) {
        return {
          success: false,
          error: `Failed to upload chunk ${chunkNumber} after ${MAX_RETRIES} attempts: ${lastError?.message}`,
        };
      }

      // Update job metadata with current chunk path
      const { error: updateError } = await supabase
        .from('upload_jobs')
        .update({
          metadata: {
            totalChunks: chunks.length,
            currentChunk: chunkNumber,
            chunkFilePaths: [...chunkPaths],
            isChunked: true,
          },
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Failed to update job metadata:', updateError);
      }

      // Trigger Edge Function for this chunk
      const { error: invokeError } = await supabase.functions.invoke('process-csv-upload', {
        body: {
          jobId,
          filePath: chunkPath,
          fileType,
          companyId,
          profileId,
          primaryUploadId: primaryUploadId || undefined,
          isChunk: true,
          chunkNumber,
          totalChunks: chunks.length,
        },
      });

      if (invokeError) {
        console.error(`Edge function invoke error for chunk ${chunkNumber}:`, invokeError);
        // Continue with next chunk even if this one fails
        // The Edge Function will handle the error and update job status
      }

      // Update progress
      if (onProgress) {
        onProgress({
          currentChunk: chunkNumber,
          totalChunks: chunks.length,
          processedChunks: chunkNumber,
          percentage: Math.round((chunkNumber / chunks.length) * 100),
          currentChunkPath: chunkPath,
        });
      }

      // Small delay between chunks to avoid overwhelming the system
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      success: true,
      jobId,
      chunkPaths,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during chunk upload',
    };
  }
}

/**
 * Check if a file should be chunked based on size
 */
export function shouldChunkFile(fileSize: number): boolean {
  return fileSize > CHUNK_SIZE_THRESHOLD;
}
