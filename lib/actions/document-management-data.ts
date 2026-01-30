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
export interface DocumentFilters {
  documentName?: string;
  documentType?: string;
  status?: string;
  siteName?: string;
  projectId?: string;
  expirationStatus?: string; // 'all', 'expired', 'expiring_soon', 'not_expired'
}

// Aggregations response interface
export interface DocumentAggregations {
  // KPI metrics
  totalDocuments: number;
  approvedDocuments: number;
  underReview: number;
  expiredDocuments: number;
  expiringSoon: number; // ≤30 days
  documentsByType: Array<{ type: string; count: number }>;
  averageDocumentsPerSite: number;
  documentsPendingApproval: number;
  documentsUpdatedThisMonth: number;
  totalFileSizeGB: number;
  
  // Chart data
  documentsByStatus: Array<{ status: string; count: number; fill: string }>;
  documentsByTypeChart: Array<{ type: string; count: number }>;
  documentsBySite: Array<{ site: string; count: number }>;
  expirationTimeline: Array<{ date: string; count: number }>;
  documentsUploadedOverTime: Array<{ date: string; count: number }>;
  approvalStatusBySite: Array<{ site: string; approved: number; pending: number }>;
  documentVersionDistribution: Array<{ version: string; count: number }>;
}

// Document record from CSV
export interface DocumentRecord {
  [key: string]: string | undefined;
}

// =====================================================
// Document Header Mappings
// =====================================================

/**
 * Get Document header mappings for a company
 */
export async function getDocumentHeaderMappings(
  companyId: string
): Promise<ActionResponse<Tables<'document_header_mappings'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_header_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('table_order', { ascending: true });

    if (error) {
      console.error('Error fetching Document header mappings:', error);
      return { success: false, error: 'Failed to fetch Document header mappings' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching Document header mappings' };
  }
}

/**
 * Save Document header mappings for a company (bulk upsert)
 */
export async function saveDocumentHeaderMappings(
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
      .from('document_header_mappings')
      .delete()
      .eq('company_id', companyId);

    // Insert new mappings
    const mappingInserts: TablesInsert<'document_header_mappings'>[] = mappings.map(mapping => ({
      company_id: companyId,
      original_header: mapping.originalHeader,
      customized_header: mapping.customizedHeader,
      table_order: mapping.tableOrder,
    }));

    const { error } = await supabase
      .from('document_header_mappings')
      .insert(mappingInserts);

    if (error) {
      console.error('Error saving Document header mappings:', error);
      return { success: false, error: 'Failed to save Document header mappings' };
    }

    revalidatePath('/protected/document-management');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error saving Document header mappings' };
  }
}

// =====================================================
// Document Uploads
// =====================================================

/**
 * Get Document uploads for a company
 */
export async function getDocumentUploads(
  companyId: string
): Promise<ActionResponse<Tables<'document_uploads'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Document uploads:', error);
      return { success: false, error: 'Failed to fetch Document uploads' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching Document uploads' };
  }
}

/**
 * Upload Document data with records and column configs
 */
export async function uploadDocumentData(
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
    const uploadInsert: TablesInsert<'document_uploads'> = {
      company_id: companyId,
      uploaded_by: uploadedBy,
      file_name: fileName,
      row_count: records.length,
      column_count: columnConfigs.length,
      filter_preferences: {},
    };

    const { data: uploadData, error: uploadError } = await supabase
      .from('document_uploads')
      .insert(uploadInsert)
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating Document upload:', uploadError);
      return { success: false, error: 'Failed to create Document upload' };
    }

    const uploadId = uploadData.id;

    // 2. Insert document records in batches (100 per batch)
    const BATCH_SIZE = 100;
    const normalizedFields = [
      'DocumentName',
      'DocumentType',
      'DocumentCategory',
      'Version',
      'Status',
      'SiteName',
      'ProjectId',
      'UploadDate',
      'ApprovalDate',
      'ExpirationDate',
      'ApprovedBy',
      'FileUrl',
      'FileSize'
    ];
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const recordInserts: TablesInsert<'document_records'>[] = batch.map(record => {
        // Extract normalized fields
        const extraFields: Record<string, string | undefined> = {};
        
        Object.entries(record).forEach(([key, value]) => {
          if (!normalizedFields.includes(key)) {
            extraFields[key] = value;
          }
        });

        // Parse dates
        const uploadDate = record.UploadDate ? new Date(record.UploadDate) : null;
        const approvalDate = record.ApprovalDate ? new Date(record.ApprovalDate) : null;
        const expirationDate = record.ExpirationDate ? new Date(record.ExpirationDate) : null;
        
        // Parse file size (convert to bytes if needed)
        let fileSize: number | null = null;
        if (record.FileSize) {
          const sizeStr = record.FileSize.toString().trim();
          const sizeNum = parseFloat(sizeStr);
          if (!isNaN(sizeNum)) {
            // Assume bytes if no unit, or handle KB/MB/GB
            if (sizeStr.toLowerCase().includes('kb')) {
              fileSize = Math.round(sizeNum * 1024);
            } else if (sizeStr.toLowerCase().includes('mb')) {
              fileSize = Math.round(sizeNum * 1024 * 1024);
            } else if (sizeStr.toLowerCase().includes('gb')) {
              fileSize = Math.round(sizeNum * 1024 * 1024 * 1024);
            } else {
              fileSize = Math.round(sizeNum);
            }
          }
        }

        return {
          upload_id: uploadId,
          document_name: record.DocumentName || null,
          document_type: record.DocumentType || null,
          document_category: record.DocumentCategory || null,
          version: record.Version || null,
          status: record.Status || null,
          site_name: record.SiteName || null,
          project_id: record.ProjectId || null,
          upload_date: uploadDate && !isNaN(uploadDate.getTime()) ? uploadDate.toISOString().split('T')[0] : null,
          approval_date: approvalDate && !isNaN(approvalDate.getTime()) ? approvalDate.toISOString().split('T')[0] : null,
          expiration_date: expirationDate && !isNaN(expirationDate.getTime()) ? expirationDate.toISOString().split('T')[0] : null,
          approved_by: record.ApprovedBy || null,
          file_url: record.FileUrl || null,
          file_size: fileSize,
          extra_fields: extraFields,
        };
      });

      const { error: recordsError } = await supabase
        .from('document_records')
        .insert(recordInserts);

      if (recordsError) {
        console.error('Error inserting Document records:', recordsError);
        // Try to clean up the upload if records failed
        await supabase.from('document_uploads').delete().eq('id', uploadId);
        return { success: false, error: 'Failed to insert Document records' };
      }
    }

    // 3. Insert column configs
    const configInserts: TablesInsert<'document_column_configs'>[] = columnConfigs.map(config => ({
      upload_id: uploadId,
      column_id: config.columnId,
      label: config.label,
      visible: true,
      table_order: config.tableOrder,
    }));

    const { error: configsError } = await supabase
      .from('document_column_configs')
      .insert(configInserts);

    if (configsError) {
      console.error('Error inserting column configs:', configsError);
      // Try to clean up if configs failed
      await supabase.from('document_uploads').delete().eq('id', uploadId);
      return { success: false, error: 'Failed to save column configurations' };
    }

    revalidatePath('/protected/document-management');

    return { success: true, data: uploadId };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error uploading Document data' };
  }
}

