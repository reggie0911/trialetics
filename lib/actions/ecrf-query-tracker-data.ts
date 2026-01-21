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
export interface ECRFFilters {
  siteName?: string;
  subjectId?: string;
  eventName?: string;
  formName?: string;
  queryType?: string;
  queryState?: string;
  userRole?: string;
  queryRaisedByRole?: string;
}

// Aggregations response interface
export interface ECRFAggregations {
  // KPI metrics
  totalQueries: number;
  uniqueSubjects: number;
  uniqueVisits: number;
  openQueries: number;
  closedQueries: number;
  resolvedQueries: number;
  overdue: number;
  missingDataCount: number;
  avgResolutionTime: number;
  queriesPerSubject: string;
  queriesPerVisit: string;
  
  // Chart distributions
  agingDistribution: Array<{ label: string; count: number; color: string }>;
  queriesByRole: Array<{ role: string; count: number }>;
  queriesBySite: Array<{ site: string; count: number }>;
  queriesByType: Array<{ type: string; count: number }>;
  queriesByState: Array<{ state: string; count: number; fill: string }>;
  queriesByForm: Array<{ form: string; count: number }>;
  resolutionTimeBySite: Array<{ site: string; avgDays: number }>;
}

// =====================================================
// eCRF Header Mappings
// =====================================================

/**
 * Get eCRF header mappings for a company
 */
export async function getECRFHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'ecrf_header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ecrf_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching eCRF header mappings:', error);
      return { success: false, error: 'Failed to fetch eCRF header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching eCRF header mappings' };
  }
}

/**
 * Save eCRF header mappings for a company (bulk upsert)
 */
export async function saveECRFHeaderMappings(
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
      .from('ecrf_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: TablesInsert<'ecrf_header_mappings'>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('ecrf_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving eCRF header mappings:', error);
      return { success: false, error: 'Failed to save eCRF header mappings' };
    }

    revalidatePath('/protected/ecrf-query-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving eCRF header mappings' };
  }
}

// =====================================================
// eCRF Uploads
// =====================================================

/**
 * Get eCRF uploads for a company
 */
export async function getECRFUploads(
  companyId: string
): Promise<ActionResponse<Tables<'ecrf_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ecrf_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching eCRF uploads:', error);
      return { success: false, error: 'Failed to fetch eCRF uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching eCRF uploads' };
  }
}

/**
 * Upload eCRF data with records and column configs
 */
export async function uploadECRFData(
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
    const uploadInsert: TablesInsert<'ecrf_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      row_count: records.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('ecrf_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating eCRF upload:', uploadError);
      return { success: false, error: 'Failed to create eCRF upload' };
    }

    const uploadId = uploadData.id;

    // 2. Insert eCRF records in batches (100 per batch)
    const BATCH_SIZE = 100;
    const normalizedFields = [
      'SiteName',
      'SubjectId',
      'EventName',
      'EventDate',
      'FormName',
      'QueryType',
      'QueryText',
      'QueryState',
      'QueryResolution',
      'UserName',
      'DateTime',
      'UserRole',
      'QueryRaisedByRole'
    ];
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const recordInserts: TablesInsert<'ecrf_records'>[] = batch.map(record => {
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
          event_name: record.EventName || null,
          event_date: record.EventDate || null,
          form_name: record.FormName || null,
          query_type: record.QueryType || null,
          query_text: record.QueryText || null,
          query_state: record.QueryState || null,
          query_resolution: record.QueryResolution || null,
          user_name: record.UserName || null,
          date_time: record.DateTime || null,
          user_role: record.UserRole || null,
          query_raised_by_role: record.QueryRaisedByRole || null,
          extra_fields: extraFields,
        };
      });

      const { error: recordsError } = await supabase
        .from('ecrf_records')
        .insert(recordInserts);

      if (recordsError) {
        console.error('Error inserting eCRF records:', recordsError);
        // Try to clean up the upload if records failed
        await supabase.from('ecrf_uploads').delete().eq('id', uploadId);
        return { success: false, error: 'Failed to insert eCRF records' };
      }
    }

    // 3. Insert column configs
    const configInserts: TablesInsert<'ecrf_column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: true,
      table_order: config.tableOrder,
    }));

    const { error: configsError } = await supabase
      .from('ecrf_column_configs')
      .insert(configInserts);

    if (configsError) {
      console.error('Error inserting column configs:', configsError);
      // Try to clean up if configs failed
      await supabase.from('ecrf_uploads').delete().eq('id', uploadId);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/ecrf-query-tracker');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading eCRF data' };
  }
}

