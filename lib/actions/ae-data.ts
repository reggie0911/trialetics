'use server';

import { createClient } from '@/lib/server';
import { Tables, TablesInsert } from '@/lib/types/database.types';
import { revalidatePath } from 'next/cache';

// Type for AE Header Mapping (until database types are regenerated)
export type AEHeaderMapping = {
  id: string;
  company_id: string;
  original_header: string;
  customized_header: string;
  table_order: number | null;
  created_at: string;
  updated_at: string;
};

// Types for our responses
export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =====================================================
// AE Header Mappings
// =====================================================

/**
 * Get AE header mappings for a company
 */
export async function getAEHeaderMappings(
  companyId: string
): Promise<ActionResponse<AEHeaderMapping[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ae_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching AE header mappings:', error);
      return { success: false, error: 'Failed to fetch AE header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching AE header mappings' };
  }
}

/**
 * Save AE header mappings for a company (bulk upsert)
 */
export async function saveAEHeaderMappings(
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
      .from('ae_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: Partial<AEHeaderMapping>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('ae_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving AE header mappings:', error);
      return { success: false, error: 'Failed to save AE header mappings' };
    }

    revalidatePath('/protected/ae');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving AE header mappings' };
  }
}

// =====================================================
// AE Uploads
// =====================================================

/**
 * Get AE uploads for a company
 */
export async function getAEUploads(
  companyId: string
): Promise<ActionResponse<Tables<'ae_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ae_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AE uploads:', error);
      return { success: false, error: 'Failed to fetch AE uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching AE uploads' };
  }
}

/**
 * Upload AE data with records and column configs
 */
export async function uploadAEData(
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
    const uploadInsert: TablesInsert<'ae_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      row_count: records.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('ae_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating AE upload:', uploadError);
      return { success: false, error: 'Failed to create AE upload' };
    }

    const uploadId = uploadData.id;

    // 2. Insert AE records in batches (100 per batch)
    const BATCH_SIZE = 100;
    const normalizedFields = ['SiteName', 'SubjectId', 'AEDECOD', 'AESER', 'AEOUT', 'AESERCAT1'];
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const recordInserts: TablesInsert<'ae_records'>[] = batch.map(record => {
        // Extract normalized fields
        const extraFields: Record<string, string | undefined> = {};
        
        Object.entries(record).forEach(([key, value]) => {
          if (!normalizedFields.includes(key)) {
            extraFields[key] = value;
          }
        });

        return {
          upload_id: uploadId,
          site_name: record.SiteName || null,
          subject_id: record.SubjectId || null,
          aedecod: record.AEDECOD || null,
          aeser: record.AESER || null,
          aeout: record.AEOUT || null,
          aesercat1: record.AESERCAT1 || null,
          extra_fields: extraFields,
        };
      });

      const { error: recordsError } = await supabase
        .from('ae_records')
        .insert(recordInserts);

      if (recordsError) {
        console.error('Error inserting AE records:', recordsError);
        // Try to clean up the upload if records failed
        await supabase.from('ae_uploads').delete().eq('id', uploadId);
        return { success: false, error: 'Failed to insert AE records' };
      }
    }

    // 3. Insert column configs
    const configInserts: TablesInsert<'ae_column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: true,
      table_order: config.tableOrder,
    }));

    const { error: configsError } = await supabase
      .from('ae_column_configs')
      .insert(configInserts);

    if (configsError) {
      console.error('Error inserting column configs:', configsError);
      // Try to clean up if configs failed
      await supabase.from('ae_uploads').delete().eq('id', uploadId);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/ae');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading AE data' };
  }
}

/**
 * Delete an AE upload (cascades to records and configs)
 */
export async function deleteAEUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ae_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting AE upload:', error);
      return { success: false, error: 'Failed to delete AE upload' };
    }

    revalidatePath('/protected/ae');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting AE upload' };
  }
}

/**
 * Update filter preferences for an upload
 */
export async function updateAEFilterPreferences(
  uploadId: string,
  filterPreferences: Record<string, any>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ae_uploads')
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
// AE Records
// =====================================================

/**
 * Get AE records for an upload (with pagination)
 */
export async function getAERecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 1000
): Promise<ActionResponse<{ records: Array<Record<string, string | undefined>>; total: number }>> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('ae_records')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    if (countError) {
      console.error('Error counting AE records:', countError);
      return { success: false, error: 'Failed to count AE records' };
    }

    // Get paginated records
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('ae_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(from, to);

    if (error) {
      console.error('Error fetching AE records:', error);
      return { success: false, error: 'Failed to fetch AE records' };
    }

    // Reconstruct full records from normalized + extra_fields
    const records = (data || []).map(record => {
      const fullRecord: Record<string, string | undefined> = {
        SiteName: record.site_name || undefined,
        SubjectId: record.subject_id || undefined,
        AEDECOD: record.aedecod || undefined,
        AESER: record.aeser || undefined,
        AEOUT: record.aeout || undefined,
        AESERCAT1: record.aesercat1 || undefined,
      };

      // Merge extra_fields
      const extraFields = record.extra_fields as Record<string, string | undefined>;
      Object.entries(extraFields).forEach(([key, value]) => {
        fullRecord[key] = value;
      });

      return fullRecord;
    });

    return { success: true, data: { records, total: count || 0 } };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching AE records' };
  }
}

// =====================================================
// AE Column Configs
// =====================================================

/**
 * Get column configs for an upload
 */
export async function getAEColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'ae_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ae_column_configs')
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
export async function updateAEColumnConfigs(
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
      .from('ae_column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert updated configs
    const configInserts: TablesInsert<'ae_column_configs'>[] = configs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: config.visible,
      table_order: config.tableOrder,
    }));

    const { error } = await supabase
      .from('ae_column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configurations' };
    }

    revalidatePath('/protected/ae');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configurations' };
  }
}
