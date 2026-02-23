'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type MilestoneType = 'regulatory' | 'enrollment' | 'data' | 'reporting' | 'closeout';
export type MilestoneStatus = 'pending' | 'on_track' | 'at_risk' | 'delayed' | 'completed';

const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  regulatory: 'Regulatory',
  enrollment: 'Enrollment',
  data: 'Data',
  reporting: 'Reporting',
  closeout: 'Closeout',
};

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  completed: 'Completed',
};

export interface ProtocolMilestone {
  id: string;
  protocol_id: string;
  company_id: string;
  name: string;
  milestone_type: MilestoneType;
  baseline_date: string | null;
  forecast_date: string | null;
  actual_date: string | null;
  status: MilestoneStatus;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getProtocolMilestones(protocolId: string): Promise<ActionResponse<ProtocolMilestone[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_milestones')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('sort_order');

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolMilestone[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolMilestone(input: {
  protocol_id: string;
  name: string;
  milestone_type: MilestoneType;
  baseline_date?: string;
  forecast_date?: string;
  notes?: string;
  sort_order?: number;
}): Promise<ActionResponse<ProtocolMilestone>> {
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
      .from('protocol_milestones')
      .insert({ ...input, company_id: profile.company_id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolMilestone };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolMilestone(
  id: string,
  input: Partial<Omit<ProtocolMilestone, 'id' | 'protocol_id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<ActionResponse<ProtocolMilestone>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_milestones')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolMilestone };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolMilestone(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_milestones').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
