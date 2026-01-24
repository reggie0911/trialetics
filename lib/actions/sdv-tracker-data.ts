'use server';

import { createClient } from '@/lib/server';
import { Tables, TablesInsert } from '@/lib/types/database.types';
import { revalidatePath } from 'next/cache';

// Types for our responses
export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Filter interface for aggregations
export interface SDVFilters {
  siteName?: string;
  subjectId?: string;
  visitType?: string;
  crfName?: string;
  country?: string;
  clinicalMonitor?: string;
}

// Aggregations response interface
export interface SDVAggregations {
  // KPI metrics
  sdvPercent: number;
  estimatedDaysOnsite: number;
  totalSites: number;
  totalSubjects: number;
  formsExpected: number;
  formsEntered: number;
  formsVerified: number;
  needingVerification: number;
  openedQueries: number;
  answeredQueries: number;
  
  // Chart data
  sdvBySite: Array<{ site: string; percent: number; verified: number; entered: number }>;
  sdvByVisit: Array<{ visit: string; percent: number }>;
}

// Site Data Entry record from CSV
export interface SiteDataEntryRecord {
  [key: string]: string | undefined;
}

// SDV Data record from CSV
export interface SDVDataRecord {
  [key: string]: string | undefined;
}

// Generate merge key from subject, event, form, and item (helper function, not a server action)
function generateMergeKey(
  subjectId: string,
  eventName: string,
  formName: string,
  itemId: string
): string {
  return `${subjectId}|${eventName}|${formName}|${itemId}`;
}

// =====================================================
// SDV Header Mappings
// =====================================================

/**
 * Get SDV header mappings for a company
 */
export async function getSDVHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'sdv_header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sdv_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching SDV header mappings:', error);
      return { success: false, error: 'Failed to fetch SDV header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching SDV header mappings' };
  }
}

/**
 * Save SDV header mappings for a company (bulk upsert)
 */
export async function saveSDVHeaderMappings(
  companyId: string,
  mappings: Array<{
    originalHeader: string;
    customizedHeader: string;
    tableOrder: number;
  }>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Delete existing mappings for this company
    await supabase
      .from('sdv_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: TablesInsert<'sdv_header_mappings'>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('sdv_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving SDV header mappings:', error);
      return { success: false, error: 'Failed to save SDV header mappings' };
    }

    revalidatePath('/protected/sdv-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving SDV header mappings' };
  }
}

// =====================================================
// SDV Uploads
// =====================================================

/**
 * Get SDV uploads for a company
 */
export async function getSDVUploads(
  companyId: string
): Promise<ActionResponse<Tables<'sdv_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sdv_uploads')
      .select('*')
      .eq('company_id', companyId)
      .eq('upload_type', 'site_data_entry') // Only return primary uploads
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching SDV uploads:', error);
      return { success: false, error: 'Failed to fetch SDV uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching SDV uploads' };
  }
}

/**
 * Upload Site Data Entry (primary) data
 */
