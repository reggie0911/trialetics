'use server';

import { createClient } from '@/lib/server';
import { PatientRecord, ColumnConfig, FilterState } from '@/lib/types/patient-data';
import { Tables, TablesInsert } from '@/lib/types/database.types';
import { revalidatePath } from 'next/cache';

// Types for our responses
export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =====================================================
// Patient Uploads
// =====================================================

/**
 * Create a new patient upload and insert all patient records
 */
export async function uploadPatientData(
  companyId: string,
  fileName: string,
  patientRecords: PatientRecord[],
  columnConfigs: ColumnConfig[]
): Promise<ActionResponse<{ uploadId: string }>> {
  try {
    const supabase = await createClient();
    
    // Get current user profile
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Create the upload record
    const uploadData: TablesInsert<'patient_uploads'> = {
      company_id: companyId,
      uploaded_by: profile.id,
      file_name: fileName,
      row_count: patientRecords.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: upload, error: uploadError } = await supabase
      .from('patient_uploads')
      .insert(uploadData)
      .select()
      .single();

    if (uploadError || !upload) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to create upload record' };
    }

    // Insert patient records in batches (Supabase has limits)
    const batchSize = 100;
    for (let i = 0; i < patientRecords.length; i += batchSize) {
      const batch = patientRecords.slice(i, i + batchSize);
      const patientInserts = batch.map(record => categorizePatientRecord(record, upload.id));
      
      const { error: patientsError } = await supabase
        .from('patients')
        .insert(patientInserts);

      if (patientsError) {
        console.error('Patients insert error:', patientsError);
        // Rollback - delete the upload
        await supabase.from('patient_uploads').delete().eq('id', upload.id);
        return { success: false, error: 'Failed to insert patient records' };
      }
    }

    // Deduplicate column configs by id (keep last occurrence)
    // This prevents "duplicate key value violates unique constraint" error
    const deduplicatedConfigs = Array.from(
      new Map(columnConfigs.map(c => [c.id, c])).values()
    );

    // Insert column configurations
    const columnConfigInserts: TablesInsert<'column_configs'>[] = deduplicatedConfigs.map(config => ({
      upload_id: upload.id,
      column_id: config.id,
      label: config.label,
      original_label: config.originalLabel,
      visible: config.visible,
      data_type: config.dataType,
      category: config.category || null,
      visit_group: config.visitGroup || null,
      table_order: config.tableOrder || null,
    }));

    const { error: configsError } = await supabase
      .from('column_configs')
      .insert(columnConfigInserts);

    if (configsError) {
      console.error('Column configs error:', configsError);
      // Rollback - delete the upload (cascade will handle patients)
      await supabase.from('patient_uploads').delete().eq('id', upload.id);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/patients');
    
    return { 
      success: true, 
      data: { uploadId: upload.id } 
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Unexpected error during upload' };
  }
}

/**
 * Categorize a patient record into normalized fields and JSONB columns
 */
function categorizePatientRecord(record: PatientRecord, uploadId: string): TablesInsert<'patients'> {
  // Extract commonly queried fields
  const subjectId = record.SubjectId || record['Subject ID'] || null;
  const sex = record['E01_V1[1].SCR_01.VS[1].SEX'] || null;
  const age = record['E01_V1[1].SCR_01.VS[1].AGE'] || null;
  const siteName = record.SiteName || record['Site Name'] || null;

  // Categorize remaining fields
  const demographics: Record<string, string> = {};
  const visits: Record<string, string> = {};
  const measurements: Record<string, string> = {};
  const adverseEvents: Record<string, string> = {};
  const extraFields: Record<string, string> = {};

  Object.entries(record).forEach(([key, value]) => {
    // Skip already normalized fields
    if (
      key === 'SubjectId' || 
      key === 'Subject ID' || 
      key === 'SiteName' || 
      key === 'Site Name' ||
      key === 'E01_V1[1].SCR_01.VS[1].SEX' ||
      key === 'E01_V1[1].SCR_01.VS[1].AGE'
    ) {
      return;
    }

    // Categorize by key patterns
    if (key.includes('BMI') || key.includes('BSA')) {
      demographics[key] = value || '';
    } else if (key.includes('DATE') || key.includes('PEPDAT') || key.includes('Visit')) {
      visits[key] = value || '';
    } else if (
      key.includes('LVEF') || 
      key.includes('LVEDV') || 
      key.includes('LVESV') ||
      key.includes('Gradient') || 
      key.includes('TOTDIST') || 
      key.includes('NTPBNP') ||
      key.includes('NYHA') ||
      key.includes('MR Grade') ||
      key.includes('Remodeling')
    ) {
      measurements[key] = value || '';
    } else if (key.includes('AE') || key.includes('AEDECOD') || key.includes('DTHDAT')) {
      adverseEvents[key] = value || '';
    } else {
      extraFields[key] = value || '';
    }
  });

  return {
    upload_id: uploadId,
    subject_id: subjectId,
    sex,
    age,
    site_name: siteName,
    demographics,
    visits,
    measurements,
    adverse_events: adverseEvents,
    extra_fields: extraFields,
  };
}

/**
 * Get all uploads for a company
 */
export async function getPatientUploads(
  companyId: string
): Promise<ActionResponse<Tables<'patient_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('patient_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploads:', error);
      return { success: false, error: 'Failed to fetch uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching uploads' };
  }
}