/**
 * Delete an eCRF upload (cascades to records and configs)
 */
export async function deleteECRFUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ecrf_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting eCRF upload:', error);
      return { success: false, error: 'Failed to delete eCRF upload' };
    }

    revalidatePath('/protected/ecrf-query-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting eCRF upload' };
  }
}

/**
 * Update filter preferences for an upload
 */
export async function updateECRFFilterPreferences(
  uploadId: string,
  filterPreferences: Record<string, any>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ecrf_uploads')
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
// eCRF Records
// =====================================================

/**
 * Get eCRF records for an upload (with pagination and filters)
 */
export async function getECRFRecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 1000,
  filters: ECRFFilters = {}
): Promise<ActionResponse<{ records: Array<Record<string, string | undefined>>; total: number }>> {
  try {
    const supabase = await createClient();

    // Build count query with filters
    let countQuery = supabase
      .from('ecrf_records')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    // Apply filters to count query
    if (filters.siteName) {
      countQuery = countQuery.eq('site_name', filters.siteName);
    }
    if (filters.subjectId) {
      countQuery = countQuery.ilike('subject_id', `%${filters.subjectId}%`);
    }
    if (filters.eventName) {
      countQuery = countQuery.ilike('event_name', `%${filters.eventName}%`);
    }
    if (filters.formName) {
      countQuery = countQuery.eq('form_name', filters.formName);
    }
    if (filters.queryType) {
      countQuery = countQuery.eq('query_type', filters.queryType);
    }
    if (filters.queryState) {
      countQuery = countQuery.eq('query_state', filters.queryState);
    }
    if (filters.userRole) {
      countQuery = countQuery.ilike('user_role', `%${filters.userRole}%`);
    }
    if (filters.queryRaisedByRole) {
      countQuery = countQuery.eq('query_raised_by_role', filters.queryRaisedByRole);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting eCRF records:', countError);
      return { success: false, error: 'Failed to count eCRF records' };
    }

    // Calculate pagination offset
    const offset = (page - 1) * pageSize;

    // Build records query with filters and pagination
    let recordsQuery = supabase
      .from('ecrf_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(offset, offset + pageSize - 1);

    // Apply same filters to records query
    if (filters.siteName) {
      recordsQuery = recordsQuery.eq('site_name', filters.siteName);
    }
    if (filters.subjectId) {
      recordsQuery = recordsQuery.ilike('subject_id', `%${filters.subjectId}%`);
    }
    if (filters.eventName) {
      recordsQuery = recordsQuery.ilike('event_name', `%${filters.eventName}%`);
    }
    if (filters.formName) {
      recordsQuery = recordsQuery.eq('form_name', filters.formName);
    }
    if (filters.queryType) {
      recordsQuery = recordsQuery.eq('query_type', filters.queryType);
    }
    if (filters.queryState) {
      recordsQuery = recordsQuery.eq('query_state', filters.queryState);
    }
    if (filters.userRole) {
      recordsQuery = recordsQuery.ilike('user_role', `%${filters.userRole}%`);
    }
    if (filters.queryRaisedByRole) {
      recordsQuery = recordsQuery.eq('query_raised_by_role', filters.queryRaisedByRole);
    }

    const { data, error } = await recordsQuery;

    if (error) {
      console.error('Error fetching eCRF records:', error);
      return { success: false, error: 'Failed to fetch eCRF records' };
    }

    // Reconstruct full records from normalized + extra_fields
    const records = (data || []).map(record => {
      const fullRecord: Record<string, string | undefined> = {
        SiteName: record.site_name || undefined,
        SubjectId: record.subject_id || undefined,
        EventName: record.event_name || undefined,
        EventDate: record.event_date || undefined,
        FormName: record.form_name || undefined,
        QueryType: record.query_type || undefined,
        QueryText: record.query_text || undefined,
        QueryState: record.query_state || undefined,
        QueryResolution: record.query_resolution || undefined,
        UserName: record.user_name || undefined,
        DateTime: record.date_time || undefined,
        UserRole: record.user_role || undefined,
        QueryRaisedByRole: record.query_raised_by_role || undefined,
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
    return { success: false, error: 'Unexpected error fetching eCRF records' };
  }
}

// =====================================================
// eCRF Column Configs
// =====================================================

/**
 * Get column configs for an upload
 */
export async function getECRFColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'ecrf_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ecrf_column_configs')
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
export async function updateECRFColumnConfigs(
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
      .from('ecrf_column_configs')
      .delete()
      .eq('upload_id', uploadId);

    // Insert updated configs
    const configInserts: TablesInsert<'ecrf_column_configs'>[] = configs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: config.visible,
      table_order: config.tableOrder,
    }));

    const { error } = await supabase
      .from('ecrf_column_configs')
      .insert(configInserts);

    if (error) {
      console.error('Error updating column configs:', error);
      return { success: false, error: 'Failed to update column configurations' };
    }

    revalidatePath('/protected/ecrf-query-tracker');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating column configurations' };
  }
}