export async function uploadSiteDataEntry(
  companyId: string,
  uploadedBy: string,
  fileName: string,
  records: SiteDataEntryRecord[],
  columnConfigs: Array<{
    columnId: string;
    label: string;
    tableOrder: number;
  }>,
  existingUploadId?: string // Optional: for chunked uploads
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();

    let uploadId: string;

    // If existingUploadId is provided, append to existing upload (chunked upload)
    if (existingUploadId) {
      uploadId = existingUploadId;
      
      // Get current row count
      const { data: currentUpload } = await supabase
        .from('sdv_uploads')
        .select('row_count')
        .eq('id', uploadId)
        .single();

      // Update row count
      const newRowCount = (currentUpload?.row_count || 0) + records.length;
      await supabase
        .from('sdv_uploads')
        .update({ row_count: newRowCount })
        .eq('id', uploadId);
    } else {
      // 1. Create new upload record
      const uploadInsert: TablesInsert<'sdv_uploads'> = {
        company_id: companyId,
        uploaded_by: uploadedBy,
        upload_type: 'site_data_entry',
        file_name: fileName,
        row_count: records.length,
        column_count: columnConfigs.length,
        filter_preferences: {},
      };

      const { data: uploadData, error: uploadError } = await supabase
        .from('sdv_uploads')
        .insert(uploadInsert)
        .select('id')
        .single();

      if (uploadError || !uploadData) {
        console.error('Error creating SDV upload:', uploadError);
        return { success: false, error: 'Failed to create SDV upload' };
      }

      uploadId = uploadData.id;

      // 3. Insert column configs (only for new uploads)
      const configInserts: TablesInsert<'sdv_column_configs'>[] = columnConfigs.map(config => ({
        upload_id: uploadId,
        column_id: config.columnId,
        label: config.label,
        table_order: config.tableOrder,
        visible: true,
      }));

      const { error: configError } = await supabase
        .from('sdv_column_configs')
        .insert(configInserts);

      if (configError) {
        console.error('Error inserting column configs:', configError);
      }
    }

    // 2. Insert SDV records in batches (100 per batch)
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const recordInserts: TablesInsert<'sdv_records'>[] = batch.map(record => {
        // Generate merge key
        const subjectId = record['SubjectId'] || '';
        const eventName = record['EventName'] || '';
        const formName = record['FormName'] || '';
        const itemId = record['ItemId'] || '';
        const mergeKey = generateMergeKey(subjectId, eventName, formName, itemId);
        
        // Calculate data_entered based on EditDateTime
        const editDateTime = record['EditDateTime'] || '';
        const dataEntered = editDateTime.trim() !== '' ? 1 : 0;
        
        return {
          upload_id: uploadId,
          merge_key: mergeKey,
          site_name: record['SiteName'] || null,
          subject_id: subjectId || null,
          event_name: eventName || null,
          form_name: formName || null,
          item_id: itemId || null,
          item_export_label: record['ItemExportLabel'] || null,
          edit_date_time: editDateTime || null,
          edit_by: record['EditBy'] || null,
          data_entered: dataEntered,
          data_verified: 0, // Will be updated when SDV data is uploaded
          extra_fields: {},
        };
      });

      const { error: batchError } = await supabase
        .from('sdv_records')
        .insert(recordInserts);

      if (batchError) {
        console.error('Error inserting SDV records batch:', batchError);
        // Continue with other batches
      }
    }

    revalidatePath('/protected/sdv-tracker');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading Site Data Entry' };
  }
}

/**
 * Upload SDV Data and merge with existing Site Data Entry
 */
export async function uploadSDVData(
  companyId: string,
  uploadedBy: string,
  primaryUploadId: string,
  fileName: string,
  records: SDVDataRecord[]
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();

    // 1. Create upload record for SDV data
    const uploadInsert: TablesInsert<'sdv_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      upload_type: 'sdv_data',
      file_name: fileName,
      row_count: records.length,
      column_count: 8, // Fixed columns for SDV data
      filter_preferences: {},
      primary_upload_id: primaryUploadId,
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('sdv_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating SDV upload:', uploadError);
      return { success: false, error: 'Failed to create SDV upload' };
    }

    // 2. Build a map of merge keys to SDV data
    const sdvMap = new Map<string, { sdvBy: string; sdvDate: string; itemName: string }>();
    
    for (const record of records) {
      const subjectId = record['SubjectId'] || '';
      const eventName = record['EventName'] || '';
      const formName = record['FormName'] || '';
      const itemId = record['ItemId'] || '';
      const mergeKey = generateMergeKey(subjectId, eventName, formName, itemId);
      
      sdvMap.set(mergeKey, {
        sdvBy: record['SdvBy'] || '',
        sdvDate: record['SdvDate'] || '',
        itemName: record['ItemName'] || '',
      });
    }

    // 3. Update existing records with SDV data
    // Fetch all records for the primary upload
    const { data: existingRecords, error: fetchError } = await supabase
      .from('sdv_records')
      .select('id, merge_key')
      .eq('upload_id', primaryUploadId);

    if (fetchError) {
      console.error('Error fetching existing records:', fetchError);
      return { success: false, error: 'Failed to fetch existing records' };
    }

    // Update records in batches
    const BATCH_SIZE = 100;
    const recordsToUpdate = existingRecords || [];
    
    for (let i = 0; i < recordsToUpdate.length; i += BATCH_SIZE) {
      const batch = recordsToUpdate.slice(i, i + BATCH_SIZE);
      
      for (const record of batch) {
        const sdvData = sdvMap.get(record.merge_key);
        if (sdvData) {
          const dataVerified = sdvData.sdvDate.trim() !== '' ? 1 : 0;
          
          await supabase
            .from('sdv_records')
            .update({
              sdv_by: sdvData.sdvBy || null,
              sdv_date: sdvData.sdvDate || null,
              item_name: sdvData.itemName || null,
              data_verified: dataVerified,
            })
            .eq('id', record.id);
        }
      }
    }

    // 4. Generate merged records
    await generateMergedRecords(primaryUploadId, companyId);

    revalidatePath('/protected/sdv-tracker');

    return { success: true, data: uploadData.id };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading SDV Data' };
  }
}