/**
 * Get patient data for a specific upload with pagination
 */
export async function getPatientData(
  uploadId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<ActionResponse<{ patients: PatientRecord[]; total: number }>> {
  try {
    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    if (countError) {
      console.error('Count error:', countError);
      return { success: false, error: 'Failed to count patients' };
    }

    // Get paginated data
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('upload_id', uploadId)
      .range(from, to);

    if (error) {
      console.error('Data fetch error:', error);
      return { success: false, error: 'Failed to fetch patient data' };
    }

    // Reconstruct PatientRecord objects from database format
    const patientRecords: PatientRecord[] = (data || []).map(patient => reconstructPatientRecord(patient));

    return { 
      success: true, 
      data: { 
        patients: patientRecords, 
        total: count || 0 
      } 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching patient data' };
  }
}

/**
 * Reconstruct a PatientRecord from database format
 */
function reconstructPatientRecord(dbRecord: Tables<'patients'>): PatientRecord {
  const record: PatientRecord = {
    SubjectId: dbRecord.subject_id || '',
    'E01_V1[1].SCR_01.VS[1].SEX': dbRecord.sex || '',
    'E01_V1[1].SCR_01.VS[1].AGE': dbRecord.age || '',
    SiteName: dbRecord.site_name || '',
    BMI: '',
    BSA: '',
    'Hospital ID': '',
    'Company ID': '',
    'E01_V1[1]..DATE': '',
    'E02_V2[1].PRO_01.PEP[1].PEPDAT': '',
    'E03_V3[1]..DATE': '',
    'E04_V4[1]..DATE': '',
    'E04_V41[1]..DATE': '',
    'E05_V5[1]..DATE': '',
    'E06_V6[1]..DATE': '',
    'E01_V1[1].SCR_01.CAM[1].CAM_ACSP': '',
    'E01_V1[1].SCR_02.ECHO[1].LVEFUT': '',
    'E01_V1[1].SCR_02.ECHO[2].LVEFUT': '',
    'E01_V1[1].SCR_02.NYHA[1].NYHAFCCD': '',
    'E01_V1[1].SCR_02.QSRISK[1].STS_QSORRES': '',
    'E01_V1[1].SCR_03.SC[1].NTPBNP_ORRES': '',
    'E01_V1[1].SCR_04._6MWT[1].TOTDIST': '',
    'E01_V1[1].SCR_04._6MWT[2].TOTDIST': '',
    'E01_V1[1].SCR_05.SE[1].MRGRADCD': '',
    'E01_V1[1].SCR_05.SE[1].SE_LVEF': '',
    'E01_V1[1].SCR_05.SE[1].SE_MG': '',
    'E01_V1[1].SCR_05.SE[1].SE_RAMCD': '',
    'E01_V1[1].SCR_05.SE[1].SE_REFID': '',
    'Discharge_Data Locked': '',
    'Discharge_LVEF %_CA': '',
    'Discharge_LVEDV_CA': '',
    'Discharge_LVESV_CA': '',
    'Discharge_Mean Gradiet (mmHg) _CA': '',
    'Discharge_MR Grade_CA': '',
    '30-D_Data Locked': '',
    '30-D_LVEDV_CA': '',
    '30-D_LVEF %_CA': '',
    '30-D_LVESV_CA': '',
    '30-D_Mean Gradient (mmHg)_CA': '',
    ' 30-D_MR Grade_CA': '',
    '3-M_Data Locked': '',
    '3-M_LVEDV_CA': '',
    '3-M_LVEF %_CA': '',
    '3-M_LVESV_CA': '',
    '3-M_Mean Gradient (mmHg)_CA': '',
    '3-M_MR Grade_CA': '',
    '6-M_Data Locked': '',
    '6-M_LVEDV_CA': '',
    '6-M_LVEF %_CA': '',
    '6-M_LVESV_CA': '',
    '6-M_Mean Gradient (mmHg)_CA': '',
    '6-M_MR Grade_CA': '',
    '1Yr_Data Locked': '',
    '1Yr_LVEDV_CA': '',
    '1Yr_LVEF %_CA': '',
    '1Yr_LVESV_CA': '',
    '1Yr_Mean Gradient (mmHg)_CA': '',
    '1Yr_MR Grade_CA': '',
    '1 yr Diastolic Remodeling %': '',
    '1 yr Systolic Remodeling %': '',
    '2Yr_Data Locked': '',
    '2Yr_LVEDV_CA': '',
    '2Yr_LVEF %_CA': '',
    '2Yr_LVESV_CA': '',
    '2Yr_Mean Gradient (mmHg)_CA': '',
    '2Yr_MR Grade_CA': '',
    'COMMON_AE[1].LOG_AE.AE[1].AEDECOD': '',
    'COMMON_AE[1].LOG_AE.AE[1].DTHDAT': '',
    'COMMON_AE[1].LOG_AE.AE[1].PRDAT': '',
    'COMMON_AE[2].LOG_AE.AE[1].AEDECOD': '',
    'COMMON_AE[2].LOG_AE.AE[1].DTHDAT': '',
    Corelab_Field: '',
    'Next Visit': '',
    'Next Visit Window Open': '',
  };

  // Merge in JSONB fields
  if (dbRecord.demographics) {
    Object.assign(record, dbRecord.demographics);
  }
  if (dbRecord.visits) {
    Object.assign(record, dbRecord.visits);
  }
  if (dbRecord.measurements) {
    Object.assign(record, dbRecord.measurements);
  }
  if (dbRecord.adverse_events) {
    Object.assign(record, dbRecord.adverse_events);
  }
  if (dbRecord.extra_fields) {
    Object.assign(record, dbRecord.extra_fields);
  }

  return record;
}

/**
 * Get column configurations for an upload
 */
export async function getColumnConfigs(
  uploadId: string
): Promise<ActionResponse<ColumnConfig[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('column_configs')
      .select('*')
      .eq('upload_id', uploadId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching column configs:', error);
      return { success: false, error: 'Failed to fetch column configurations' };
    }

    const columnConfigs: ColumnConfig[] = (data || []).map(config => ({
      id: config.column_id,
      label: config.label,
      originalLabel: config.original_label,
      visible: config.visible,
      dataType: config.data_type as 'text' | 'number' | 'date' | 'categorical',
      category: config.category as 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other' | undefined,
      visitGroup: config.visit_group || undefined,
      tableOrder: config.table_order || undefined,
    }));

    return { success: true, data: columnConfigs };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching column configs' };
  }
}

/**
 * Update column configurations
 */
export async function updateColumnConfigs(
  uploadId: string,
  columnConfigs: ColumnConfig[]
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Delete existing configs
    await supabase
      .from('column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert new configs
    const configInserts: TablesInsert<'column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.id,
      label: config.label,
      original_label: config.originalLabel,
      visible: config.visible,
      data_type: config.dataType,
      category: config.category || null,
      visit_group: config.visitGroup || null,
      table_order: config.tableOrder || null,
    }));

    const { error } = await supabase
      .from('column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configurations' };
    }

    revalidatePath('/protected/patients');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configs' };
  }
}

