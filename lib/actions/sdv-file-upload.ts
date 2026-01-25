'use server';

import { createClient } from '@/lib/server';
import { TablesInsert } from '@/lib/types/database.types';

export type FileUploadResponse = {
  success: boolean;
  jobId?: string;
  filePath?: string;
  error?: string;
};

/**
 * Create upload job and trigger Edge Function processing
 * File should already be uploaded to Supabase Storage by client
 */
export async function createUploadJob(params: {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  companyId: string;
  profileId: string;
  primaryUploadId: string | null;
  skipEdgeFunction?: boolean; // Skip Edge Function invocation (for chunked uploads)
  metadata?: Record<string, any>; // Additional metadata (for chunked uploads)
}): Promise<FileUploadResponse> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { filePath, fileName, fileSize, fileType, companyId, profileId, primaryUploadId, skipEdgeFunction = false, metadata = {} } = params;

    // Get file size for record count estimation
    const estimatedRecords = Math.floor(fileSize / 100); // Rough estimate: 100 bytes per record

    // Merge provided metadata with default metadata
    const jobMetadata = {
      filePath,
      primaryUploadId: primaryUploadId || null,
      ...metadata,
    };

    // Create upload job
    const jobInsert: TablesInsert<'upload_jobs'> = {
      company_id: companyId,
      created_by: profileId,
      job_type: fileType as 'sdv_site_data_entry' | 'sdv_data',
      file_name: fileName,
      status: 'pending',
      progress: 0,
      total_records: estimatedRecords,
      processed_records: 0,
      failed_records: 0,
      metadata: jobMetadata,
    };

    const { data: jobData, error: jobError } = await supabase
      .from('upload_jobs')
      .insert(jobInsert)
      .select('id')
      .single();

    if (jobError || !jobData) {
      console.error('Job creation error:', jobError);
      return { success: false, error: 'Failed to create upload job' };
    }

    const jobId = jobData.id;

    // Skip Edge Function invocation for chunked uploads (will be triggered per chunk)
    if (skipEdgeFunction) {
      return { success: true, jobId, filePath };
    }

    // Trigger Edge Function using Supabase client (handles auth properly)
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke('process-csv-upload', {
      body: {
        jobId,
        filePath,
        fileType,
        companyId,
        profileId,
        primaryUploadId: primaryUploadId || undefined,
      },
    });

    if (invokeError) {
      console.error('Edge function invoke error:', invokeError);
      // Update job status to show error
      await supabase
        .from('upload_jobs')
        .update({
          status: 'failed',
          error_message: `Failed to trigger processing: ${invokeError.message}`,
        })
        .eq('id', jobId);
      return { success: false, error: `Failed to trigger processing: ${invokeError.message}` };
    }

    console.log('Edge function invoked successfully:', invokeData);

    return { success: true, jobId, filePath };
  } catch (error) {
    console.error('Unexpected error creating upload job:', error);
    return { success: false, error: 'Unexpected error creating upload job' };
  }
}

/**
 * Upload a CSV file to Supabase Storage and trigger background processing
 * @deprecated Use createUploadJob instead with client-side upload
 */
export async function uploadCSVFile(
  formData: FormData
): Promise<FileUploadResponse> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get form data
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    const companyId = formData.get('companyId') as string;
    const profileId = formData.get('profileId') as string;
    const primaryUploadId = formData.get('primaryUploadId') as string | null;

    if (!file || !fileType || !companyId || !profileId) {
      return { success: false, error: 'Missing required fields' };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${companyId}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('csv-uploads')
      .upload(filePath, file, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Failed to upload file: ${uploadError.message}` };
    }

    // Get file size for record count estimation
    const fileSize = file.size;
    const estimatedRecords = Math.floor(fileSize / 100); // Rough estimate: 100 bytes per record

    // Create upload job
    const jobInsert: TablesInsert<'upload_jobs'> = {
      company_id: companyId,
      created_by: profileId,
      job_type: fileType as 'sdv_site_data_entry' | 'sdv_data',
      file_name: file.name,
      status: 'pending',
      progress: 0,
      total_records: estimatedRecords,
      processed_records: 0,
      failed_records: 0,
      metadata: {
        filePath,
        primaryUploadId: primaryUploadId || null,
      },
    };

    const { data: jobData, error: jobError } = await supabase
      .from('upload_jobs')
      .insert(jobInsert)
      .select('id')
      .single();

    if (jobError || !jobData) {
      // Clean up uploaded file
      await supabase.storage.from('csv-uploads').remove([filePath]);
      console.error('Job creation error:', jobError);
      return { success: false, error: 'Failed to create upload job' };
    }

    const jobId = jobData.id;

    // Trigger Edge Function using Supabase client (handles auth properly)
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke('process-csv-upload', {
      body: {
        jobId,
        filePath,
        fileType,
        companyId,
        profileId,
        primaryUploadId: primaryUploadId || undefined,
      },
    });

    if (invokeError) {
      console.error('Edge function invoke error:', invokeError);
      // Update job status to show error
      await supabase
        .from('upload_jobs')
        .update({
          status: 'failed',
          error_message: `Failed to trigger processing: ${invokeError.message}`,
        })
        .eq('id', jobId);
      return { success: false, error: `Failed to trigger processing: ${invokeError.message}` };
    }

    console.log('Edge function invoked successfully:', invokeData);

    return { success: true, jobId, filePath };
  } catch (error) {
    console.error('Unexpected error uploading file:', error);
    return { success: false, error: 'Unexpected error uploading file' };
  }
}

/**
 * Get the status of an upload job
 */
export async function getUploadJobStatus(jobId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching job status:', error);
    return { success: false, error: 'Failed to fetch job status' };
  }
}

/**
 * Get upload status including merge readiness
 */
export async function getUploadMergeStatus(siteDataUploadId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sdv_uploads')
      .select('id, upload_type, merge_status, sdv_upload_id, row_count, file_name, created_at')
      .eq('id', siteDataUploadId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Check if SDV data has been uploaded
    const hasSdvData = !!data.sdv_upload_id;
    const canMerge = hasSdvData && data.merge_status === 'pending';

    return { 
      success: true, 
      data: {
        ...data,
        hasSdvData,
        canMerge,
      }
    };
  } catch (error) {
    console.error('Error fetching upload status:', error);
    return { success: false, error: 'Failed to fetch upload status' };
  }
}

/**
 * Trigger the merge process for Site Data Entry and SDV Data
 */
export async function triggerMerge(siteDataUploadId: string, companyId: string) {
  try {
    const supabase = await createClient();

    // Get the user's access token for authenticated request
    const { data: sessionData } = await supabase.auth.getSession();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;
    const accessToken = sessionData.session?.access_token || supabaseAnonKey;

    // Call merge Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/merge-sdv-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        siteDataUploadId,
        companyId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Merge failed' };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error triggering merge:', error);
    return { success: false, error: 'Failed to trigger merge' };
  }
}