/**
 * Generate merged records from SDV records and eCRF records
 */
async function generateMergedRecords(
  uploadId: string,
  companyId: string
): Promise<void> {
  const supabase = await createClient();

  // 1. Delete existing merged records for this upload
  await supabase
    .from('sdv_merged_records')
    .delete()
    .eq('upload_id', uploadId);

  // 2. Fetch all SDV records for this upload
  const { data: sdvRecords, error: sdvError } = await supabase
    .from('sdv_records')
    .select('*')
    .eq('upload_id', uploadId);

  if (sdvError || !sdvRecords) {
    console.error('Error fetching SDV records:', sdvError);
    return;
  }

  // 3. Fetch eCRF records for query counts
  // First, get the most recent eCRF upload for this company
  const { data: ecrfUploads } = await supabase
    .from('ecrf_uploads')
    .select('id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  let queryMap = new Map<string, { opened: number; answered: number }>();
  
  if (ecrfUploads && ecrfUploads.length > 0) {
    const { data: ecrfRecords } = await supabase
      .from('ecrf_records')
      .select('subject_id, event_name, form_name, query_state')
      .eq('upload_id', ecrfUploads[0].id);

    if (ecrfRecords) {
      for (const record of ecrfRecords) {
        // Generate a partial key (without item_id since eCRF doesn't have it)
        const partialKey = `${record.subject_id}|${record.event_name}|${record.form_name}`;
        
        const existing = queryMap.get(partialKey) || { opened: 0, answered: 0 };
        if (record.query_state === 'Query Raised') {
          existing.opened++;
        } else if (record.query_state === 'Query Resolved') {
          existing.answered++;
        }
        queryMap.set(partialKey, existing);
      }
    }
  }

  // 4. Fetch site numbers from patients table
  const { data: patients } = await supabase
    .from('patients')
    .select('subject_id, extra_fields');

  const siteNumberMap = new Map<string, string>();
  if (patients) {
    for (const patient of patients) {
      const extraFields = patient.extra_fields as Record<string, string> | null;
      if (extraFields && patient.subject_id) {
        const siteNumber = extraFields['E01_V1[1].SCR_05.SE[1].SE_REFID'] || '';
        siteNumberMap.set(patient.subject_id, siteNumber);
      }
    }
  }

  // 5. Aggregate records by site for merged view
  // Group by site_name, subject_id, event_name, form_name
  const aggregatedMap = new Map<string, {
    siteName: string;
    subjectId: string;
    visitType: string;
    crfName: string;
    crfField: string;
    dataVerified: number;
    dataEntered: number;
    dataExpected: number;
    openedQueries: number;
    answeredQueries: number;
  }>();

  for (const record of sdvRecords) {
    const key = `${record.site_name}|${record.subject_id}|${record.event_name}|${record.form_name}`;
    
    const existing = aggregatedMap.get(key) || {
      siteName: record.site_name || '',
      subjectId: record.subject_id || '',
      visitType: record.event_name || '',
      crfName: record.form_name || '',
      crfField: record.item_export_label || '',
      dataVerified: 0,
      dataEntered: 0,
      dataExpected: 0,
      openedQueries: 0,
      answeredQueries: 0,
    };

    existing.dataVerified += record.data_verified || 0;
    existing.dataEntered += record.data_entered || 0;
    existing.dataExpected += (record.data_entered || 0) === 0 ? 1 : 0;

    // Add query counts
    const partialKey = `${record.subject_id}|${record.event_name}|${record.form_name}`;
    const queries = queryMap.get(partialKey);
    if (queries) {
      existing.openedQueries = queries.opened;
      existing.answeredQueries = queries.answered;
    }

    aggregatedMap.set(key, existing);
  }

  // 6. Insert merged records
  const mergedInserts: TablesInsert<'sdv_merged_records'>[] = [];
  
  for (const [key, data] of aggregatedMap) {
    const dataNeedingReview = data.dataEntered - data.dataVerified;
    const sdvPercent = data.dataEntered > 0 
      ? Math.round((data.dataVerified / data.dataEntered) * 100 * 100) / 100 
      : 0;
    const estimateHours = dataNeedingReview / 60;
    const estimateDays = estimateHours / 7;
    
    const siteNumber = siteNumberMap.get(data.subjectId) || '';

    mergedInserts.push({
      upload_id: uploadId,
      merge_key: key,
      site_number: siteNumber,
      site_name: data.siteName,
      subject_id: data.subjectId,
      visit_type: data.visitType,
      crf_name: data.crfName,
      crf_field: data.crfField,
      data_verified: data.dataVerified,
      data_entered: data.dataEntered,
      data_expected: data.dataExpected,
      data_needing_review: dataNeedingReview,
      sdv_percent: sdvPercent,
      opened_queries: data.openedQueries,
      answered_queries: data.answeredQueries,
      estimate_hours: Math.round(estimateHours * 100) / 100,
      estimate_days: Math.round(estimateDays * 100) / 100,
      extra_fields: {},
    });
  }

  // Insert in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < mergedInserts.length; i += BATCH_SIZE) {
    const batch = mergedInserts.slice(i, i + BATCH_SIZE);
    await supabase.from('sdv_merged_records').insert(batch);
  }
}