/**
 * Delete an upload and all associated data
 */
export async function deletePatientUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('patient_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting upload:', error);
      return { success: false, error: 'Failed to delete upload' };
    }

    revalidatePath('/protected/patients');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting upload' };
  }
}

// =====================================================
// Header Mappings
// =====================================================

/**
 * Get header mappings for a company
 */
export async function getHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching header mappings:', error);
      return { success: false, error: 'Failed to fetch header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching header mappings' };
  }
}

/**
 * Save header mappings for a company (bulk upsert)
 */
export async function saveHeaderMappings(
  companyId: string,
  mappings: Array<{
    originalHeader: string;
    customizedHeader: string;
    visitGroup?: string;
    tableOrder?: number;
  }>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Deduplicate mappings by originalHeader (keep last occurrence)
    // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" error
    const deduplicatedMappings = Array.from(
      new Map(mappings.map(m => [m.originalHeader, m])).values()
    );

    // Upsert mappings - update if exists (based on company_id + original_header), insert if not
    const mappingInserts: TablesInsert<'header_mappings'>[] = deduplicatedMappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      visit_group: mapping.visitGroup || null,
      table_order: mapping.tableOrder || null,
    }));

    const { error } = await supabase
      .from('header_mappings')
      .upsert(mappingInserts, {
        onConflict: 'company_id,original_header',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error saving header mappings:', error);
      return { success: false, error: 'Failed to save header mappings' };
    }

    revalidatePath('/protected/patients');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving header mappings' };
  }
}

