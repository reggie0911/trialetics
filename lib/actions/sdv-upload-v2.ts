'use server';

import { createClient } from '@/lib/server';

// =====================================================
// TYPES
// =====================================================

export interface SDVUploadV2 {
  id: string;
  company_id: string;
  profile_id: string;
  report_id: string;
  file_type: 'site_data_entry' | 'sdv_data';
  file_name: string;
  record_count: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  progress: number;
  processed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  status: SDVUploadV2['status'];
  progress: number;
  processedCount: number;
  totalCount: number;
  errorMessage: string | null;
  recordCount: number;
}

// Site Data Entry record from CSV
export interface SiteDataRecord {
  SiteName: string;
  SubjectId: string;
  EventName: string;
  FormName: string;
  ItemExportLabel: string;
  EditBy?: string;
  EditDateTime?: string;
  EditReason?: string;
  [key: string]: string | undefined;
}

// SDV Data record from CSV
export interface SDVDataRecord {
  SiteName: string;
  SubjectId: string;
  EventName: string;
  FormName: string;
  ItemName: string;
  SdvBy?: string;
  SdvDate?: string;
  [key: string]: string | undefined;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateMergeKey(
  siteName: string,
  subjectId: string,
  eventName: string,
  formName: string,
  itemKey: string
): string {
  return `${siteName}|${subjectId}|${eventName}|${formName}|${itemKey}`;
}

function parseDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

// =====================================================
// CREATE UPLOAD RECORD
// =====================================================

export async function createUploadRecord(
  companyId: string,
  profileId: string,
  reportId: string,
  fileType: 'site_data_entry' | 'sdv_data',
  fileName: string,
  totalCount: number,
  protocolId?: string | null
): Promise<{ data: SDVUploadV2 | null; error: string | null }> {
  const supabase = await createClient();
  
  try {
    const { data: upload, error: createError } = await supabase
      .from('sdv_uploads')
      .insert({
        company_id: companyId,
        profile_id: profileId,
        report_id: reportId,
        file_type: fileType,
        file_name: fileName,
        status: 'processing',
        progress: 0,
        processed_count: 0,
        total_count: totalCount,
        record_count: 0,
        protocol_id: protocolId || null,
      })
      .select()
      .single();
    
    if (createError || !upload) {
      console.error('Error creating upload record:', createError);
      return { data: null, error: createError?.message || 'Failed to create upload record' };
    }
    
    return { data: upload, error: null };
  } catch (error) {
    console.error('Error in createUploadRecord:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// INSERT SITE DATA BATCH
// =====================================================

export async function insertSiteDataBatch(
  uploadId: string,
  companyId: string,
  reportId: string,
  records: SiteDataRecord[]
): Promise<{ success: boolean; insertedCount: number; error: string | null }> {
  const supabase = await createClient();
  
  try {
    // Transform and filter records
    const transformedRecords = records
      .filter(record => {
        const siteName = record.SiteName?.trim();
        const subjectId = record.SubjectId?.trim();
        const eventName = record.EventName?.trim();
        const formName = record.FormName?.trim();
        const itemExportLabel = record.ItemExportLabel?.trim();
        return siteName && subjectId && eventName && formName && itemExportLabel;
      })
      .map(record => {
        const siteName = record.SiteName?.trim() || '';
        const subjectId = record.SubjectId?.trim() || '';
        const eventName = record.EventName?.trim() || '';
        const formName = record.FormName?.trim() || '';
        const itemExportLabel = record.ItemExportLabel?.trim() || '';
        
        return {
          upload_id: uploadId,
          company_id: companyId,
          report_id: reportId,
          site_name: siteName,
          subject_id: subjectId,
          event_name: eventName,
          form_name: formName,
          item_export_label: itemExportLabel,
          merge_key: generateMergeKey(siteName, subjectId, eventName, formName, itemExportLabel),
          edit_by: record.EditBy?.trim() || null,
          edit_date_time: parseDateTime(record.EditDateTime),
          edit_reason: record.EditReason?.trim() || null,
        };
      });
    
    if (transformedRecords.length === 0) {
      return { success: true, insertedCount: 0, error: null };
    }
    
    const { error } = await supabase.from('sdv_site_data').insert(transformedRecords);
    
    if (error) {
      console.error('Error inserting site data batch:', error);
      return { success: false, insertedCount: 0, error: error.message };
    }
    
    return { success: true, insertedCount: transformedRecords.length, error: null };
  } catch (error) {
    console.error('Error in insertSiteDataBatch:', error);
    return { success: false, insertedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// INSERT SDV DATA BATCH
// =====================================================

export async function insertSDVDataBatch(
  uploadId: string,
  companyId: string,
  reportId: string,
  records: SDVDataRecord[]
): Promise<{ success: boolean; insertedCount: number; error: string | null }> {
  const supabase = await createClient();
  
  try {
    // Transform and filter records
    // Note: FormName can be empty for event-level SDV records
    const transformedRecords = records
      .filter(record => {
        const siteName = record.SiteName?.trim();
        const subjectId = record.SubjectId?.trim();
        const eventName = record.EventName?.trim();
        // ItemName is required - use ReviewedItem if ItemName is empty
        const itemName = record.ItemName?.trim() || record.ReviewedItem?.trim();
        return siteName && subjectId && eventName && itemName;
      })
      .map(record => {
        const siteName = record.SiteName?.trim() || '';
        const subjectId = record.SubjectId?.trim() || '';
        const eventName = record.EventName?.trim() || '';
        const formName = record.FormName?.trim() || '';
        // Use ReviewedItem as fallback for ItemName
        const itemName = record.ItemName?.trim() || record.ReviewedItem?.trim() || '';
        
        return {
          upload_id: uploadId,
          company_id: companyId,
          report_id: reportId,
          site_name: siteName,
          subject_id: subjectId,
          event_name: eventName,
          form_name: formName,
          item_name: itemName,
          merge_key: generateMergeKey(siteName, subjectId, eventName, formName, itemName),
          sdv_by: record.SdvBy?.trim() || null,
          sdv_date: parseDateTime(record.SdvDate),
        };
      });
    
    if (transformedRecords.length === 0) {
      return { success: true, insertedCount: 0, error: null };
    }
    
    const { error } = await supabase.from('sdv_sdv_data').insert(transformedRecords);
    
    if (error) {
      console.error('Error inserting SDV data batch:', error);
      return { success: false, insertedCount: 0, error: error.message };
    }
    
    return { success: true, insertedCount: transformedRecords.length, error: null };
  } catch (error) {
    console.error('Error in insertSDVDataBatch:', error);
    return { success: false, insertedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// UPDATE UPLOAD PROGRESS
// =====================================================

export async function updateUploadProgress(
  uploadId: string,
  processedCount: number,
  progress: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('sdv_uploads')
      .update({
        processed_count: processedCount,
        progress: progress,
      })
      .eq('id', uploadId);
    
    if (error) {
      console.error('Error updating upload progress:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in updateUploadProgress:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// COMPLETE UPLOAD
// =====================================================

export async function completeUpload(
  uploadId: string,
  reportId: string,
  fileType: 'site_data_entry' | 'sdv_data',
  recordCount: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  try {
    // Update upload record as completed
    const { error: updateError } = await supabase
      .from('sdv_uploads')
      .update({
        status: 'completed',
        record_count: recordCount,
        progress: 100,
        processed_count: recordCount,
      })
      .eq('id', uploadId);
    
    if (updateError) {
      console.error('Error completing upload:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Link upload to report
    const updateField = fileType === 'site_data_entry' ? 'site_data_upload_id' : 'sdv_data_upload_id';
    const { error: linkError } = await supabase
      .from('sdv_reports')
      .update({ [updateField]: uploadId })
      .eq('id', reportId);
    
    if (linkError) {
      console.error('Error linking upload to report:', linkError);
      // Don't fail the whole operation if linking fails
    }
    
    // Check if both uploads are complete
    const { data: report } = await supabase
      .from('sdv_reports')
      .select('site_data_upload_id, sdv_data_upload_id')
      .eq('id', reportId)
      .single();
    
    if (report?.site_data_upload_id && report?.sdv_data_upload_id) {
      // Both uploads complete - mark report as complete
      // No need to refresh view since we're using a regular view now
      console.log('Both uploads complete, marking report as complete...');
      
      await supabase
        .from('sdv_reports')
        .update({ status: 'complete' })
        .eq('id', reportId);
      
      console.log('Report marked as complete. Data is immediately available.');
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in completeUpload:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// FAIL UPLOAD
// =====================================================

export async function failUpload(
  uploadId: string,
  errorMessage: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('sdv_uploads')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', uploadId);
    
    if (error) {
      console.error('Error marking upload as failed:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in failUpload:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// GET UPLOAD PROGRESS
// =====================================================

export async function getUploadProgress(uploadId: string): Promise<UploadProgress | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sdv_uploads')
    .select('status, progress, processed_count, total_count, error_message, record_count')
    .eq('id', uploadId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching upload progress:', error);
    return null;
  }
  
  return {
    status: data.status,
    progress: data.progress || 0,
    processedCount: data.processed_count || 0,
    totalCount: data.total_count || 0,
    errorMessage: data.error_message,
    recordCount: data.record_count || 0,
  };
}

// =====================================================
// GET UPLOADS FOR REPORT
// =====================================================

export async function getUploadsForReport(reportId: string): Promise<SDVUploadV2[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sdv_uploads')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching uploads for report:', error);
    return [];
  }
  
  return data || [];
}
