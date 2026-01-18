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

// =====================================================
// MC Header Mappings
// =====================================================

/**
 * Get MC header mappings for a company
 */
export async function getMCHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'mc_header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('mc_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching MC header mappings:', error);
      return { success: false, error: 'Failed to fetch MC header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching MC header mappings' };
  }
}

/**
 * Save MC header mappings for a company (bulk upsert)
 */
export async function saveMCHeaderMappings(
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
      .from('mc_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: TablesInsert<'mc_header_mappings'>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('mc_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving MC header mappings:', error);
      return { success: false, error: 'Failed to save MC header mappings' };
    }

    revalidatePath('/protected/mc');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving MC header mappings' };
  }
}

// =====================================================
// MC Uploads
// =====================================================

/**
 * Get MC uploads for a company
 */
export async function getMCUploads(
  companyId: string
): Promise<ActionResponse<Tables<'mc_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('mc_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching MC uploads:', error);
      return { success: false, error: 'Failed to fetch MC uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching MC uploads' };
  }
}

/**
 * Upload MC data with records and column configs
 */
export async function uploadMCData(
  companyId: string,
  uploadedBy: string,
  fileName: string,
  records: Array<Record<string, string | undefined>>,
  columnConfigs: Array<{
    columnId: string;
    label: string;
    tableOrder: number;
  }>
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();

    // 1. Create upload record
    const uploadInsert: TablesInsert<'mc_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      row_count: records.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('mc_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating MC upload:', uploadError);
      return { success: false, error: 'Failed to create MC upload' };
    }

    const uploadId = uploadData.id;

    // 2. Insert MC records in batches (100 per batch)
    const BATCH_SIZE = 100;
    const normalizedFields = ['SiteName', 'SubjectId', 'EventName', '1.CCMED', '1.CCSTDAT', '1.CCSPDAT'];
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const recordInserts: TablesInsert<'mc_records'>[] = batch.map(record => {
        // Extract normalized fields
        const extraFields: Record<string, string | undefined> = {};
        
        console.log('📤 Upload Debug - Original Record:', record);
        Object.entries(record).forEach(([key, value]) => {
          if (!normalizedFields.includes(key)) {
            extraFields[key] = value;
          }
        });
        console.log('📤 Upload Debug - Extra Fields to Store:', extraFields);

        return {
          upload_id: uploadId,
          site_name: record.SiteName || null,
          subject_id: record.SubjectId || null,
          event_name: record.EventName || null,
          medication_name: record['1.CCMED'] || null,
          start_date: record['1.CCSTDAT'] || null,
          stop_date: record['1.CCSPDAT'] || null,
          extra_fields: extraFields,
        };
      });

      const { error: recordsError } = await supabase
        .from('mc_records')
        .insert(recordInserts);

      if (recordsError) {
        console.error('Error inserting MC records:', recordsError);
        // Try to clean up the upload if records failed
        await supabase.from('mc_uploads').delete().eq('id', uploadId);
        return { success: false, error: 'Failed to insert MC records' };
      }
    }

    // 3. Insert column configs
    const configInserts: TablesInsert<'mc_column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: true,
      table_order: config.tableOrder,
    }));

    const { error: configsError } = await supabase
      .from('mc_column_configs')
      .insert(configInserts);

    if (configsError) {
      console.error('Error inserting column configs:', configsError);
      // Try to clean up if configs failed
      await supabase.from('mc_uploads').delete().eq('id', uploadId);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/mc');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading MC data' };
  }
}

/**
 * Delete an MC upload (cascades to records and configs)
 */
export async function deleteMCUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('mc_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting MC upload:', error);
      return { success: false, error: 'Failed to delete MC upload' };
    }

    revalidatePath('/protected/mc');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting MC upload' };
  }
}

/**
 * Update filter preferences for an upload
 */
