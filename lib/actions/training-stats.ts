'use server';

import { createClient } from '@/lib/server';
import type { ProtocolTrainingSummary, RegionTrainingSummary } from '@/lib/types/clinical-training';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolTrainingSummary(
  companyId: string
): Promise<ActionResponse<ProtocolTrainingSummary[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_training_summary')
      .select('*')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolTrainingSummary[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getProtocolTrainingSummaryById(
  protocolId: string
): Promise<ActionResponse<ProtocolTrainingSummary | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_training_summary')
      .select('*')
      .eq('protocol_id', protocolId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ProtocolTrainingSummary | null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getRegionTrainingSummary(
  companyId: string
): Promise<ActionResponse<RegionTrainingSummary[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('region_training_summary')
      .select('*')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RegionTrainingSummary[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getRegionTrainingSummaryById(
  regionId: string
): Promise<ActionResponse<RegionTrainingSummary | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('region_training_summary')
      .select('*')
      .eq('region_id', regionId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as RegionTrainingSummary | null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
