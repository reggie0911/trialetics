'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  SafetyReconciliationRecord,
  CreateSafetyRecordInput,
  UpdateSafetyRecordInput,
  SafetyFilters,
  SafetyStats,
} from '@/lib/types/safety-integration';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSafetyRecords(
  companyId: string,
  filters?: SafetyFilters
): Promise<ActionResponse<{ items: SafetyReconciliationRecord[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('safety_reconciliation_records')
      .select(
        '*, protocol:clinical_protocols(id, title, protocol_number), subject:subjects(id, subject_id), reporter:profiles!safety_reconciliation_records_reporter_id_fkey(id, first_name, last_name)',
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.event_type && filters.event_type !== 'all') {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters?.reporting_status && filters.reporting_status !== 'all') {
      query = query.eq('reporting_status', filters.reporting_status);
    }
    if (filters?.protocol_id) {
      query = query.eq('protocol_id', filters.protocol_id);
    }
    if (filters?.search) {
      query = query.or(`event_number.ilike.%${filters.search}%,event_description.ilike.%${filters.search}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as SafetyReconciliationRecord[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSafetyRecord(
  input: CreateSafetyRecordInput
): Promise<ActionResponse<SafetyReconciliationRecord>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const eventNumber = `SAF-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('safety_reconciliation_records')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id || null,
        subject_id: input.subject_id || null,
        event_type: input.event_type,
        event_number: eventNumber,
        event_description: input.event_description || null,
        onset_date: input.onset_date || null,
        awareness_date: input.awareness_date || null,
        reported_date: input.reported_date || null,
        reporter_id: profile.id,
        seriousness_criteria: input.seriousness_criteria || [],
        outcome: input.outcome || null,
        narrative: input.narrative || null,
        external_reference: input.external_reference || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations/safety');
    return { success: true, data: data as SafetyReconciliationRecord };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateSafetyRecord(
  id: string,
  input: UpdateSafetyRecordInput
): Promise<ActionResponse<SafetyReconciliationRecord>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('safety_reconciliation_records')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations/safety');
    return { success: true, data: data as SafetyReconciliationRecord };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSafetyStats(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SafetyStats>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('safety_reconciliation_records')
      .select('reporting_status, event_type')
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const records = data || [];
    const stats: SafetyStats = {
      total: records.length,
      draft: records.filter(r => r.reporting_status === 'draft').length,
      submitted: records.filter(r => r.reporting_status === 'submitted').length,
      acknowledged: records.filter(r => r.reporting_status === 'acknowledged').length,
      closed: records.filter(r => r.reporting_status === 'closed').length,
      sae_count: records.filter(r => r.event_type === 'sae').length,
      susar_count: records.filter(r => r.event_type === 'susar').length,
      aesi_count: records.filter(r => r.event_type === 'aesi').length,
    };

    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
