'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProtocolGovernance {
  id: string;
  protocol_id: string;
  company_id: string;
  role: string;
  contact_id: string;
  assigned_date: string | null;
  removed_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export async function getProtocolGovernance(protocolId: string): Promise<ActionResponse<ProtocolGovernance[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_governance')
      .select('*, contact:contacts(id, first_name, last_name, email)')
      .eq('protocol_id', protocolId)
      .order('role');

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolGovernance[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolGovernance(input: {
  protocol_id: string;
  role: string;
  contact_id: string;
  notes?: string;
}): Promise<ActionResponse<ProtocolGovernance>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('protocol_governance')
      .insert({ ...input, company_id: profile.company_id })
      .select('*, contact:contacts(id, first_name, last_name, email)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolGovernance };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolGovernance(
  id: string,
  input: { is_active?: boolean; removed_date?: string; notes?: string }
): Promise<ActionResponse<ProtocolGovernance>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_governance')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolGovernance };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolGovernance(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_governance').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