export async function updateMCFilterPreferences(
  uploadId: string,
  filterPreferences: Record<string, any>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('mc_uploads')
      .update({ filter_preferences: filterPreferences })
      .eq('id', uploadId);

    if (error) {
      console.error('Error updating filter preferences:', error);
      return { success: false, error: 'Failed to update filter preferences' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating filter preferences' };
  }
}

// =====================================================
// MC Records
// =====================================================

/**
 * Get MC records for an upload (with pagination)
 * Automatically links to patients table to retrieve procedure date
 */
export async function getMCRecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 1000
): Promise<ActionResponse<{ records: Array<Record<string, string | undefined>>; total: number }>> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('mc_records')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    if (countError) {
      console.error('Error counting MC records:', countError);
      return { success: false, error: 'Failed to count MC records' };
    }

    // Get paginated records
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('mc_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(from, to);

    if (error) {
      console.error('Error fetching MC records:', error);
      return { success: false, error: 'Failed to fetch MC records' };
    }

    // Get unique subject_id + site_name combinations to fetch patient data
    const subjectSitePairs = new Set<string>();
    (data || []).forEach(record => {
      if (record.subject_id && record.site_name) {
        subjectSitePairs.add(`${record.subject_id}|${record.site_name}`);
      }
    });

    // Fetch matching patients to get procedure dates
    const procedureDateMap = new Map<string, string>();
    
    if (subjectSitePairs.size > 0) {
      // Get all matching patients
      const subjectIds = Array.from(subjectSitePairs).map(pair => pair.split('|')[0]);
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('subject_id, site_name, visits')
        .in('subject_id', subjectIds);

      if (!patientsError && patients) {
        patients.forEach(patient => {
          const key = `${patient.subject_id}|${patient.site_name}`;
          // Extract procedure date from JSONB visits field
          const visits = patient.visits as Record<string, any>;
          const procedureDate = visits?.['E02_V2[1].PRO_01.PEP[1].PEPDAT'];
          if (procedureDate) {
            procedureDateMap.set(key, procedureDate);
          }
        });
      }
    }

    // Reconstruct full records from normalized + extra_fields + procedure date
    const records = (data || []).map(record => {
      const fullRecord: Record<string, string | undefined> = {
        SiteName: record.site_name || undefined,
        SubjectId: record.subject_id || undefined,
        EventName: record.event_name || undefined,
        '1.CCMED': record.medication_name || undefined,
        '1.CCSTDAT': record.start_date || undefined,
        '1.CCSPDAT': record.stop_date || undefined,
      };

      // Add procedure date from patients table
      const patientKey = `${record.subject_id}|${record.site_name}`;
      const procedureDate = procedureDateMap.get(patientKey);
      if (procedureDate) {
        fullRecord['E02_V2[1].PRO_01.PEP[1].PEPDAT'] = procedureDate;
      }

      // Merge extra_fields
      const extraFields = record.extra_fields as Record<string, string | undefined>;
      console.log('🔍 MC Record Debug - Extra Fields:', extraFields);
      console.log('🔍 MC Record Debug - Full Record Before Merge:', fullRecord);
      Object.entries(extraFields).forEach(([key, value]) => {
        fullRecord[key] = value;
      });
      console.log('🔍 MC Record Debug - Full Record After Merge:', fullRecord);
      console.log('🔍 MC Record Debug - Procedure Date:', procedureDate);

      return fullRecord;
    });

    return { success: true, data: { records, total: count || 0 } };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching MC records' };
  }
}

// =====================================================
// MC Column Configs
// =====================================================

/**
 * Get column configs for an upload
 */
export async function getMCColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'mc_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('mc_column_configs')
      .select('*')
      .eq('upload_id', uploadId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching column configs:', error);
      return { success: false, error: 'Failed to fetch column configurations' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching column configurations' };
  }
}

/**
 * Update column configs (bulk update for visibility, labels, order)
 */
export async function updateMCColumnConfigs(
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

    // Delete existing configs for this upload
    await supabase
      .from('mc_column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert updated configs
    const configInserts: TablesInsert<'mc_column_configs'>[] = configs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: config.visible,
      table_order: config.tableOrder,
    }));

    const { error } = await supabase
      .from('mc_column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configurations' };
    }

    revalidatePath('/protected/mc');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configurations' };
  }
}