// =====================================================
// eCRF Aggregations & Filter Options
// =====================================================

// Chart colors
const CHART_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#14b8a6", // Teal
];

/**
 * Get aggregated KPI metrics and chart data for an upload with filters
 */
export async function getECRFAggregations(
  uploadId: string,
  filters: ECRFFilters = {}
): Promise<ActionResponse<ECRFAggregations>> {
  try {
    const supabase = await createClient();

    // Build query with filters - fetch all records using pagination
    // Supabase has a hard limit of 1000 per query, so we need to paginate
    // NOTE: If changes don't appear, restart Next.js dev server and hard refresh browser
    
    let allRecords: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('ecrf_records')
        .select('*')
        .eq('upload_id', uploadId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters using ilike for case-insensitive partial matching
      if (filters.siteName) {
        query = query.ilike('site_name', `%${filters.siteName}%`);
      }
      if (filters.subjectId) {
        query = query.ilike('subject_id', `%${filters.subjectId}%`);
      }
      if (filters.eventName) {
        query = query.ilike('event_name', `%${filters.eventName}%`);
      }
      if (filters.formName) {
        query = query.ilike('form_name', `%${filters.formName}%`);
      }
      if (filters.queryType) {
        query = query.ilike('query_type', `%${filters.queryType}%`);
      }
      if (filters.queryState) {
        query = query.ilike('query_state', `%${filters.queryState}%`);
      }
      if (filters.userRole) {
        query = query.ilike('user_role', `%${filters.userRole}%`);
      }
      if (filters.queryRaisedByRole) {
        query = query.ilike('query_raised_by_role', `%${filters.queryRaisedByRole}%`);
      }

      const { data: pageRecords, error } = await query;

      if (error) {
        console.error('Error fetching records for aggregation:', error);
        return { success: false, error: 'Failed to fetch records for aggregation' };
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

    const records = allRecords;
    console.log(`[ECRF Aggregations] Fetched ${records?.length || 0} records for upload ${uploadId}`);

    if (!records || records.length === 0) {
      // Return empty aggregations
      return {
        success: true,
        data: {
          totalQueries: 0,
          uniqueSubjects: 0,
          uniqueVisits: 0,
          openQueries: 0,
          closedQueries: 0,
          resolvedQueries: 0,
          overdue: 0,
          missingDataCount: 0,
          avgResolutionTime: 0,
          queriesPerSubject: "0",
          queriesPerVisit: "0",
          agingDistribution: [],
          queriesByRole: [],
          queriesBySite: [],
          queriesByType: [],
          queriesByState: [],
          queriesByForm: [],
          resolutionTimeBySite: [],
        },
      };
    }

    // Helper functions for exact state/type matching
    const isOpenQuery = (state: string | null | undefined): boolean => {
      return state === 'Query Raised';
    };

    const isClosedQuery = (state: string | null | undefined): boolean => {
      return state === 'Query Closed';
    };

    const isResolvedQuery = (state: string | null | undefined): boolean => {
      return state === 'Query Resolved';
    };

    const isMissingDataType = (type: string | null | undefined): boolean => {
      return type === 'Missing data';
    };

    // Use all records for calculations (no kpiFilter)
    const filteredRecords = records;

    // Calculate KPI metrics
    const totalQueries = filteredRecords.length;
    const uniqueSubjects = new Set(filteredRecords.map(r => r.subject_id).filter(Boolean)).size;
    const uniqueVisits = new Set(filteredRecords.map(r => r.event_name).filter(Boolean)).size;
    
    // Open Queries: QueryState = 'Query Raised' (or similar)
    const openQueries = filteredRecords.filter(r => isOpenQuery(r.query_state)).length;

    // Closed Queries: QueryState = 'Query Closed' (or similar)
    const closedQueries = filteredRecords.filter(r => isClosedQuery(r.query_state)).length;

    // Resolved Queries: QueryState = 'Query Resolved' (or similar)
    const resolvedQueries = filteredRecords.filter(r => isResolvedQuery(r.query_state)).length;

    // Missing Data Count: QueryType contains 'Missing'
    const missingDataCount = filteredRecords.filter(r => isMissingDataType(r.query_type)).length;

    // Overdue: Open queries where DateTime > 30 days ago
    const overdue = filteredRecords.filter(r => {
      const dateTime = r.date_time ? new Date(r.date_time) : null;
      const now = new Date();
      if (dateTime && isOpenQuery(r.query_state) && !isNaN(dateTime.getTime())) {
        const daysOpen = Math.floor((now.getTime() - dateTime.getTime()) / (1000 * 60 * 60 * 24));
        return !isNaN(daysOpen) && daysOpen > 30;
      }
      return false;
    }).length;

    // Calculate average resolution time: Days between event_date and date_time for resolved queries
    let totalResolutionDays = 0;
    let resolvedCount = 0;
    filteredRecords.forEach(r => {
      if (isResolvedQuery(r.query_state) && r.date_time) {
        const eventDate = r.event_date ? new Date(r.event_date) : null;
        const resolvedDate = new Date(r.date_time);
        if (eventDate && !isNaN(eventDate.getTime()) && !isNaN(resolvedDate.getTime())) {
          const days = Math.floor((resolvedDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          if (!isNaN(days) && days >= 0) {
            totalResolutionDays += days;
            resolvedCount++;
          }
        }
      }
    });
    const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount) : 0;

    // Calculate chart distributions
    
    // Aging distribution
    const agingRanges = [
      { label: "0-7 days", min: 0, max: 7, count: 0, color: CHART_COLORS[4] },
      { label: "8-14 days", min: 8, max: 14, count: 0, color: CHART_COLORS[3] },
      { label: "15-30 days", min: 15, max: 30, count: 0, color: CHART_COLORS[2] },
      { label: ">30 days", min: 31, max: Infinity, count: 0, color: CHART_COLORS[6] },
    ];

    filteredRecords.forEach(r => {
      const eventDate = r.event_date ? new Date(r.event_date) : null;
      const endDate = r.date_time ? new Date(r.date_time) : new Date();
      if (eventDate && !isNaN(eventDate.getTime()) && !isNaN(endDate.getTime())) {
        const daysOpen = Math.floor((endDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
        if (!isNaN(daysOpen) && daysOpen >= 0) {
          const range = agingRanges.find(rng => daysOpen >= rng.min && daysOpen <= rng.max);
          if (range) range.count++;
        }
      }
    });

    // Queries by role
    const roleCounts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const role = r.query_raised_by_role || 'Unknown';
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    const queriesByRole = Array.from(roleCounts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Queries by site
    const siteCounts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const site = r.site_name || 'Unknown';
      siteCounts.set(site, (siteCounts.get(site) || 0) + 1);
    });
    const queriesBySite = Array.from(siteCounts.entries())
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Queries by type
    const typeCounts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const type = r.query_type || 'Unknown';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    const queriesByType = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Queries by state
    const stateCounts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const state = r.query_state || 'Unknown';
      stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
    });
    const queriesByState = Array.from(stateCounts.entries())
      .map(([state, count], index) => ({ 
        state, 
        count,
        fill: CHART_COLORS[index % CHART_COLORS.length] 
      }));

    // Queries by form
    const formCounts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const form = r.form_name || 'Unknown';
      formCounts.set(form, (formCounts.get(form) || 0) + 1);
    });
    const queriesByForm = Array.from(formCounts.entries())
      .map(([form, count]) => ({ form, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Resolution time by site
    const siteResolutions = new Map<string, { total: number; count: number }>();
    filteredRecords.forEach(r => {
      if (isResolvedQuery(r.query_state) && r.event_date && r.date_time) {
        const site = r.site_name || 'Unknown';
        const eventDate = new Date(r.event_date);
        const resolvedDate = new Date(r.date_time);
        
        if (!isNaN(eventDate.getTime()) && !isNaN(resolvedDate.getTime())) {
          const days = Math.floor((resolvedDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (!isNaN(days) && days >= 0) {
            const current = siteResolutions.get(site) || { total: 0, count: 0 };
            siteResolutions.set(site, {
              total: current.total + days,
              count: current.count + 1,
            });
          }
        }
      }
    });
    const resolutionTimeBySite = Array.from(siteResolutions.entries())
      .map(([site, { total, count }]) => ({
        site,
        avgDays: Math.round(total / count),
      }))
      .sort((a, b) => a.avgDays - b.avgDays)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalQueries,
        uniqueSubjects,
        uniqueVisits,
        openQueries,
        closedQueries,
        resolvedQueries,
        overdue,
        missingDataCount,
        avgResolutionTime,
        queriesPerSubject: uniqueSubjects > 0 ? (totalQueries / uniqueSubjects).toFixed(1) : "0",
        queriesPerVisit: uniqueVisits > 0 ? (totalQueries / uniqueVisits).toFixed(1) : "0",
        agingDistribution: agingRanges,
        queriesByRole,
        queriesBySite,
        queriesByType,
        queriesByState,
        queriesByForm,
        resolutionTimeBySite,
      },
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error calculating aggregations' };
  }
}

/**
 * Get unique filter options for an upload
 */
export async function getECRFFilterOptions(
  uploadId: string
): Promise<ActionResponse<{
  siteNames: string[];
  subjectIds: string[];
  eventNames: string[];
  formNames: string[];
  queryTypes: string[];
  queryStates: string[];
  userRoles: string[];
  queryRaisedByRoles: string[];
}>> {
  try {
    const supabase = await createClient();

    const { data: records, error } = await supabase
      .from('ecrf_records')
      .select('site_name, subject_id, event_name, form_name, query_type, query_state, user_role, query_raised_by_role')
      .eq('upload_id', uploadId);

    if (error) {
      console.error('Error fetching filter options:', error);
      return { success: false, error: 'Failed to fetch filter options' };
    }

    // Extract unique values - filter out null/undefined/empty strings
    const siteNames = Array.from(new Set(records?.map(r => r.site_name).filter(v => v && v.trim() !== '') || [])).sort();
    const subjectIds = Array.from(new Set(records?.map(r => r.subject_id).filter(v => v && v.trim() !== '') || [])).sort();
    const eventNames = Array.from(new Set(records?.map(r => r.event_name).filter(v => v && v.trim() !== '') || [])).sort();
    const formNames = Array.from(new Set(records?.map(r => r.form_name).filter(v => v && v.trim() !== '') || [])).sort();
    const queryTypes = Array.from(new Set(records?.map(r => r.query_type).filter(v => v && v.trim() !== '') || [])).sort();
    const queryStates = Array.from(new Set(records?.map(r => r.query_state).filter(v => v && v.trim() !== '') || [])).sort();
    const userRoles = Array.from(new Set(records?.map(r => r.user_role).filter(v => v && v.trim() !== '') || [])).sort();
    const queryRaisedByRoles = Array.from(new Set(records?.map(r => r.query_raised_by_role).filter(v => v && v.trim() !== '') || [])).sort();

    return {
      success: true,
      data: {
        siteNames,
        subjectIds,
        eventNames,
        formNames,
        queryTypes,
        queryStates,
        userRoles,
        queryRaisedByRoles,
      },
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching filter options' };
  }
}
