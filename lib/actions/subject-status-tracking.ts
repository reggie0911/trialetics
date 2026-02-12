'use server';

import { createClient } from '@/lib/server';
import type {
  SubjectStatusHistory,
} from '@/lib/types/clinical-trials';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET STATUS HISTORY
// =============================================

export async function getStatusHistory(
  companyId: string,
  subjectId: string
): Promise<ActionResponse<SubjectStatusHistory[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subject_status_history')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('company_id', companyId)
      .order('status_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching status history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getStatusHistory:', error);
    return { success: false, error: 'Failed to fetch status history' };
  }
}

// =============================================
// UPDATE PRIMARY STATUS
// =============================================

export async function updatePrimaryStatus(
  companyId: string,
  subjectId: string,
  statusId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Clear all primary flags for this subject
    await supabase
      .from('subject_status_history')
      .update({ is_primary: false })
      .eq('subject_id', subjectId)
      .eq('is_primary', true);

    // Set new primary status
    const { error } = await supabase
      .from('subject_status_history')
      .update({ is_primary: true })
      .eq('id', statusId)
      .eq('subject_id', subjectId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error updating primary status:', error);
      return { success: false, error: error.message };
    }

    // Update subject's status field
    const { data: statusData } = await supabase
      .from('subject_status_history')
      .select('status')
      .eq('id', statusId)
      .single();

    if (statusData) {
      await supabase
        .from('subjects')
        .update({ status: statusData.status })
        .eq('id', subjectId)
        .eq('company_id', companyId);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updatePrimaryStatus:', error);
    return { success: false, error: 'Failed to update primary status' };
  }
}

// =============================================
// GET STATUS ACCRUALS BY SITE
// =============================================

interface StatusAccrual {
  visit_type: string | null;
  status: string;
  total_count: number;
  current_count: number;
}

export async function getStatusAccrualsBySite(
  companyId: string,
  siteId: string
): Promise<ActionResponse<StatusAccrual[]>> {
  try {
    const supabase = await createClient();

    // Get all status history for subjects at this site
    const { data, error } = await supabase
      .from('subject_status_history')
      .select(`
        visit_type,
        status,
        is_primary,
        subject:subjects!inner(site_id)
      `)
      .eq('company_id', companyId)
      .eq('subject.site_id', siteId);

    if (error) {
      console.error('Error fetching status accruals:', error);
      return { success: false, error: error.message };
    }

    // Group and count
    const accruals: Record<string, StatusAccrual> = {};
    
    (data || []).forEach((record: any) => {
      const key = `${record.visit_type || 'null'}-${record.status}`;
      
      if (!accruals[key]) {
        accruals[key] = {
          visit_type: record.visit_type,
          status: record.status,
          total_count: 0,
          current_count: 0,
        };
      }
      
      accruals[key].total_count++;
      if (record.is_primary) {
        accruals[key].current_count++;
      }
    });

    return {
      success: true,
      data: Object.values(accruals),
    };
  } catch (error) {
    console.error('Error in getStatusAccrualsBySite:', error);
    return { success: false, error: 'Failed to fetch status accruals by site' };
  }
}

// =============================================
// GET STATUS ACCRUALS BY REGION
// =============================================

export async function getStatusAccrualsByRegion(
  companyId: string,
  regionId: string
): Promise<ActionResponse<StatusAccrual[]>> {
  try {
    const supabase = await createClient();

    // Get all status history for subjects in sites within this region
    const { data, error } = await supabase
      .from('subject_status_history')
      .select(`
        visit_type,
        status,
        is_primary,
        subject:subjects!inner(
          site:clinical_sites!inner(region_id)
        )
      `)
      .eq('company_id', companyId)
      .eq('subject.site.region_id', regionId);

    if (error) {
      console.error('Error fetching status accruals:', error);
      return { success: false, error: error.message };
    }

    // Group and count
    const accruals: Record<string, StatusAccrual> = {};
    
    (data || []).forEach((record: any) => {
      const key = `${record.visit_type || 'null'}-${record.status}`;
      
      if (!accruals[key]) {
        accruals[key] = {
          visit_type: record.visit_type,
          status: record.status,
          total_count: 0,
          current_count: 0,
        };
      }
      
      accruals[key].total_count++;
      if (record.is_primary) {
        accruals[key].current_count++;
      }
    });

    return {
      success: true,
      data: Object.values(accruals),
    };
  } catch (error) {
    console.error('Error in getStatusAccrualsByRegion:', error);
    return { success: false, error: 'Failed to fetch status accruals by region' };
  }
}

// =============================================
// GET STATUS ACCRUALS BY PROTOCOL
// =============================================

export async function getStatusAccrualsByProtocol(
  companyId: string,
  protocolId: string
): Promise<ActionResponse<StatusAccrual[]>> {
  try {
    const supabase = await createClient();

    // Get all status history for subjects in sites for this protocol
    const { data, error } = await supabase
      .from('subject_status_history')
      .select(`
        visit_type,
        status,
        is_primary,
        subject:subjects!inner(
          site:clinical_sites!inner(protocol_id)
        )
      `)
      .eq('company_id', companyId)
      .eq('subject.site.protocol_id', protocolId);

    if (error) {
      console.error('Error fetching status accruals:', error);
      return { success: false, error: error.message };
    }

    // Group and count
    const accruals: Record<string, StatusAccrual> = {};
    
    (data || []).forEach((record: any) => {
      const key = `${record.visit_type || 'null'}-${record.status}`;
      
      if (!accruals[key]) {
        accruals[key] = {
          visit_type: record.visit_type,
          status: record.status,
          total_count: 0,
          current_count: 0,
        };
      }
      
      accruals[key].total_count++;
      if (record.is_primary) {
        accruals[key].current_count++;
      }
    });

    return {
      success: true,
      data: Object.values(accruals),
    };
  } catch (error) {
    console.error('Error in getStatusAccrualsByProtocol:', error);
    return { success: false, error: 'Failed to fetch status accruals by protocol' };
  }
}
