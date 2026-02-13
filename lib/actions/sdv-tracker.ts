'use server';

import { createClient } from '@/lib/server';

// =====================================================
// TYPES
// =====================================================

export interface SDVReport {
  id: string;
  company_id: string;
  profile_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'complete';
  site_data_upload_id: string | null;
  sdv_data_upload_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SDVUpload {
  id: string;
  company_id: string;
  profile_id: string;
  report_id: string | null;
  file_type: 'site_data_entry' | 'sdv_data';
  file_name: string;
  record_count: number;
  status: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  storage_path: string | null;
  progress: number;
  processed_count: number;
  total_count: number;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteDataRecord {
  site_name: string;
  subject_id: string;
  event_name: string;
  form_name: string;
  item_export_label: string;
  edit_by: string | null;
  edit_date_time: string | null;
  edit_reason: string | null;
}

export interface SDVDataRecord {
  site_name: string;
  subject_id: string;
  event_name: string;
  form_name: string;
  item_name: string;
  sdv_by: string | null;
  sdv_date: string | null;
}

export interface SDVAggregations {
  total_items: number;
  verified_items: number;
  data_expected: number;
  sdv_percent: number;
  site_data_only_count: number;
  both_count: number;
  total_sites: number;
  total_subjects: number;
}

export interface SDVSiteSummary {
  site_name: string;
  total_items: number;
  verified_items: number;
  data_expected: number;
  sdv_percent: number;
  total_subjects: number;
  site_data_only_count: number;
  both_count: number;
}

export interface SDVSubjectSummary {
  site_name: string;
  subject_id: string;
  total_items: number;
  verified_items: number;
  data_expected: number;
  sdv_percent: number;
  site_data_only_count: number;
  both_count: number;
}

export interface SDVEventSummary {
  site_name: string;
  subject_id: string;
  event_name: string;
  total_items: number;
  verified_items: number;
  data_expected: number;
  sdv_percent: number;
  site_data_only_count: number;
  both_count: number;
}

export interface SDVFormSummary {
  site_name: string;
  subject_id: string;
  event_name: string;
  form_name: string;
  total_items: number;
  verified_items: number;
  data_expected: number;
  sdv_percent: number;
  site_data_only_count: number;
  both_count: number;
}

export interface SDVItemDetail {
  site_name: string;
  subject_id: string;
  event_name: string;
  form_name: string;
  item_display: string;
  item_export_label: string | null;
  item_name: string | null;
  is_verified: boolean;
  is_initial_entry: boolean;
  data_source: 'site_data_only' | 'both';
  edit_date_time: string | null;
  edit_by: string | null;
  edit_reason: string | null;
  sdv_date: string | null;
  sdv_by: string | null;
}

export interface SDVFilterOptions {
  site_names: string[];
  subject_ids: string[];
  event_names: string[];
  form_names: string[];
  data_sources: string[];
}

// =====================================================
// REPORT MANAGEMENT
// =====================================================

export async function getSDVReports(
  companyId: string,
  protocolId?: string | null
): Promise<SDVReport[]> {
  const supabase = await createClient();

  if (protocolId) {
    // Filter reports by protocol: include reports where site or SDV upload has this protocol_id
    const { data: uploads } = await supabase
      .from('sdv_uploads')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_id', protocolId);
    const uploadIds = (uploads || []).map((u) => u.id);
    if (uploadIds.length === 0) {
      return [];
    }
    const orFilter = [
      `site_data_upload_id.in.(${uploadIds.join(',')})`,
      `sdv_data_upload_id.in.(${uploadIds.join(',')})`,
    ].join(',');
    const { data, error } = await supabase
      .from('sdv_reports')
      .select('*')
      .eq('company_id', companyId)
      .or(orFilter)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching SDV reports:', error);
      return [];
    }
    return data || [];
  }

  const { data, error } = await supabase
    .from('sdv_reports')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching SDV reports:', error);
    return [];
  }

  return data || [];
}

export async function getSDVReport(reportId: string): Promise<SDVReport | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sdv_reports')
    .select('*')
    .eq('id', reportId)
    .single();
  
  if (error) {
    console.error('Error fetching SDV report:', error);
    return null;
  }
  
  return data;
}

