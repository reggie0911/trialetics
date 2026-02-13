'use server';

import { createClient } from '@/lib/server';

export interface ProtocolCostSummary {
  protocol_id: string;
  company_id: string;
  protocol_number: string;
  title: string;
  currency_code: string | null;
  budgeted_cost: number | null;
  revenue: number | null;
  payment_requested_total: number;
  payment_paid_total: number;
  payment_earned_total: number;
  contract_total: number;
  actual_cost: number | null;
  updated_at: string;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolCostSummary(
  protocolId: string
): Promise<ActionResponse<ProtocolCostSummary | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_cost_summary')
      .select('*')
      .eq('protocol_id', protocolId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { success: true, data: null };
      return { success: false, error: error.message };
    }
    return { success: true, data: data as ProtocolCostSummary };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getProtocolCostSummariesForCompany(
  companyId: string
): Promise<ActionResponse<ProtocolCostSummary[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_cost_summary')
      .select('*')
      .eq('company_id', companyId)
      .order('title', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolCostSummary[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
