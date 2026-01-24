'use server';

import { createClient } from '@/lib/server';
import { TablesInsert } from '@/lib/types/database.types';
import { revalidatePath } from 'next/cache';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'sdv_site_data_entry' | 'sdv_data' | 'ecrf' | 'ae' | 'patient';

export interface UploadJobResponse {
  success: boolean;
  data?: string; // job ID
  error?: string;
}

export interface UpdateJobProgressParams {
  jobId: string;
  processedRecords: number;
  progress: number;
  status?: JobStatus;
  errorMessage?: string;
}

/**
 * Create a new upload job
 */
export async function createUploadJob(
  companyId: string,
  createdBy: string,
  jobType: JobType,
  fileName: string,
  totalRecords: number,
  metadata?: Record<string, unknown>
): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const jobInsert: TablesInsert<'upload_jobs'> = {
      company_id: companyId,
      created_by: createdBy,
      job_type: jobType,
      file_name: fileName,
      status: 'pending',
      progress: 0,
      total_records: totalRecords,
      processed_records: 0,
      failed_records: 0,
      metadata: (metadata || {}) as Record<string, never>,
    };

    const { data, error } = await supabase
      .from('upload_jobs')
      .insert(jobInsert)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating upload job:', error);
      return { success: false, error: 'Failed to create upload job' };
    }

    return { success: true, data: data.id };
  } catch (error) {
    console.error('Unexpected error creating upload job:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Start processing a job
 */
export async function startUploadJob(
  jobId: string,
  uploadId?: string
): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('upload_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        upload_id: uploadId || null,
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error starting upload job:', error);
      return { success: false, error: 'Failed to start upload job' };
    }

    return { success: true, data: jobId };
  } catch (error) {
    console.error('Unexpected error starting upload job:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Update job progress - this triggers Realtime updates
 */
export async function updateJobProgress({
  jobId,
  processedRecords,
  progress,
  status,
  errorMessage,
}: UpdateJobProgressParams): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      processed_records: processedRecords,
      progress: Math.min(progress, 100),
    };

    if (status) {
      updateData.status = status;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('upload_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job progress:', error);
      return { success: false, error: 'Failed to update job progress' };
    }

    return { success: true, data: jobId };
  } catch (error) {
    console.error('Unexpected error updating job progress:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Complete a job successfully
 */
export async function completeUploadJob(
  jobId: string,
  uploadId: string
): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('upload_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        upload_id: uploadId,
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error completing upload job:', error);
      return { success: false, error: 'Failed to complete upload job' };
    }

    revalidatePath('/protected/sdv-tracker');

    return { success: true, data: jobId };
  } catch (error) {
    console.error('Unexpected error completing upload job:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Fail a job
 */
export async function failUploadJob(
  jobId: string,
  errorMessage: string,
  errorDetails?: Record<string, unknown>
): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('upload_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        error_details: errorDetails || {},
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error failing upload job:', error);
      return { success: false, error: 'Failed to update job status' };
    }

    return { success: true, data: jobId };
  } catch (error) {
    console.error('Unexpected error failing upload job:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Cancel a job
 */
export async function cancelUploadJob(jobId: string): Promise<UploadJobResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('upload_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error cancelling upload job:', error);
      return { success: false, error: 'Failed to cancel job' };
    }

    return { success: true, data: jobId };
  } catch (error) {
    console.error('Unexpected error cancelling upload job:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Get active jobs for a company
 */
export async function getActiveUploadJobs(companyId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active jobs:', error);
      return { success: false, error: 'Failed to fetch active jobs' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching active jobs:', error);
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Get job history for a company
 */
export async function getUploadJobHistory(companyId: string, limit = 20) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching job history:', error);
      return { success: false, error: 'Failed to fetch job history' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching job history:', error);
    return { success: false, error: 'Unexpected error' };
  }
}