export async function createSDVReport(
  companyId: string,
  profileId: string,
  name: string,
  description?: string
): Promise<{ data: SDVReport | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sdv_reports')
    .insert({
      company_id: companyId,
      profile_id: profileId,
      name,
      description: description || null,
      status: 'draft'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating SDV report:', error);
    return { data: null, error: error.message };
  }
  
  return { data, error: null };
}

export async function updateSDVReport(
  reportId: string,
  updates: Partial<Pick<SDVReport, 'name' | 'description' | 'status' | 'site_data_upload_id' | 'sdv_data_upload_id'>>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sdv_reports')
    .update(updates)
    .eq('id', reportId);
  
  if (error) {
    console.error('Error updating SDV report:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

export async function deleteSDVReport(reportId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sdv_reports')
    .delete()
    .eq('id', reportId);
  
  if (error) {
    console.error('Error deleting SDV report:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

// =====================================================
// UPLOAD MANAGEMENT
// =====================================================

export async function getSDVUploads(
  companyId: string,
  protocolId?: string | null
): Promise<SDVUpload[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('sdv_uploads')
    .select('*')
    .eq('company_id', companyId);

  if (protocolId) {
    query = query.eq('protocol_id', protocolId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching SDV uploads:', error);
    return [];
  }
  
  return data || [];
}

export async function createSDVUpload(
  companyId: string,
  profileId: string,
  reportId: string,
  fileType: 'site_data_entry' | 'sdv_data',
  fileName: string
): Promise<{ data: SDVUpload | null; error: string | null }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('sdv_uploads')
    .insert({
      company_id: companyId,
      profile_id: profileId,
      report_id: reportId,
      file_type: fileType,
      file_name: fileName,
      status: 'processing',
      record_count: 0
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating SDV upload:', error);
    return { data: null, error: error.message };
  }
  
  // Update the report with this upload - MUST check for errors
  let updateResult;
  if (fileType === 'site_data_entry') {
    updateResult = await updateSDVReport(reportId, { site_data_upload_id: data.id });
  } else {
    updateResult = await updateSDVReport(reportId, { sdv_data_upload_id: data.id });
  }
  
  if (!updateResult.success) {
    console.error('Error linking upload to report:', updateResult.error);
    // Still return the upload data, but log the linking error
    // The upload was created, but report link failed
  }
  
  return { data, error: null };
}

export async function completeSDVUpload(
  uploadId: string,
  recordCount: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sdv_uploads')
    .update({
      status: 'completed',
      record_count: recordCount
    })
    .eq('id', uploadId);
  
  if (error) {
    console.error('Error completing SDV upload:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

export async function failSDVUpload(
  uploadId: string,
  errorMessage: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sdv_uploads')
    .update({
      status: 'failed',
      error_message: errorMessage
    })
    .eq('id', uploadId);
  
  if (error) {
    console.error('Error failing SDV upload:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

export async function deleteSDVUpload(uploadId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('sdv_uploads')
    .delete()
    .eq('id', uploadId);
  
  if (error) {
    console.error('Error deleting SDV upload:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

// =====================================================
// DATA INSERTION
// =====================================================

// Note: insertSiteDataRecords and insertSDVDataRecords have been moved to Edge Function
// See supabase/functions/process-sdv-csv/index.ts

// =====================================================
// REFRESH MATERIALIZED VIEW
// =====================================================

export async function refreshSDVMergedView(): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc('refresh_sdv_merged_view');
  
  if (error) {
    console.error('Error refreshing SDV merged view:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, error: null };
}

// =====================================================
// COMPLETE REPORT (after both uploads)
// =====================================================

export async function completeSDVReportUpload(
  reportId: string
): Promise<{ success: boolean; error: string | null }> {
  // Refresh the materialized view
  const refreshResult = await refreshSDVMergedView();
  if (!refreshResult.success) {
    console.error('Failed to refresh materialized view:', refreshResult.error);
    // Continue anyway - we should still try to mark complete
  }
  
  // Mark report as complete
  const updateResult = await updateSDVReport(reportId, { status: 'complete' });
  if (!updateResult.success) {
    console.error('Failed to update report status:', updateResult.error);
  }
  
  return updateResult;
}

// =====================================================
// FIX STUCK REPORT (find and link orphaned uploads)
// =====================================================

export async function fixStuckReport(
  reportId: string
): Promise<{ success: boolean; error: string | null; message?: string }> {
  const supabase = await createClient();
  
  try {
    // 1. Get the report
    const { data: report, error: reportError } = await supabase
      .from('sdv_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (reportError || !report) {
      return { success: false, error: reportError?.message || 'Report not found' };
    }
    
    // 2. Find uploads for this report
    const { data: uploads, error: uploadsError } = await supabase
      .from('sdv_uploads')
      .select('*')
      .eq('report_id', reportId);
    
    if (uploadsError) {
      return { success: false, error: uploadsError.message };
    }
    
    // 3. Link uploads to report if not already linked
    const siteDataUpload = uploads?.find(u => u.file_type === 'site_data_entry' && u.status === 'completed');
    const sdvDataUpload = uploads?.find(u => u.file_type === 'sdv_data' && u.status === 'completed');
    
    const updates: Record<string, unknown> = {};
    
    if (siteDataUpload && !report.site_data_upload_id) {
      updates.site_data_upload_id = siteDataUpload.id;
    }
    
    if (sdvDataUpload && !report.sdv_data_upload_id) {
      updates.sdv_data_upload_id = sdvDataUpload.id;
    }
    
    // 4. Check if we have data in the tables
    const { count: siteCount } = await supabase
      .from('sdv_site_data')
      .select('*', { count: 'exact', head: true })
      .eq('report_id', reportId);
    
    const { count: sdvCount } = await supabase
      .from('sdv_sdv_data')
      .select('*', { count: 'exact', head: true })
      .eq('report_id', reportId);
    
    console.log(`Report ${reportId}: Site Data records: ${siteCount}, SDV Data records: ${sdvCount}`);
    
    // 5. Update report with linked uploads
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('sdv_reports')
        .update(updates)
        .eq('id', reportId);
      
      if (updateError) {
        console.error('Failed to link uploads:', updateError);
      }
    }
    
    // 6. If both data types exist, mark as complete
    if ((siteCount && siteCount > 0) && (sdvCount && sdvCount > 0)) {
      // Refresh materialized view
      const { error: refreshError } = await supabase.rpc('refresh_sdv_merged_view');
      if (refreshError) {
        console.error('Failed to refresh view:', refreshError);
        // Continue anyway
      }
      
      // Mark as complete
      const { error: completeError } = await supabase
        .from('sdv_reports')
        .update({ 
          status: 'complete',
          site_data_upload_id: siteDataUpload?.id || report.site_data_upload_id,
          sdv_data_upload_id: sdvDataUpload?.id || report.sdv_data_upload_id
        })
        .eq('id', reportId);
      
      if (completeError) {
        return { success: false, error: completeError.message };
      }
      
      return { 
        success: true, 
        error: null, 
        message: `Report fixed! Found ${siteCount} site records and ${sdvCount} SDV records.` 
      };
    } else {
      return { 
        success: false, 
        error: `Missing data: Site records: ${siteCount || 0}, SDV records: ${sdvCount || 0}`,
        message: 'Report needs both Site Data and SDV Data uploads.'
      };
    }
  } catch (err) {
    console.error('Error fixing stuck report:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// =====================================================
// AGGREGATIONS (KPI Metrics) - By Report
// =====================================================

export async function getSDVAggregations(
  reportId: string,
  filters?: {
    siteFilter?: string;
    subjectFilter?: string;
    eventFilter?: string;
    formFilter?: string;
    sourceFilter?: string;
  }
): Promise<SDVAggregations | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_aggregations', {
    p_report_id: reportId,
    p_site_filter: filters?.siteFilter || null,
    p_subject_filter: filters?.subjectFilter || null,
    p_event_filter: filters?.eventFilter || null,
    p_form_filter: filters?.formFilter || null,
    p_source_filter: filters?.sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV aggregations:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    return {
      total_items: 0,
      verified_items: 0,
      data_expected: 0,
      sdv_percent: 0,
      site_data_only_count: 0,
      both_count: 0,
      total_sites: 0,
      total_subjects: 0
    };
  }
  
  return data[0];
}

// =====================================================
// HIERARCHICAL DATA FETCHING - By Report
// =====================================================

export async function getSDVSiteSummary(
  reportId: string,
  sourceFilter?: string
): Promise<SDVSiteSummary[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_site_summary', {
    p_report_id: reportId,
    p_source_filter: sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV site summary:', error);
    return [];
  }
  
  return data || [];
}

export async function getSDVSubjectSummary(
  reportId: string,
  siteName: string,
  sourceFilter?: string
): Promise<SDVSubjectSummary[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_subject_summary', {
    p_report_id: reportId,
    p_site_name: siteName,
    p_source_filter: sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV subject summary:', error);
    return [];
  }
  
  return data || [];
}

export async function getSDVEventSummary(
  reportId: string,
  siteName: string,
  subjectId: string,
  sourceFilter?: string
): Promise<SDVEventSummary[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_event_summary', {
    p_report_id: reportId,
    p_site_name: siteName,
    p_subject_id: subjectId,
    p_source_filter: sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV event summary:', error);
    return [];
  }
  
  return data || [];
}

export async function getSDVFormSummary(
  reportId: string,
  siteName: string,
  subjectId: string,
  eventName: string,
  sourceFilter?: string
): Promise<SDVFormSummary[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_form_summary', {
    p_report_id: reportId,
    p_site_name: siteName,
    p_subject_id: subjectId,
    p_event_name: eventName,
    p_source_filter: sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV form summary:', error);
    return [];
  }
  
  return data || [];
}

export async function getSDVItemDetails(
  reportId: string,
  siteName: string,
  subjectId: string,
  eventName: string,
  formName: string,
  sourceFilter?: string
): Promise<SDVItemDetail[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_item_details', {
    p_report_id: reportId,
    p_site_name: siteName,
    p_subject_id: subjectId,
    p_event_name: eventName,
    p_form_name: formName,
    p_source_filter: sourceFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV item details:', error);
    return [];
  }
  
  return data || [];
}

// =====================================================
// FILTER OPTIONS - By Report
// =====================================================

export async function getSDVFilterOptions(reportId: string): Promise<SDVFilterOptions> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_filter_options', {
    p_report_id: reportId
  });
  
  if (error) {
    console.error('Error fetching SDV filter options:', error);
    return {
      site_names: [],
      subject_ids: [],
      event_names: [],
      form_names: [],
      data_sources: ['site_data_only', 'both']
    };
  }
  
  if (!data || data.length === 0) {
    return {
      site_names: [],
      subject_ids: [],
      event_names: [],
      form_names: [],
      data_sources: ['site_data_only', 'both']
    };
  }
  
  return {
    site_names: data[0].site_names || [],
    subject_ids: data[0].subject_ids || [],
    event_names: data[0].event_names || [],
    form_names: data[0].form_names || [],
    data_sources: data[0].data_sources || ['site_data_only', 'both']
  };
}

export async function getSDVCascadingFilterOptions(
  reportId: string,
  siteFilter?: string,
  subjectFilter?: string,
  eventFilter?: string
): Promise<{ subject_ids: string[]; event_names: string[]; form_names: string[] }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_sdv_cascading_filter_options', {
    p_report_id: reportId,
    p_site_filter: siteFilter || null,
    p_subject_filter: subjectFilter || null,
    p_event_filter: eventFilter || null
  });
  
  if (error) {
    console.error('Error fetching SDV cascading filter options:', error);
    return { subject_ids: [], event_names: [], form_names: [] };
  }
  
  if (!data || data.length === 0) {
    return { subject_ids: [], event_names: [], form_names: [] };
  }
  
  return {
    subject_ids: data[0].subject_ids || [],
    event_names: data[0].event_names || [],
    form_names: data[0].form_names || []
  };
}
