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
// Visit Window Alert Calculation
// =====================================================

/**
 * Parse a date string properly, handling timezone issues
 * Supports formats: YYYY-MM-DD, MM/DD/YYYY, DD-MMM-YYYY, etc.
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const str = dateStr.trim();
  
  // Try YYYY-MM-DD format (parse as local time, not UTC)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try MM/DD/YYYY or M/D/YYYY format
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try DD-MMM-YYYY format (e.g., 05-Dec-2023)
  const monthNames: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  const dmmyMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmmyMatch) {
    const [, day, monthStr, year] = dmmyMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(year), month, parseInt(day));
    }
  }
  
  // Fallback: try native parsing but normalize to local midnight
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    // Create a new date using only the date components to avoid timezone issues
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  
  return null;
}

/**
 * Calculate alert status based on visit window logic
 * 
 * Logic:
 * - If Event Date exists (visit occurred): Status based on whether visit was within window
 * - If Event Date is null (visit not yet occurred): Status based on today vs. window dates
 */
function calculateAlertStatus(record: {
  event_status?: string | null;
  event_date?: string | null;
  proposed_date?: string | null;
  window_start_date?: string | null;
  window_end_date?: string | null;
}): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse dates using timezone-safe parser
  const windowStart = parseDate(record.window_start_date);
  const windowEnd = parseDate(record.window_end_date);
  const eventDate = parseDate(record.event_date);

  if (!windowStart || !windowEnd) {
    return 'YELLOW'; // Default if dates are missing
  }

  // ===== SCENARIO 1: Visit has occurred (Event Date exists) =====
  // When a visit has occurred, evaluate based on whether it was within the window
  if (eventDate) {
    // Check if visit was within the window (inclusive of boundary dates)
    // Using getTime() to ensure proper comparison
    const eventTime = eventDate.getTime();
    const windowStartTime = windowStart.getTime();
    const windowEndTime = windowEnd.getTime();
    
    if (eventTime >= windowStartTime && eventTime <= windowEndTime) {
      return 'GREEN';  // Visit completed on time
    } else {
      return 'RED';  // Visit was outside the window (early or late)
    }
  }

  // ===== SCENARIO 2: Visit hasn't occurred (Event Date is null) =====
  // Evaluate based on today's date vs. window dates
  
  const daysUntilOpen = Math.floor((windowStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // GREEN: Window opens ≥8 days from now
  if (daysUntilOpen >= 8) {
    return 'GREEN';
  }

  // RED: Window missed (current date > window close date)
  if (today > windowEnd) {
    return 'RED';
  }

  // RED: Window open AND ≤3 days remaining
  const daysRemaining = Math.floor((windowEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (today >= windowStart && daysRemaining <= 3) {
    return 'RED';
  }

  // YELLOW: Window opens in ≤7 days
  if (daysUntilOpen >= 0 && daysUntilOpen <= 7) {
    return 'YELLOW';
  }

  // YELLOW: Window currently open AND >50% of window duration elapsed
  if (today >= windowStart && today <= windowEnd) {
    const windowDuration = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
    const elapsed = (today.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
    if (elapsed / windowDuration > 0.5) {
      return 'YELLOW';
    }
  }

  // Default to YELLOW for open windows
  return 'YELLOW';
}

// =====================================================
// VW Header Mappings
// =====================================================

/**
 * Get VW header mappings for a company
 */
export async function getVWHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'vw_header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vw_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching VW header mappings:', error);
      return { success: false, error: 'Failed to fetch VW header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching VW header mappings' };
  }
}

/**
 * Save VW header mappings for a company (bulk upsert)
 */
export async function saveVWHeaderMappings(
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
      .from('vw_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: TablesInsert<'vw_header_mappings'>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('vw_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving VW header mappings:', error);
      return { success: false, error: 'Failed to save VW header mappings' };
    }

    revalidatePath('/protected/vw');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving VW header mappings' };
  }
}

// =====================================================
// VW Uploads
// =====================================================

/**
 * Get VW uploads for a company
 */
export async function getVWUploads(
  companyId: string
): Promise<ActionResponse<Tables<'vw_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vw_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VW uploads:', error);
      return { success: false, error: 'Failed to fetch VW uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching VW uploads' };
  }
}

/**
 * Upload VW data with records and column configs
 */