/**
 * Delete a Document upload (cascades to records and configs)
 */
export async function deleteDocumentUpload(
  uploadId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('document_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('Error deleting Document upload:', error);
      return { success: false, error: 'Failed to delete Document upload' };
    }

    revalidatePath('/protected/document-management');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error deleting Document upload' };
  }
}

// =====================================================
// Document Records
// =====================================================

/**
 * Get Document records for an upload (with pagination and filters)
 */
export async function getDocumentRecords(
  uploadId: string,
  page: number = 1,
  pageSize: number = 1000,
  filters: DocumentFilters = {}
): Promise<ActionResponse<{ records: Array<Record<string, string | undefined>>; total: number }>> {
  try {
    const supabase = await createClient();

    // Build count query with filters
    let countQuery = supabase
      .from('document_records')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    // Apply filters to count query
    if (filters.documentName) {
      countQuery = countQuery.ilike('document_name', `%${filters.documentName}%`);
    }
    if (filters.documentType) {
      countQuery = countQuery.eq('document_type', filters.documentType);
    }
    if (filters.status) {
      countQuery = countQuery.eq('status', filters.status);
    }
    if (filters.siteName) {
      countQuery = countQuery.eq('site_name', filters.siteName);
    }
    if (filters.projectId) {
      countQuery = countQuery.eq('project_id', filters.projectId);
    }
    if (filters.expirationStatus) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      if (filters.expirationStatus === 'expired') {
        countQuery = countQuery.lt('expiration_date', today);
      } else if (filters.expirationStatus === 'expiring_soon') {
        countQuery = countQuery.gte('expiration_date', today).lte('expiration_date', thirtyDaysStr);
      } else if (filters.expirationStatus === 'not_expired') {
        countQuery = countQuery.gt('expiration_date', thirtyDaysStr);
      }
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting Document records:', countError);
      return { success: false, error: 'Failed to count Document records' };
    }

    // Calculate pagination offset
    const offset = (page - 1) * pageSize;

    // Build records query with filters and pagination
    let recordsQuery = supabase
      .from('document_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(offset, offset + pageSize - 1);

    // Apply same filters to records query
    if (filters.documentName) {
      recordsQuery = recordsQuery.ilike('document_name', `%${filters.documentName}%`);
    }
    if (filters.documentType) {
      recordsQuery = recordsQuery.eq('document_type', filters.documentType);
    }
    if (filters.status) {
      recordsQuery = recordsQuery.eq('status', filters.status);
    }
    if (filters.siteName) {
      recordsQuery = recordsQuery.eq('site_name', filters.siteName);
    }
    if (filters.projectId) {
      recordsQuery = recordsQuery.eq('project_id', filters.projectId);
    }
    if (filters.expirationStatus) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      if (filters.expirationStatus === 'expired') {
        recordsQuery = recordsQuery.lt('expiration_date', today);
      } else if (filters.expirationStatus === 'expiring_soon') {
        recordsQuery = recordsQuery.gte('expiration_date', today).lte('expiration_date', thirtyDaysStr);
      } else if (filters.expirationStatus === 'not_expired') {
        recordsQuery = recordsQuery.gt('expiration_date', thirtyDaysStr);
      }
    }

    const { data, error } = await recordsQuery;

    if (error) {
      console.error('Error fetching Document records:', error);
      return { success: false, error: 'Failed to fetch Document records' };
    }

    // Reconstruct full records from normalized + extra_fields
    const records = (data || []).map(record => {
      const fullRecord: Record<string, string | undefined> = {
        DocumentName: record.document_name || undefined,
        DocumentType: record.document_type || undefined,
        DocumentCategory: record.document_category || undefined,
        Version: record.version || undefined,
        Status: record.status || undefined,
        SiteName: record.site_name || undefined,
        ProjectId: record.project_id || undefined,
        UploadDate: record.upload_date || undefined,
        ApprovalDate: record.approval_date || undefined,
        ExpirationDate: record.expiration_date || undefined,
        ApprovedBy: record.approved_by || undefined,
        FileUrl: record.file_url || undefined,
        FileSize: record.file_size ? record.file_size.toString() : undefined,
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
    return { success: false, error: 'Unexpected error fetching Document records' };
  }
}

// =====================================================
// Document Column Configs
// =====================================================

/**
 * Get column configs for an upload
 */
export async function getDocumentColumnConfigs(
  uploadId: string
): Promise<ActionResponse<Tables<'document_column_configs'>[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_column_configs')
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

// =====================================================
// Document Aggregations & Filter Options
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
export async function getDocumentAggregations(
  uploadId: string,
  filters: DocumentFilters = {}
): Promise<ActionResponse<DocumentAggregations>> {
  try {
    const supabase = await createClient();

    // Build base query with filters
    let baseQuery = supabase
      .from('document_records')
      .select('*')
      .eq('upload_id', uploadId);

    // Apply filters
    if (filters.documentName) {
      baseQuery = baseQuery.ilike('document_name', `%${filters.documentName}%`);
    }
    if (filters.documentType) {
      baseQuery = baseQuery.eq('document_type', filters.documentType);
    }
    if (filters.status) {
      baseQuery = baseQuery.eq('status', filters.status);
    }
    if (filters.siteName) {
      baseQuery = baseQuery.eq('site_name', filters.siteName);
    }
    if (filters.projectId) {
      baseQuery = baseQuery.eq('project_id', filters.projectId);
    }
    if (filters.expirationStatus) {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      if (filters.expirationStatus === 'expired') {
        baseQuery = baseQuery.lt('expiration_date', today);
      } else if (filters.expirationStatus === 'expiring_soon') {
        baseQuery = baseQuery.gte('expiration_date', today).lte('expiration_date', thirtyDaysStr);
      } else if (filters.expirationStatus === 'not_expired') {
        baseQuery = baseQuery.gt('expiration_date', thirtyDaysStr);
      }
    }

    const { data: records, error } = await baseQuery;

    if (error) {
      console.error('Error fetching Document records for aggregations:', error);
      return { success: false, error: 'Failed to fetch Document records' };
    }

    const allRecords = records || [];
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate KPIs
    const totalDocuments = allRecords.length;
    const approvedDocuments = allRecords.filter(r => r.status?.toLowerCase() === 'approved').length;
    const underReview = allRecords.filter(r => r.status?.toLowerCase() === 'under review').length;
    
    // Expiration calculations
    const expiredDocuments = allRecords.filter(r => {
      if (!r.expiration_date) return false;
      const expDate = new Date(r.expiration_date);
      return expDate < today;
    }).length;
    
    const expiringSoon = allRecords.filter(r => {
      if (!r.expiration_date) return false;
      const expDate = new Date(r.expiration_date);
      return expDate >= today && expDate <= thirtyDaysFromNow;
    }).length;

    // Documents by type
    const typeMap = new Map<string, number>();
    allRecords.forEach(r => {
      const type = r.document_type || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const documentsByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    // Average documents per site
    const siteSet = new Set(allRecords.map(r => r.site_name).filter(Boolean));
    const averageDocumentsPerSite = siteSet.size > 0 ? totalDocuments / siteSet.size : 0;

    // Documents pending approval
    const documentsPendingApproval = allRecords.filter(r => 
      r.status?.toLowerCase() !== 'approved' && r.status?.toLowerCase() !== 'expired'
    ).length;

    // Documents updated this month
    const documentsUpdatedThisMonth = allRecords.filter(r => {
      if (!r.upload_date) return false;
      const uploadDate = new Date(r.upload_date);
      return uploadDate >= thisMonthStart;
    }).length;

    // Total file size in GB
    const totalFileSizeBytes = allRecords.reduce((sum, r) => sum + (r.file_size || 0), 0);
    const totalFileSizeGB = totalFileSizeBytes / (1024 * 1024 * 1024);

    // Chart data: Documents by Status
    const statusMap = new Map<string, number>();
    allRecords.forEach(r => {
      const status = r.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const documentsByStatus = Array.from(statusMap.entries()).map(([status, count], index) => ({
      status,
      count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    // Chart data: Documents by Site (Top 10)
    const siteMap = new Map<string, number>();
    allRecords.forEach(r => {
      const site = r.site_name || 'Unknown';
      siteMap.set(site, (siteMap.get(site) || 0) + 1);
    });
    const documentsBySite = Array.from(siteMap.entries())
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Chart data: Expiration Timeline (group by month)
    const expirationMap = new Map<string, number>();
    allRecords.forEach(r => {
      if (r.expiration_date) {
        const expDate = new Date(r.expiration_date);
        const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        expirationMap.set(monthKey, (expirationMap.get(monthKey) || 0) + 1);
      }
    });
    const expirationTimeline = Array.from(expirationMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Chart data: Documents Uploaded Over Time (group by month)
    const uploadMap = new Map<string, number>();
    allRecords.forEach(r => {
      if (r.upload_date) {
        const uploadDate = new Date(r.upload_date);
        const monthKey = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}`;
        uploadMap.set(monthKey, (uploadMap.get(monthKey) || 0) + 1);
      }
    });
    const documentsUploadedOverTime = Array.from(uploadMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Chart data: Approval Status by Site
    const siteApprovalMap = new Map<string, { approved: number; pending: number }>();
    allRecords.forEach(r => {
      const site = r.site_name || 'Unknown';
      const current = siteApprovalMap.get(site) || { approved: 0, pending: 0 };
      if (r.status?.toLowerCase() === 'approved') {
        current.approved++;
      } else {
        current.pending++;
      }
      siteApprovalMap.set(site, current);
    });
    const approvalStatusBySite = Array.from(siteApprovalMap.entries())
      .map(([site, counts]) => ({ site, ...counts }))
      .sort((a, b) => (b.approved + b.pending) - (a.approved + a.pending))
      .slice(0, 10);

    // Chart data: Document Version Distribution
    const versionMap = new Map<string, number>();
    allRecords.forEach(r => {
      const version = r.version || 'Unknown';
      versionMap.set(version, (versionMap.get(version) || 0) + 1);
    });
    const documentVersionDistribution = Array.from(versionMap.entries())
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const aggregations: DocumentAggregations = {
      totalDocuments,
      approvedDocuments,
      underReview,
      expiredDocuments,
      expiringSoon,
      documentsByType,
      averageDocumentsPerSite,
      documentsPendingApproval,
      documentsUpdatedThisMonth,
      totalFileSizeGB,
      documentsByStatus,
      documentsByTypeChart: documentsByType.slice(0, 10), // Top 10 for chart
      documentsBySite,
      expirationTimeline,
      documentsUploadedOverTime,
      approvalStatusBySite,
      documentVersionDistribution,
    };

    return { success: true, data: aggregations };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching Document aggregations' };
  }
}

/**
 * Get unique filter values for dropdowns
 */
export async function getDocumentFilterOptions(
  uploadId: string
): Promise<ActionResponse<{
  documentTypes: string[];
  statuses: string[];
  siteNames: string[];
  projectIds: string[];
}>> {
  try {
    const supabase = await createClient();

    const { data: records, error } = await supabase
      .from('document_records')
      .select('document_type, status, site_name, project_id')
      .eq('upload_id', uploadId);

    if (error) {
      console.error('Error fetching filter options:', error);
      return { success: false, error: 'Failed to fetch filter options' };
    }

    const documentTypes = Array.from(new Set(records?.map(r => r.document_type).filter(Boolean) || [])).sort();
    const statuses = Array.from(new Set(records?.map(r => r.status).filter(Boolean) || [])).sort();
    const siteNames = Array.from(new Set(records?.map(r => r.site_name).filter(Boolean) || [])).sort();
    const projectIds = Array.from(new Set(records?.map(r => r.project_id).filter(Boolean) || [])).sort();

    return {
      success: true,
      data: {
        documentTypes,
        statuses,
        siteNames,
        projectIds,
      },
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching filter options' };
  }
}

// =====================================================
// Document File Upload and Viewing
// =====================================================

// Document record input interface
export interface DocumentRecordInput {
  documentName: string;
  documentType: string;
  documentCategory?: string;
  version: string;
  status: string;
  siteName: string;
  projectId?: string;
  uploadDate: string;
  approvalDate?: string;
  expirationDate?: string;
  approvedBy?: string;
  artifactName?: string;
  recommendedSubArtifacts?: string;
}

// Pending document record for staging before upload
export interface PendingDocumentRecord extends DocumentRecordInput {
  tempId: string;          // Temporary UUID for tracking
  file: File;              // The actual file object
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Upload a single document file to Supabase Storage
 */
export async function uploadDocumentFile(
  file: File,
  companyId: string,
  profileId: string
): Promise<ActionResponse<{ filePath: string; fileSize: number }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PDF, DOCX, and XLSX files are allowed.' };
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size exceeds 50MB limit.' };
    }

    // Generate unique file path: {companyId}/{documentId}/{filename}
    const documentId = globalThis.crypto.randomUUID();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${companyId}/${documentId}/${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Failed to upload file: ${uploadError.message}` };
    }

    return { 
      success: true, 
      data: { 
        filePath, 
        fileSize: file.size 
      } 
    };
  } catch (error) {
    console.error('Unexpected error uploading document file:', error);
    return { success: false, error: 'Unexpected error uploading document file' };
  }
}

/**
 * Upload multiple document files to Supabase Storage
 */
export async function uploadDocumentFiles(
  files: File[],
  companyId: string,
  profileId: string
): Promise<ActionResponse<Array<{ filePath: string; fileSize: number; fileName: string; error?: string }>>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const results: Array<{ filePath: string; fileSize: number; fileName: string; error?: string }> = [];
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB

    // Upload files sequentially
    for (const file of files) {
      try {
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
          results.push({
            filePath: '',
            fileSize: 0,
            fileName: file.name,
            error: 'Invalid file type. Only PDF, DOCX, and XLSX files are allowed.'
          });
          continue;
        }

        // Validate file size
        if (file.size > maxSize) {
          results.push({
            filePath: '',
            fileSize: 0,
            fileName: file.name,
            error: 'File size exceeds 50MB limit.'
          });
          continue;
        }

        // Generate unique file path
        const documentId = globalThis.crypto.randomUUID();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${companyId}/${documentId}/${sanitizedFileName}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          results.push({
            filePath: '',
            fileSize: 0,
            fileName: file.name,
            error: uploadError.message
          });
          continue;
        }

        results.push({
          filePath,
          fileSize: file.size,
          fileName: file.name
        });
      } catch (error) {
        results.push({
          filePath: '',
          fileSize: 0,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Unexpected error uploading document files:', error);
    return { success: false, error: 'Unexpected error uploading document files' };
  }
}

/**
 * Create a single document record with metadata
 */
export async function createDocumentRecord(
  data: DocumentRecordInput,
  companyId: string,
  profileId: string,
  filePath: string,
  fileSize: number
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();

    // Create a temporary upload record to link the document record
    const { data: uploadData, error: uploadError } = await supabase
      .from('document_uploads')
      .insert({
        company_id: companyId,
        uploaded_by: profileId,
        file_name: `Document: ${data.documentName}`,
        row_count: 1,
        column_count: 0,
      })
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating upload record:', uploadError);
      return { success: false, error: 'Failed to create upload record' };
    }

    const uploadId = uploadData.id;

    // Create document record
    const extraFields: Record<string, any> = {};
    if (data.artifactName) extraFields.artifactName = data.artifactName;
    if (data.recommendedSubArtifacts) extraFields.recommendedSubArtifacts = data.recommendedSubArtifacts;

    const recordInsert = {
      upload_id: uploadId,
      document_name: data.documentName,
      document_type: data.documentType,
      document_category: data.documentCategory || null,
      version: data.version,
      status: data.status,
      site_name: data.siteName,
      project_id: data.projectId || null,
      upload_date: data.uploadDate ? new Date(data.uploadDate).toISOString().split('T')[0] : null,
      approval_date: data.approvalDate ? new Date(data.approvalDate).toISOString().split('T')[0] : null,
      expiration_date: data.expirationDate ? new Date(data.expirationDate).toISOString().split('T')[0] : null,
      approved_by: data.approvedBy || null,
      file_url: filePath,
      file_size: fileSize,
      extra_fields: extraFields,
    };

    const { data: recordData, error: recordError } = await supabase
      .from('document_records')
      .insert(recordInsert)
      .select('id')
      .single();

    if (recordError || !recordData) {
      // Clean up upload record if document record creation fails
      await supabase.from('document_uploads').delete().eq('id', uploadId);
      console.error('Error creating document record:', recordError);
      return { success: false, error: 'Failed to create document record' };
    }

    return { success: true, data: recordData.id };
  } catch (error) {
    console.error('Unexpected error creating document record:', error);
    return { success: false, error: 'Unexpected error creating document record' };
  }
}

/**
 * Bulk create document records
 */
export async function createDocumentRecords(
  records: Array<DocumentRecordInput & { filePath: string; fileSize: number }>,
  companyId: string,
  profileId: string
): Promise<ActionResponse<{ successCount: number; failedCount: number; errors: Array<{ fileName: string; error: string }> }>> {
  try {
    const supabase = await createClient();

    // Create a single upload record for the bulk upload
    const { data: uploadData, error: uploadError } = await supabase
      .from('document_uploads')
      .insert({
        company_id: companyId,
        uploaded_by: profileId,
        file_name: `Bulk Upload: ${records.length} documents`,
        row_count: records.length,
        column_count: 0,
      })
      .select('id')
      .single();

    if (uploadError || !uploadData) {
      console.error('Error creating upload record:', uploadError);
      return { success: false, error: 'Failed to create upload record' };
    }

    const uploadId = uploadData.id;
    let successCount = 0;
    const errors: Array<{ fileName: string; error: string }> = [];

    // Insert records in batch
    const recordInserts = records.map((data) => {
      const extraFields: Record<string, any> = {};
      if (data.artifactName) extraFields.artifactName = data.artifactName;
      if (data.recommendedSubArtifacts) extraFields.recommendedSubArtifacts = data.recommendedSubArtifacts;

      return {
        upload_id: uploadId,
        document_name: data.documentName,
        document_type: data.documentType,
        document_category: data.documentCategory || null,
        version: data.version,
        status: data.status,
        site_name: data.siteName,
        project_id: data.projectId || null,
        upload_date: data.uploadDate ? new Date(data.uploadDate).toISOString().split('T')[0] : null,
        approval_date: data.approvalDate ? new Date(data.approvalDate).toISOString().split('T')[0] : null,
        expiration_date: data.expirationDate ? new Date(data.expirationDate).toISOString().split('T')[0] : null,
        approved_by: data.approvedBy || null,
        file_url: data.filePath,
        file_size: data.fileSize,
        extra_fields: extraFields,
      };
    });

    const { error: insertError } = await supabase
      .from('document_records')
      .insert(recordInserts);

    if (insertError) {
      // Clean up upload record if insert fails
      await supabase.from('document_uploads').delete().eq('id', uploadId);
      console.error('Error bulk creating document records:', insertError);
      return { 
        success: false, 
        error: 'Failed to create document records',
        data: {
          successCount: 0,
          failedCount: records.length,
          errors: records.map(r => ({ fileName: r.documentName, error: insertError.message }))
        }
      };
    }

    successCount = records.length;

    return { 
      success: true, 
      data: { 
        successCount, 
        failedCount: errors.length, 
        errors 
      } 
    };
  } catch (error) {
    console.error('Unexpected error bulk creating document records:', error);
    return { success: false, error: 'Unexpected error bulk creating document records' };
  }
}

/**
 * Get signed URL for viewing a document
 */
export async function getDocumentSignedUrl(
  filePath: string
): Promise<ActionResponse<{ url: string; expiresAt: string }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate signed URL (expires in 1 hour)
    const expiresIn = 3600; // 1 hour in seconds
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return { success: false, error: 'Failed to generate document URL' };
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { 
      success: true, 
      data: { 
        url: data.signedUrl, 
        expiresAt 
      } 
    };
  } catch (error) {
    console.error('Unexpected error generating signed URL:', error);
    return { success: false, error: 'Unexpected error generating signed URL' };
  }
}

/**
 * Delete a document file from storage
 */
export async function deleteDocumentFile(
  filePath: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting document file:', error);
      return { success: false, error: `Failed to delete file: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting document file:', error);
    return { success: false, error: 'Unexpected error deleting document file' };
  }
}

/**
 * Delete a document record and its associated file
 */
/**
 * Update a document record
 */
export async function updateDocumentRecord(
  recordId: string,
  updates: Partial<DocumentRecordInput>
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's profile to check company access
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Verify the record exists and belongs to user's company
    const { data: record, error: fetchError } = await supabase
      .from('document_records')
      .select('upload_id, upload:document_uploads!inner(company_id)')
      .eq('id', recordId)
      .single();

    if (fetchError || !record) {
      return { success: false, error: 'Document record not found' };
    }

    // Build update object
    const updateData: Record<string, any> = {};
    
    if (updates.documentName !== undefined) updateData.document_name = updates.documentName || null;
    if (updates.documentType !== undefined) updateData.document_type = updates.documentType || null;
    if (updates.documentCategory !== undefined) updateData.document_category = updates.documentCategory || null;
    if (updates.version !== undefined) updateData.version = updates.version || null;
    if (updates.status !== undefined) updateData.status = updates.status || null;
    if (updates.siteName !== undefined) updateData.site_name = updates.siteName || null;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId || null;
    if (updates.approvedBy !== undefined) updateData.approved_by = updates.approvedBy || null;
    
    // Handle date fields
    if (updates.uploadDate !== undefined) {
      updateData.upload_date = updates.uploadDate ? updates.uploadDate : null;
    }
    if (updates.approvalDate !== undefined) {
      updateData.approval_date = updates.approvalDate ? updates.approvalDate : null;
    }
    if (updates.expirationDate !== undefined) {
      updateData.expiration_date = updates.expirationDate ? updates.expirationDate : null;
    }

    // Update the document record
    const { error: updateError } = await supabase
      .from('document_records')
      .update(updateData)
      .eq('id', recordId);

    if (updateError) {
      console.error('Error updating document record:', updateError);
      return { success: false, error: `Failed to update record: ${updateError.message}` };
    }

    revalidatePath('/protected/document-management/upload');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating document record:', error);
    return { success: false, error: 'Unexpected error updating document record' };
  }
}

export async function deleteDocumentRecord(
  recordId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the document record to find the file path
    const { data: record, error: fetchError } = await supabase
      .from('document_records')
      .select('file_url, upload_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !record) {
      return { success: false, error: 'Document record not found' };
    }

    // Delete the file if it exists
    if (record.file_url) {
      const deleteFileResult = await deleteDocumentFile(record.file_url);
      if (!deleteFileResult.success) {
        // Log error but continue with record deletion
        console.error('Failed to delete file, continuing with record deletion:', deleteFileResult.error);
      }
    }

    // Delete the document record
    const { error: deleteError } = await supabase
      .from('document_records')
      .delete()
      .eq('id', recordId);

    if (deleteError) {
      console.error('Error deleting document record:', deleteError);
      return { success: false, error: `Failed to delete record: ${deleteError.message}` };
    }

    revalidatePath('/protected/document-management/upload');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting document record:', error);
    return { success: false, error: 'Unexpected error deleting document record' };
  }
}

/**
 * Get all document records for a company (for upload page)
 */
export async function getAllDocumentRecordsForCompany(
  companyId: string
): Promise<ActionResponse<Array<Tables<'document_records'>>>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First get all upload IDs for this company
    const { data: uploads, error: uploadsError } = await supabase
      .from('document_uploads')
      .select('id')
      .eq('company_id', companyId);

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
      return { success: false, error: 'Failed to fetch uploads' };
    }

    if (!uploads || uploads.length === 0) {
      return { success: true, data: [] };
    }

    const uploadIds = uploads.map(u => u.id);

    // Get all document records for these uploads
    const { data: records, error } = await supabase
      .from('document_records')
      .select('*')
      .in('upload_id', uploadIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document records:', error);
      return { success: false, error: 'Failed to fetch document records' };
    }

    return { success: true, data: records || [] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching document records' };
  }
}

// =====================================================
// Document Template Management
// =====================================================

/**
 * Import document template from CSV file
 */
export async function importDocumentTemplate(
  companyId: string,
  csvFile: File
): Promise<ActionResponse<{ imported: number; errors: string[] }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Read CSV file
    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, error: 'CSV file must have at least a header row and one data row' };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    const zoneNameIndex = headers.indexOf('Zone Name');
    const sectionNameIndex = headers.indexOf('Section Name');
    const artifactNameIndex = headers.indexOf('Artifact name');
    const recommendedSubArtifactsIndex = headers.indexOf('Recommended Sub-Artifacts');
    const zoneNumberIndex = headers.indexOf('Zone #');
    const sectionNumberIndex = headers.indexOf('Section #');
    const artifactNumberIndex = headers.indexOf('Artifact #');
    const definitionIndex = headers.indexOf('Definition / Purpose');
    const referenceTmfIndex = headers.indexOf('Reference TMF Template');
    const referenceTmfIdIndex = headers.indexOf('Reference TMF Template ID');
    const coreRecommendedIndex = headers.indexOf('Core or Recommended for inclusion');
    const ichCodeIndex = headers.indexOf('ICH Code');
    const datingConventionIndex = headers.indexOf('Dating Convention');

    if (zoneNameIndex === -1 || sectionNameIndex === -1 || artifactNameIndex === -1) {
      return { success: false, error: 'CSV must contain Zone Name, Section Name, and Artifact name columns' };
    }

    const records: Array<{
      company_id: string;
      zone_number: string | null;
      zone_name: string;
      section_number: string | null;
      section_name: string;
      artifact_number: string | null;
      artifact_name: string;
      recommended_sub_artifacts: string | null;
      definition_purpose: string | null;
      reference_tmf_template: string | null;
      reference_tmf_template_id: string | null;
      core_or_recommended: string | null;
      ich_code: string | null;
      dating_convention: string | null;
    }> = [];

    const errors: string[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle CSV parsing (accounting for quoted fields with commas)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const zoneName = values[zoneNameIndex]?.trim();
      const sectionName = values[sectionNameIndex]?.trim();
      const artifactName = values[artifactNameIndex]?.trim();

      if (!zoneName || !sectionName || !artifactName) {
        errors.push(`Row ${i + 1}: Missing required fields (Zone Name, Section Name, or Artifact name)`);
        continue;
      }

      records.push({
        company_id: companyId,
        zone_number: values[zoneNumberIndex]?.trim() || null,
        zone_name: zoneName,
        section_number: values[sectionNumberIndex]?.trim() || null,
        section_name: sectionName,
        artifact_number: values[artifactNumberIndex]?.trim() || null,
        artifact_name: artifactName,
        recommended_sub_artifacts: values[recommendedSubArtifactsIndex]?.trim() || null,
        definition_purpose: values[definitionIndex]?.trim() || null,
        reference_tmf_template: values[referenceTmfIndex]?.trim() || null,
        reference_tmf_template_id: values[referenceTmfIdIndex]?.trim() || null,
        core_or_recommended: values[coreRecommendedIndex]?.trim() || null,
        ich_code: values[ichCodeIndex]?.trim() || null,
        dating_convention: values[datingConventionIndex]?.trim() || null,
      });
    }

    if (records.length === 0) {
      return { success: false, error: 'No valid records found in CSV file' };
    }

    // Insert records, handling duplicates
    // Since we have a unique index with COALESCE, we'll try insert and handle conflicts
    let insertedCount = 0;
    const insertErrors: string[] = [];

    // Batch insert with conflict handling
    // Try inserting all records, then handle any unique violations
    const { error: insertError, data: insertedData } = await supabase
      .from('document_templates')
      .insert(records)
      .select('id');

    if (insertError) {
      // If batch insert fails, try inserting one by one
      for (const record of records) {
        const { error: singleInsertError } = await supabase
          .from('document_templates')
          .insert(record);

        if (singleInsertError) {
          // Check if it's a unique violation (code 23505)
          if (singleInsertError.code === '23505' || singleInsertError.message.includes('duplicate') || singleInsertError.message.includes('unique')) {
            // Try to update the existing record
            // Build query that handles null recommended_sub_artifacts
            let updateQuery = supabase
              .from('document_templates')
              .update(record)
              .eq('company_id', record.company_id)
              .eq('zone_name', record.zone_name)
              .eq('section_name', record.section_name)
              .eq('artifact_name', record.artifact_name);

            if (record.recommended_sub_artifacts) {
              updateQuery = updateQuery.eq('recommended_sub_artifacts', record.recommended_sub_artifacts);
            } else {
              updateQuery = updateQuery.is('recommended_sub_artifacts', null);
            }

            const { error: updateError } = await updateQuery;

            if (updateError) {
              insertErrors.push(`Row: ${record.zone_name}/${record.section_name}/${record.artifact_name} - ${updateError.message}`);
            } else {
              insertedCount++;
            }
          } else {
            insertErrors.push(`Row: ${record.zone_name}/${record.section_name}/${record.artifact_name} - ${singleInsertError.message}`);
          }
        } else {
          insertedCount++;
        }
      }
    } else {
      insertedCount = records.length;
    }

    if (insertedCount === 0 && insertErrors.length > 0) {
      return { 
        success: false, 
        error: `Failed to import template: ${insertErrors[0]}` 
      };
    }

    revalidatePath('/protected/document-management/upload');

    return { 
      success: true, 
      data: { 
        imported: records.length, 
        errors 
      } 
    };
  } catch (error) {
    console.error('Unexpected error importing template:', error);
    return { success: false, error: 'Unexpected error importing template' };
  }
}

/**
 * Seed global TMF template data (accessible to all users)
 * This should be called once to populate the global template data
 */
export async function seedGlobalTemplateData(
  csvFile: File
): Promise<ActionResponse<{ imported: number; errors: string[] }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Read CSV file
    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, error: 'CSV file must have at least a header row and one data row' };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    const zoneNameIndex = headers.indexOf('Zone Name');
    const sectionNameIndex = headers.indexOf('Section Name');
    const artifactNameIndex = headers.indexOf('Artifact name');
    const recommendedSubArtifactsIndex = headers.indexOf('Recommended Sub-Artifacts');
    const zoneNumberIndex = headers.indexOf('Zone #');
    const sectionNumberIndex = headers.indexOf('Section #');
    const artifactNumberIndex = headers.indexOf('Artifact #');
    const definitionIndex = headers.indexOf('Definition / Purpose');
    const referenceTmfIndex = headers.indexOf('Reference TMF Template');
    const referenceTmfIdIndex = headers.indexOf('Reference TMF Template ID');
    const coreRecommendedIndex = headers.indexOf('Core or Recommended for inclusion');
    const ichCodeIndex = headers.indexOf('ICH Code');
    const datingConventionIndex = headers.indexOf('Dating Convention');

    if (zoneNameIndex === -1 || sectionNameIndex === -1 || artifactNameIndex === -1) {
      return { success: false, error: 'CSV must contain Zone Name, Section Name, and Artifact name columns' };
    }

    const records: Array<{
      company_id: string | null;
      zone_number: string | null;
      zone_name: string;
      section_number: string | null;
      section_name: string;
      artifact_number: string | null;
      artifact_name: string;
      recommended_sub_artifacts: string | null;
      definition_purpose: string | null;
      reference_tmf_template: string | null;
      reference_tmf_template_id: string | null;
      core_or_recommended: string | null;
      ich_code: string | null;
      dating_convention: string | null;
    }> = [];

    const errors: string[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle CSV parsing (accounting for quoted fields with commas)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const zoneName = values[zoneNameIndex]?.trim();
      const sectionName = values[sectionNameIndex]?.trim();
      const artifactName = values[artifactNameIndex]?.trim();

      if (!zoneName || !sectionName || !artifactName) {
        errors.push(`Row ${i + 1}: Missing required fields (Zone Name, Section Name, or Artifact name)`);
        continue;
      }

      records.push({
        company_id: null, // NULL for global templates
        zone_number: values[zoneNumberIndex]?.trim() || null,
        zone_name: zoneName,
        section_number: values[sectionNumberIndex]?.trim() || null,
        section_name: sectionName,
        artifact_number: values[artifactNumberIndex]?.trim() || null,
        artifact_name: artifactName,
        recommended_sub_artifacts: values[recommendedSubArtifactsIndex]?.trim() || null,
        definition_purpose: values[definitionIndex]?.trim() || null,
        reference_tmf_template: values[referenceTmfIndex]?.trim() || null,
        reference_tmf_template_id: values[referenceTmfIdIndex]?.trim() || null,
        core_or_recommended: values[coreRecommendedIndex]?.trim() || null,
        ich_code: values[ichCodeIndex]?.trim() || null,
        dating_convention: values[datingConventionIndex]?.trim() || null,
      });
    }

    if (records.length === 0) {
      return { success: false, error: 'No valid records found in CSV file' };
    }

    // Insert records, handling duplicates
    let insertedCount = 0;
    const insertErrors: string[] = [];

    // Batch insert with conflict handling
    const { error: insertError, data: insertedData } = await supabase
      .from('document_templates')
      .insert(records)
      .select('id');

    if (insertError) {
      // If batch insert fails, try inserting one by one
      for (const record of records) {
        const { error: singleInsertError } = await supabase
          .from('document_templates')
          .insert(record);

        if (singleInsertError) {
          // Check if it's a unique violation (code 23505)
          if (singleInsertError.code === '23505' || singleInsertError.message.includes('duplicate') || singleInsertError.message.includes('unique')) {
            // Try to update the existing record
            let updateQuery = supabase
              .from('document_templates')
              .update(record)
              .is('company_id', null)
              .eq('zone_name', record.zone_name)
              .eq('section_name', record.section_name)
              .eq('artifact_name', record.artifact_name);

            if (record.recommended_sub_artifacts) {
              updateQuery = updateQuery.eq('recommended_sub_artifacts', record.recommended_sub_artifacts);
            } else {
              updateQuery = updateQuery.is('recommended_sub_artifacts', null);
            }

            const { error: updateError } = await updateQuery;

            if (updateError) {
              insertErrors.push(`Row: ${record.zone_name}/${record.section_name}/${record.artifact_name} - ${updateError.message}`);
            } else {
              insertedCount++;
            }
          } else {
            insertErrors.push(`Row: ${record.zone_name}/${record.section_name}/${record.artifact_name} - ${singleInsertError.message}`);
          }
        } else {
          insertedCount++;
        }
      }
    } else {
      insertedCount = records.length;
    }

    if (insertedCount === 0 && insertErrors.length > 0) {
      return { 
        success: false, 
        error: `Failed to seed template: ${insertErrors[0]}` 
      };
    }

    revalidatePath('/protected/document-management/upload');

    return { 
      success: true, 
      data: { 
        imported: insertedCount, 
        errors: [...errors, ...insertErrors]
      } 
    };
  } catch (error) {
    console.error('Unexpected error seeding template:', error);
    return { success: false, error: 'Unexpected error seeding template' };
  }
}

/**
 * Get unique zone names for a company
 */
export async function getTemplateZoneNames(
  companyId: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient();

    // Include both company-specific and global (NULL company_id) templates
    const { data, error } = await supabase
      .from('document_templates')
      .select('zone_name')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('zone_name', { ascending: true });

    if (error) {
      console.error('Error fetching zone names:', error);
      return { success: false, error: 'Failed to fetch zone names' };
    }

    const uniqueZones = Array.from(new Set((data || []).map(r => r.zone_name).filter(Boolean)));
    return { success: true, data: uniqueZones };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching zone names' };
  }
}

/**
 * Get section names filtered by zone name
 */
export async function getTemplateSectionNames(
  companyId: string,
  zoneName: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient();

    // Include both company-specific and global (NULL company_id) templates
    const { data, error } = await supabase
      .from('document_templates')
      .select('section_name')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('zone_name', zoneName)
      .order('section_name', { ascending: true });

    if (error) {
      console.error('Error fetching section names:', error);
      return { success: false, error: 'Failed to fetch section names' };
    }

    const uniqueSections = Array.from(new Set((data || []).map(r => r.section_name).filter(Boolean)));
    return { success: true, data: uniqueSections };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching section names' };
  }
}

/**
 * Get artifact names filtered by zone and section
 */
export async function getTemplateArtifactNames(
  companyId: string,
  zoneName: string,
  sectionName: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient();

    // Include both company-specific and global (NULL company_id) templates
    const { data, error } = await supabase
      .from('document_templates')
      .select('artifact_name')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('zone_name', zoneName)
      .eq('section_name', sectionName)
      .order('artifact_name', { ascending: true });

    if (error) {
      console.error('Error fetching artifact names:', error);
      return { success: false, error: 'Failed to fetch artifact names' };
    }

    const uniqueArtifacts = Array.from(new Set((data || []).map(r => r.artifact_name).filter(Boolean)));
    return { success: true, data: uniqueArtifacts };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching artifact names' };
  }
}

/**
 * Get recommended sub-artifacts filtered by zone, section, and artifact
 */
export async function getTemplateSubArtifacts(
  companyId: string,
  zoneName: string,
  sectionName: string,
  artifactName: string
): Promise<ActionResponse<string[]>> {
  try {
    const supabase = await createClient();

    // Include both company-specific and global (NULL company_id) templates
    const { data, error } = await supabase
      .from('document_templates')
      .select('recommended_sub_artifacts')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('zone_name', zoneName)
      .eq('section_name', sectionName)
      .eq('artifact_name', artifactName)
      .not('recommended_sub_artifacts', 'is', null)
      .order('recommended_sub_artifacts', { ascending: true });

    if (error) {
      console.error('Error fetching sub-artifacts:', error);
      return { success: false, error: 'Failed to fetch sub-artifacts' };
    }

    const uniqueSubArtifacts = Array.from(
      new Set((data || []).map(r => r.recommended_sub_artifacts).filter(Boolean))
    );
    return { success: true, data: uniqueSubArtifacts };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching sub-artifacts' };
  }
}

/**
 * Get template record for auto-naming
 */
export async function getTemplateRecord(
  companyId: string,
  zoneName: string,
  sectionName: string,
  artifactName: string,
  subArtifact?: string
): Promise<ActionResponse<{ artifactName: string; recommendedSubArtifacts: string; suggestedDocumentName: string }>> {
  try {
    const supabase = await createClient();

    // Try company-specific first, then fall back to global (NULL company_id)
    let query = supabase
      .from('document_templates')
      .select('artifact_name, recommended_sub_artifacts')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('zone_name', zoneName)
      .eq('section_name', sectionName)
      .eq('artifact_name', artifactName)
      .order('company_id', { ascending: false, nullsFirst: false }) // Prefer company-specific over global
      .limit(1);

    if (subArtifact) {
      query = query.eq('recommended_sub_artifacts', subArtifact);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return { success: false, error: 'Template record not found' };
    }

    const suggestedName = subArtifact && data.recommended_sub_artifacts
      ? `${data.artifact_name} - ${data.recommended_sub_artifacts}`
      : data.artifact_name;

    return {
      success: true,
      data: {
        artifactName: data.artifact_name,
        recommendedSubArtifacts: data.recommended_sub_artifacts || '',
        suggestedDocumentName: suggestedName,
      },
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching template record' };
  }
}
