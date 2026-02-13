'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ProtocolRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProtocolRiskStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface ProtocolRisk {
  id: string;
  company_id: string;
  protocol_id: string;
  title: string;
  description: string | null;
  risk_level: ProtocolRiskLevel | null;
  status: ProtocolRiskStatus;
  identified_date: string | null;
  resolved_date: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolRiskInput {
  protocol_id: string;
  title: string;
  description?: string | null;
  risk_level?: ProtocolRiskLevel | null;
  identified_date?: string | null;
}

export interface UpdateProtocolRiskInput {
  title?: string;
  description?: string | null;
  risk_level?: ProtocolRiskLevel | null;
  status?: ProtocolRiskStatus;
  identified_date?: string | null;
  resolved_date?: string | null;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolRisks(protocolId: string): Promise<ActionResponse<ProtocolRisk[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_risks')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('identified_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolRisk[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolRisk(
  input: CreateProtocolRiskInput
): Promise<ActionResponse<ProtocolRisk>> {
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
      .from('protocol_risks')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        title: input.title,
        description: input.description ?? null,
        risk_level: input.risk_level ?? null,
        identified_date: input.identified_date ?? null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolRisk };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolRisk(
  riskId: string,
  input: UpdateProtocolRiskInput
): Promise<ActionResponse<ProtocolRisk>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.risk_level !== undefined) updateData.risk_level = input.risk_level;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.identified_date !== undefined) updateData.identified_date = input.identified_date;
    if (input.resolved_date !== undefined) updateData.resolved_date = input.resolved_date;

    const { data, error } = await supabase
      .from('protocol_risks')
      .update(updateData)
      .eq('id', riskId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolRisk };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolRisk(riskId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_risks').delete().eq('id', riskId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