/**
 * Delete an SDV upload and all associated data
 */
export async function deleteSDVUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('sdv_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting SDV upload:', error);
      return { success: false, error: 'Failed to delete SDV upload' };
    }

    revalidatePath('/protected/sdv-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting SDV upload' };
  }
}

// =====================================================
// SDV Records Queries
// =====================================================

/**
 * Get paginated merged records for display
 * Uses sdv_merged_view for real-time calculations
 */
export async function getSDVMergedRecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 25,
  filters: SDVFilters = {}
): Promise<ActionResponse<{ records: any[]; totalCount: number }>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('sdv_merged_view')
      .select('*', { count: 'exact' })
      .eq('upload_id', uploadId);

    // Apply filters
    if (filters.siteName) {
      query = query.eq('site_name', filters.siteName);
    }
    if (filters.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters.visitType) {
      query = query.eq('visit_type', filters.visitType);
    }
    if (filters.crfName) {
      query = query.eq('crf_name', filters.crfName);
    }

    // Apply pagination
    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    // Order by site name then subject ID
    query = query.order('site_name', { ascending: true })
                 .order('subject_id', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching SDV merged records:', error);
      return { success: false, error: 'Failed to fetch SDV records' };
    }

    return { 
      success: true, 
      data: { 
        records: data || [], 
        totalCount: count || 0 
      } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching SDV records' };
  }
}

/**
 * Get ALL SDV merged records for hierarchical view
 * Bypasses Supabase 1000 record limit by paginating
 */
