'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ResourceAssignment,
  ResourceCapacity,
  ResourceForecast,
  CreateResourceAssignmentInput,
  UpdateResourceAssignmentInput,
  ResourceFilters,
  ResourceUtilizationSummary,
} from '@/lib/types/resources';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getResourceAssignments(
  companyId: string,
  filters?: ResourceFilters
): Promise<ActionResponse<{ items: ResourceAssignment[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('resource_assignments')
      .select(
        '*, profile:profiles!resource_assignments_profile_id_fkey(id, first_name, last_name, email), protocol:clinical_protocols(id, title, protocol_number)',
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.protocol_id) {
      query = query.eq('protocol_id', filters.protocol_id);
    }
    if (filters?.profile_id) {
      query = query.eq('profile_id', filters.profile_id);
    }
    if (filters?.role) {
      query = query.ilike('role', `%${filters.role}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as ResourceAssignment[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createResourceAssignment(
  input: CreateResourceAssignmentInput
): Promise<ActionResponse<ResourceAssignment>> {
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
      .from('resource_assignments')
      .insert({
        company_id: profile.company_id,
        profile_id: input.profile_id,
        protocol_id: input.protocol_id || null,
        role: input.role,
        allocation_percentage: input.allocation_percentage ?? 100,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        status: input.status || 'planned',
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/resources');
    return { success: true, data: data as ResourceAssignment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateResourceAssignment(
  id: string,
  input: UpdateResourceAssignmentInput
): Promise<ActionResponse<ResourceAssignment>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resource_assignments')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/resources');
    return { success: true, data: data as ResourceAssignment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getResourceCapacity(
  companyId: string,
  profileId?: string
): Promise<ActionResponse<ResourceCapacity[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('resource_capacity')
      .select('*, profile:profiles!resource_capacity_profile_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('period_start', { ascending: false })
      .limit(200);

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ResourceCapacity[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateResourceCapacity(
  id: string,
  input: { available_hours?: number; allocated_hours?: number }
): Promise<ActionResponse<ResourceCapacity>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = { ...input };
    if (input.available_hours !== undefined && input.allocated_hours !== undefined && input.available_hours > 0) {
      updateData.utilization_pct = Math.round((input.allocated_hours / input.available_hours) * 100 * 100) / 100;
    }

    const { data, error } = await supabase
      .from('resource_capacity')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/resources');
    return { success: true, data: data as ResourceCapacity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getResourceForecasts(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<ResourceForecast[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('resource_forecasts')
      .select('*, protocol:clinical_protocols(id, title, protocol_number)')
      .eq('company_id', companyId)
      .order('forecast_period_start', { ascending: true })
      .limit(200);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ResourceForecast[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getResourceUtilizationSummary(
  companyId: string
): Promise<ActionResponse<ResourceUtilizationSummary>> {
  try {
    const supabase = await createClient();

    const { data: assignments } = await supabase
      .from('resource_assignments')
      .select('profile_id, allocation_percentage, status')
      .eq('company_id', companyId);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId);

    const allAssignments = assignments || [];
    const allProfiles = profiles || [];
    const activeAssignments = allAssignments.filter(a => a.status === 'active');

    const allocationByProfile = new Map<string, number>();
    for (const a of activeAssignments) {
      const current = allocationByProfile.get(a.profile_id) || 0;
      allocationByProfile.set(a.profile_id, current + (Number(a.allocation_percentage) || 0));
    }

    let fullyAllocated = 0;
    let partiallyAllocated = 0;
    const assignedProfiles = new Set(allocationByProfile.keys());

    for (const [, pct] of allocationByProfile) {
      if (pct >= 100) fullyAllocated++;
      else partiallyAllocated++;
    }

    const unallocated = allProfiles.length - assignedProfiles.size;
    const avgUtil = assignedProfiles.size > 0
      ? Array.from(allocationByProfile.values()).reduce((s, v) => s + v, 0) / assignedProfiles.size
      : 0;

    return {
      success: true,
      data: {
        total_staff: allProfiles.length,
        fully_allocated: fullyAllocated,
        partially_allocated: partiallyAllocated,
        unallocated,
        avg_utilization_pct: Math.round(avgUtil * 100) / 100,
        total_assignments: allAssignments.length,
        active_assignments: activeAssignments.length,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