export async function uploadVWData(
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
    const uploadInsert: TablesInsert<'vw_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      row_count: records.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('vw_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating VW upload:', uploadError);
      return { success: false, error: 'Failed to create VW upload' };
    }

    const uploadId = uploadData.id;

    // Get unique subject_id + site_name combinations to fetch patient data
    const subjectSitePairs = new Set<string>();
    records.forEach(record => {
      if (record.SubjectId && record.SiteName) {
        subjectSitePairs.add(`${record.SubjectId}|${record.SiteName}`);
      }
    });

    // Fetch matching patients to get procedure dates and death dates
    const procedureDateMap = new Map<string, string>();
    const deathDateMap = new Map<string, string>();

    if (subjectSitePairs.size > 0) {
      const subjectIds = Array.from(subjectSitePairs).map(pair => pair.split('|')[0]);
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('subject_id, site_name, visits, demographics')
        .in('subject_id', subjectIds);

      if (!patientsError && patients) {
        patients.forEach(patient => {
          const key = `${patient.subject_id}|${patient.site_name}`;
          
          // Extract procedure date from visits JSONB
          const visits = patient.visits as Record<string, any> | null;
          const procedureDate = visits?.['E02_V2[1].PRO_01.PEP[1].PEPDAT'];
          if (procedureDate) {
            procedureDateMap.set(key, procedureDate);
          }

          // Extract death date from demographics JSONB
          const demographics = patient.demographics as Record<string, any> | null;
          const deathDate = demographics?.['death_date'] || demographics?.['DeathDate'];
          if (deathDate) {
            deathDateMap.set(key, deathDate);
          }
        });
      }
    }

    // 2. Insert VW records in batches (100 per batch)
    const BATCH_SIZE = 100;
    const normalizedFields = [
      'SiteName', 'SubjectId', 'EventName', 'EventStatus',
      'ProcedureDate', 'DeathDate', 'EventDate', 'PlannedDate',
      'ProposedDate', 'WindowStartDate', 'WindowEndDate', 'AlertStatus'
    ];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const recordInserts: TablesInsert<'vw_records'>[] = batch.map(record => {
        // Extract normalized fields
        const extraFields: Record<string, string | undefined> = {};

        Object.entries(record).forEach(([key, value]) => {
          if (!normalizedFields.includes(key)) {
            extraFields[key] = value;
          }
        });

        // Get patient data
        const patientKey = `${record.SubjectId}|${record.SiteName}`;
        const procedureDate = procedureDateMap.get(patientKey) || null;
        const deathDate = deathDateMap.get(patientKey) || null;

        // Calculate alert status
        const alertStatus = calculateAlertStatus({
          event_status: record.EventStatus,
          event_date: record.EventDate,
          proposed_date: record.ProposedDate,
          window_start_date: record.WindowStartDate,
          window_end_date: record.WindowEndDate,
        });

        return {
          upload_id: uploadId,
          site_name: record.SiteName || null,
          subject_id: record.SubjectId || null,
          event_name: record.EventName || null,
          event_status: record.EventStatus || null,
          procedure_date: procedureDate,
          death_date: deathDate,
          event_date: record.EventDate || null,
          planned_date: record.PlannedDate || null,
          proposed_date: record.ProposedDate || null,
          window_start_date: record.WindowStartDate || null,
          window_end_date: record.WindowEndDate || null,
          alert_status: alertStatus,
          extra_fields: extraFields,
        };
      });

      const { error: recordsError } = await supabase
        .from('vw_records')
        .insert(recordInserts);

      if (recordsError) {
        console.error('Error inserting VW records:', recordsError);
        // Try to clean up the upload if records failed
        await supabase.from('vw_uploads').delete().eq('id', uploadId);
        return { success: false, error: 'Failed to insert VW records' };
      }
    }

    // 3. Insert column configs
    const configInserts: TablesInsert<'vw_column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: true,
      table_order: config.tableOrder,
    }));

    const { error: configsError } = await supabase
      .from('vw_column_configs')
      .insert(configInserts);

    if (configsError) {
      console.error('Error inserting column configs:', configsError);
      // Try to clean up if configs failed
      await supabase.from('vw_uploads').delete().eq('id', uploadId);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/vw');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading VW data' };
  }
}

/**
 * Delete a VW upload (cascades to records and configs)
 */
export async function deleteVWUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('vw_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting VW upload:', error);
      return { success: false, error: 'Failed to delete VW upload' };
    }

    revalidatePath('/protected/vw');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting VW upload' };
  }
}

/**
 * Update filter preferences for an upload
 */
export async function updateVWFilterPreferences(
  uploadId: string,
  filterPreferences: Record<string, any>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('vw_uploads')
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
// VW Records
// =====================================================

/**
 * Get VW records for an upload (with pagination)
 * Includes patient data (procedure/death dates) and alert status
 */
export async function getVWRecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 1000
): Promise<ActionResponse<{ records: Array<Record<string, string | undefined>>; total: number }>> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('vw_records')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    if (countError) {
      console.error('Error counting VW records:', countError);
      return { success: false, error: 'Failed to count VW records' };
    }

    // Get paginated records
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('vw_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(from, to);

    if (error) {
      console.error('Error fetching VW records:', error);
      return { success: false, error: 'Failed to fetch VW records' };
    }

    // Reconstruct full records from normalized + extra_fields
    const records = (data || []).map(record => {
      const fullRecord: Record<string, string | undefined> = {
        SiteName: record.site_name || undefined,
        SubjectId: record.subject_id || undefined,
        EventName: record.event_name || undefined,
        EventStatus: record.event_status || undefined,
        ProcedureDate: record.procedure_date || undefined,
        DeathDate: record.death_date || undefined,
        EventDate: record.event_date || undefined,
        PlannedDate: record.planned_date || undefined,
        ProposedDate: record.proposed_date || undefined,
        WindowStartDate: record.window_start_date || undefined,
        WindowEndDate: record.window_end_date || undefined,
        AlertStatus: record.alert_status || undefined,
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
    return { success: false, error: 'Unexpected error fetching VW records' };
  }
}

// =====================================================
// VW Column Configs
// =====================================================

/**
 * Get column configs for an upload
 */
export async function getVWColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'vw_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vw_column_configs')
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
export async function updateVWColumnConfigs(
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
      .from('vw_column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert updated configs
    const configInserts: TablesInsert<'vw_column_configs'>[] = configs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: config.visible,
      table_order: config.tableOrder,
    }));

    const { error } = await supabase
      .from('vw_column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configurations' };
    }

    revalidatePath('/protected/vw');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configurations' };
  }
}
