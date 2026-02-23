'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ReconciliationRecord,
  CreateReconciliationRecordInput,
  UpdateReconciliationRecordInput,
} from '@/lib/types/reconciliation';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getReconciliationRecords(
  companyId: string,
  filters?: {
    protocolId?: string;
    siteId?: string;
    matchStatus?: string;
    documentType?: string;
  }
): Promise<ActionResponse<ReconciliationRecord[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('reconciliation_records')
      .select('*, protocol:clinical_protocols(id, title, protocol_number), site:clinical_sites(id, site_number, organization:organizations(name))')
      .eq('company_id', companyId)
      .order('last_checked_date', { ascending: false, nullsFirst: false });

    if (filters?.protocolId) query = query.eq('protocol_id', filters.protocolId);
    if (filters?.siteId) query = query.eq('site_id', filters.siteId);
    if (filters?.matchStatus) query = query.eq('match_status', filters.matchStatus);
    if (filters?.documentType) query = query.eq('document_type', filters.documentType);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ReconciliationRecord[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createReconciliationRecord(
  input: CreateReconciliationRecordInput
): Promise<ActionResponse<ReconciliationRecord>> {
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

    const { data, error } = await supabase
      .from('reconciliation_records')
      .insert({
        ...input,
        company_id: profile.company_id,
        last_checked_date: input.last_checked_date ?? new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/document-management/reconciliation');
    return { success: true, data: data as ReconciliationRecord };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateReconciliationRecord(
  id: string,
  input: UpdateReconciliationRecordInput
): Promise<ActionResponse<ReconciliationRecord>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reconciliation_records')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/document-management/reconciliation');
    return { success: true, data: data as ReconciliationRecord };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getExpiringDocuments(
  companyId: string,
  daysAhead = 30,
  protocolId?: string
): Promise<ActionResponse<ReconciliationRecord[]>> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureStr = futureDate.toISOString().split('T')[0];

    let query = supabase
      .from('reconciliation_records')
      .select('*, protocol:clinical_protocols(id, title, protocol_number), site:clinical_sites(id, site_number, organization:organizations(name))')
      .eq('company_id', companyId)
      .or(`sponsor_expiration_date.gte.${today},site_expiration_date.gte.${today}`)
      .or(`sponsor_expiration_date.lte.${futureStr},site_expiration_date.lte.${futureStr}`)
      .order('sponsor_expiration_date', { ascending: true, nullsFirst: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const records = (data || []) as ReconciliationRecord[];
    const filtered = records.filter((r) => {
      const sponsorExp = r.sponsor_expiration_date;
      const siteExp = r.site_expiration_date;
      const sponsorExpiring = sponsorExp && sponsorExp >= today && sponsorExp <= futureStr;
      const siteExpiring = siteExp && siteExp >= today && siteExp <= futureStr;
      return sponsorExpiring || siteExpiring;
    });

    return { success: true, data: filtered };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export interface ReconciliationSummary {
  total: number;
  match: number;
  mismatch: number;
  sponsor_only: number;
  site_only: number;
  byDocumentType: Record<string, { total: number; mismatch: number }>;
}

export async function getReconciliationSummary(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<ReconciliationSummary>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('reconciliation_records')
      .select('match_status, document_type')
      .eq('company_id', companyId);

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const records = data || [];
    const summary: ReconciliationSummary = {
      total: records.length,
      match: records.filter((r) => r.match_status === 'match').length,
      mismatch: records.filter((r) => r.match_status === 'mismatch').length,
      sponsor_only: records.filter((r) => r.match_status === 'sponsor_only').length,
      site_only: records.filter((r) => r.match_status === 'site_only').length,
      byDocumentType: {},
    };

    for (const r of records) {
      const dt = r.document_type || 'Unknown';
      if (!summary.byDocumentType[dt]) {
        summary.byDocumentType[dt] = { total: 0, mismatch: 0 };
      }
      summary.byDocumentType[dt].total++;
      if (r.match_status === 'mismatch') summary.byDocumentType[dt].mismatch++;
    }

    return { success: true, data: summary };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