export async function getAllSDVMergedRecords(
  uploadId: string,
  filters: SDVFilters = {}
): Promise<ActionResponse<{ records: any[]; totalCount: number }>> {
  try {
    const supabase = await createClient();

    let allRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('sdv_merged_view')
        .select('*')
        .eq('upload_id', uploadId)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('site_name', { ascending: true })
        .order('subject_id', { ascending: true });

      // Apply filters
      if (filters.siteName) {
        query = query.eq('site_name', filters.siteName);
      }
      if (filters.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters.visitType) {
        query = query.eq('visit_type', filters.visitType);
      }
      if (filters.crfName) {
        query = query.eq('crf_name', filters.crfName);
      }

      const { data: pageRecords, error } = await query;

      if (error) {
        console.error('Error fetching records for hierarchy:', error);
        return { success: false, error: 'Failed to fetch records for hierarchy' };
      }

      if (!pageRecords || pageRecords.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(pageRecords);
        if (pageRecords.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    return { 
      success: true, 
      data: { 
        records: allRecords, 
        totalCount: allRecords.length 
      } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching SDV records' };
  }
}

/**
 * Get paginated SDV merged records by site names
 * Loads specific sites with all their child data
 */
export async function getSDVRecordsBySites(
  uploadId: string,
  siteNames: string[],
  filters: SDVFilters = {},
  limit: number = 500,  // Only fetch 500 rows initially for fast loading
  offset: number = 0
): Promise<ActionResponse<{ records: any[], hasMore: boolean, totalLoaded: number }>> {
  try {
    const supabase = await createClient();

    if (siteNames.length === 0) {
      return { success: true, data: { records: [], hasMore: false, totalLoaded: 0 } };
    }

    console.log(`[SDV Records] Fetching ${limit} records starting at offset ${offset}`);

    let query = supabase
      .from('sdv_merged_view')
      .select('*')
      .eq('upload_id', uploadId)
      .in('site_name', siteNames)
      .range(offset, offset + limit - 1)
      .order('site_name', { ascending: true })
      .order('subject_id', { ascending: true });

    // Apply additional filters
    if (filters.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters.visitType) {
      query = query.eq('visit_type', filters.visitType);
    }
    if (filters.crfName) {
      query = query.eq('crf_name', filters.crfName);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching records by sites:', error);
      return { success: false, error: 'Failed to fetch records for sites' };
    }

    const fetchedCount = records?.length || 0;
    const hasMore = fetchedCount === limit;
    
    console.log(`[SDV Records] Fetched ${fetchedCount} records, hasMore: ${hasMore}`);

    return { 
      success: true, 
      data: { 
        records: records || [],
        hasMore,
        totalLoaded: offset + fetchedCount
      } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching site records' };
  }
}

/**
 * Get site-level summary for initial tree table load (fast)
 */
export async function getSDVSiteSummary(
  uploadId: string,
  filters: SDVFilters = {}
): Promise<ActionResponse<{ sites: any[] }>> {
  try {
    const supabase = await createClient();

    console.log(`[SDV Site Summary] Fetching site-level summary for upload ${uploadId}`);

    let query = supabase
      .from('sdv_site_summary')
      .select('*')
      .eq('upload_id', uploadId);

    // Apply filters
    if (filters.siteName) {
      query = query.eq('site_name', filters.siteName);
    }

    const { data: sites, error } = await query;

    if (error) {
      console.error('Error fetching site summary:', error);
      return { success: false, error: 'Failed to fetch site summary' };
    }

    console.log(`[SDV Site Summary] Fetched ${sites?.length || 0} sites`);

    return {
      success: true,
      data: { sites: sites || [] }
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching site summary' };
  }
}

/**
 * Get detailed records for a specific site (lazy load on expand)
 */
export async function getSDVSiteDetails(
  uploadId: string,
  siteName: string,
  filters: SDVFilters = {}
): Promise<ActionResponse<{ records: any[] }>> {
  try {
    const supabase = await createClient();

    console.log(`[SDV Site Details] Fetching details for site: ${siteName}`);

    let query = supabase
      .from('sdv_merged_view')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('site_name', siteName)
      .order('subject_id', { ascending: true })
      .order('visit_type', { ascending: true });

    // Apply additional filters
    if (filters.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters.visitType) {
      query = query.eq('visit_type', filters.visitType);
    }
    if (filters.crfName) {
      query = query.eq('crf_name', filters.crfName);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching site details:', error);
      return { success: false, error: 'Failed to fetch site details' };
    }

    console.log(`[SDV Site Details] Fetched ${records?.length || 0} records for ${siteName}`);

    return {
      success: true,
      data: { records: records || [] }
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching site details' };
  }
}

/**
 * Get list of available sites with basic counts
 * For initial page load and pagination
 * Uses aggregation for fast performance
 */
export async function getSDVSitesList(
  uploadId: string,
  filters: SDVFilters = {}
): Promise<ActionResponse<{ sites: Array<{ site_name: string; record_count: number }> }>> {
  try {
    const supabase = await createClient();

    // Use a more efficient query with aggregation
    // This query groups by site_name and counts records per site
    let query = supabase
      .rpc('get_sdv_sites_summary', {
        p_upload_id: uploadId,
        p_site_filter: filters.siteName || null,
        p_subject_filter: filters.subjectId || null,
        p_visit_filter: filters.visitType || null,
        p_crf_filter: filters.crfName || null
      });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sites list:', error);
      
      // Fallback to slower method if RPC doesn't exist
      console.log('Trying fallback method for sites list...');
      
      // Get distinct site names only (much faster than getting all records)
      let fallbackQuery = supabase
        .from('sdv_merged_view')
        .select('site_name', { count: 'exact' })
        .eq('upload_id', uploadId);

      // Apply filters
      if (filters.siteName) {
        fallbackQuery = fallbackQuery.eq('site_name', filters.siteName);
      }
      if (filters.subjectId) {
        fallbackQuery = fallbackQuery.eq('subject_id', filters.subjectId);
      }
      if (filters.visitType) {
        fallbackQuery = fallbackQuery.eq('visit_type', filters.visitType);
      }
      if (filters.crfName) {
        fallbackQuery = fallbackQuery.eq('crf_name', filters.crfName);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return { success: false, error: 'Failed to fetch sites list' };
      }

      // Count records per site from the fallback data
      const siteCounts = new Map<string, number>();
      fallbackData?.forEach(row => {
        const siteName = row.site_name;
        siteCounts.set(siteName, (siteCounts.get(siteName) || 0) + 1);
      });

      const sites = Array.from(siteCounts.entries())
        .map(([site_name, record_count]) => ({ site_name, record_count }))
        .sort((a, b) => a.site_name.localeCompare(b.site_name));

      return { 
        success: true, 
        data: { sites } 
      };
    }

    // Process RPC result
    const sites = (data || [])
      .map((row: any) => ({
        site_name: row.site_name,
        record_count: row.record_count || 0
      }))
      .sort((a: any, b: any) => a.site_name.localeCompare(b.site_name));

    return { 
      success: true, 
      data: { sites } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching sites list' };
  }
}

/**
 * Get filter options for dropdowns
 * Uses sdv_merged_view for real-time data
 */
export async function getSDVFilterOptions(
  uploadId: string
): Promise<ActionResponse<{
  siteNames: string[];
  subjectIds: string[];
  visitTypes: string[];
  crfNames: string[];
}>> {
  try {
    const supabase = await createClient();

    // Use fast database-level aggregation via RPC
    console.log(`[SDV Filter Options] Using fast RPC for upload ${uploadId}`);
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_sdv_filter_options', {
      p_upload_id: uploadId
    });

    if (rpcError) {
      console.error('RPC error for filter options:', rpcError);
      return { success: false, error: 'Failed to fetch filter options' };
    }

    if (!rpcData || rpcData.length === 0) {
      return { 
        success: true, 
        data: { 
          siteNames: [], 
          subjectIds: [], 
          visitTypes: [], 
          crfNames: [] 
        } 
      };
    }

    // Group results by field type
    const siteNames: string[] = [];
    const subjectIds: string[] = [];
    const visitTypes: string[] = [];
    const crfNames: string[] = [];

    for (const row of rpcData) {
      switch (row.field_type) {
        case 'site_name':
          siteNames.push(row.field_value);
          break;
        case 'subject_id':
          subjectIds.push(row.field_value);
          break;
        case 'visit_type':
          visitTypes.push(row.field_value);
          break;
        case 'crf_name':
          crfNames.push(row.field_value);
          break;
      }
    }

    console.log(`[SDV Filter Options] Fast RPC completed: ${siteNames.length} sites, ${subjectIds.length} subjects`);

    return { 
      success: true, 
      data: { 
        siteNames, 
        subjectIds, 
        visitTypes, 
        crfNames 
      } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching filter options' };
  }
}

/**
 * Get SDV aggregations for KPIs and charts
 * Uses sdv_merged_view for real-time calculations
 */
export async function getSDVAggregations(
  uploadId: string,
  filters: SDVFilters = {}
): Promise<ActionResponse<SDVAggregations>> {
  try {
    const supabase = await createClient();

    // Use fast database-level aggregation via RPC
    console.log(`[SDV Aggregations] Using fast RPC for upload ${uploadId}`);
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_sdv_aggregations', {
      p_upload_id: uploadId,
      p_site_filter: filters.siteName || null,
      p_subject_filter: filters.subjectId || null,
      p_visit_filter: filters.visitType || null,
      p_crf_filter: filters.crfName || null
    });

    if (rpcError) {
      console.error('RPC error for aggregations:', rpcError);
      return { success: false, error: 'Failed to fetch aggregations' };
    }

    // RPC returns a single row with all aggregations
    const agg = rpcData?.[0];
    
    if (!agg) {
      return {
        success: true,
        data: {
          sdvPercent: 0,
          estimatedDaysOnsite: 0,
          totalSites: 0,
          totalSubjects: 0,
          formsExpected: 0,
          formsEntered: 0,
          formsVerified: 0,
          needingVerification: 0,
          openedQueries: 0,
          answeredQueries: 0,
          sdvBySite: [],
          sdvByVisit: [],
        }
      };
    }

    console.log(`[SDV Aggregations] Fast RPC completed: ${agg.total_records} records aggregated`);

    // Calculate estimated days onsite from needing verification
    const estimatedDaysOnsite = Math.round((Number(agg.total_needing_verification) / 60) / 7);

    return {
      success: true,
      data: {
        sdvPercent: Number(agg.sdv_percent) || 0,
        estimatedDaysOnsite,
        totalSites: Number(agg.total_sites) || 0,
        totalSubjects: Number(agg.total_subjects) || 0,
        formsExpected: Number(agg.total_forms_expected) + Number(agg.total_forms_entered) || 0,
        formsEntered: Number(agg.total_forms_entered) || 0,
        formsVerified: Number(agg.total_forms_verified) || 0,
        needingVerification: Number(agg.total_needing_verification) || 0,
        openedQueries: 0, // Removed eCRF integration
        answeredQueries: 0, // Removed eCRF integration
        sdvBySite: [], // Simplified - can add separate RPC if needed
        sdvByVisit: [], // Simplified - can add separate RPC if needed
      }
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching SDV aggregations' };
  }
}

/**
 * Update column configurations for an upload
 */
export async function updateSDVColumnConfigs(
  uploadId: string,
  configs: Array<{
    columnId: string;
    label: string;
    visible: boolean;
    tableOrder: number;
  }>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Delete existing configs
    await supabase
      .from('sdv_column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert new configs
    const configInserts: TablesInsert<'sdv_column_configs'>[] = configs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: config.visible,
      table_order: config.tableOrder,
    }));

    const { error } = await supabase
      .from('sdv_column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configs' };
    }

    revalidatePath('/protected/sdv-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configs' };
  }
}

/**
 * Get column configurations for an upload
 */
export async function getSDVColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'sdv_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sdv_column_configs')
      .select('*')
      .eq('upload_id', uploadId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching column configs:', error);
      return { success: false, error: 'Failed to fetch column configs' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching column configs' };
  }
}

/**
 * Regenerate merged records (useful after updates)
 */
export async function regenerateMergedRecords(
  uploadId: string,
  companyId: string
): Promise<ActionResponse<void>> {
  try {
    await generateMergedRecords(uploadId, companyId);
    revalidatePath('/protected/sdv-tracker');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error regenerating merged records' };
  }
}