/**
 * Update filter preferences for an upload
 */
export async function updateFilterPreferences(
  uploadId: string,
  filters: FilterState
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('patient_uploads')
      .update({ filter_preferences: filters as any })
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

/**
 * Update a patient record
 */
export async function updatePatientRecord(
  uploadId: string,
  subjectId: string,
  updatedData: PatientRecord
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Get the patient record ID
    const { data: patients, error: fetchError } = await supabase
      .from('patients')
      .select('id')
      .eq('upload_id', uploadId)
      .eq('subject_id', subjectId)
      .limit(1);

    if (fetchError || !patients || patients.length === 0) {
      console.error('Error fetching patient:', fetchError);
      return { success: false, error: 'Patient record not found' };
    }

    const patientId = patients[0].id;

    // Categorize the updated data
    const updatedRecord = categorizePatientRecord(updatedData, uploadId);

    // Update the patient record (exclude upload_id since it shouldn't change)
    const { error: updateError } = await supabase
      .from('patients')
      .update({
        subject_id: updatedRecord.subject_id,
        sex: updatedRecord.sex,
        age: updatedRecord.age,
        site_name: updatedRecord.site_name,
        demographics: updatedRecord.demographics,
        visits: updatedRecord.visits,
        measurements: updatedRecord.measurements,
        adverse_events: updatedRecord.adverse_events,
        extra_fields: updatedRecord.extra_fields,
      })
      .eq('id', patientId);

    if (updateError) {
      console.error('Error updating patient:', updateError);
      return { success: false, error: 'Failed to update patient record' };
    }

    revalidatePath('/protected/patients');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating patient record' };
  }
}