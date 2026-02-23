'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CustomTrackerDefinition,
  CustomField,
  CustomFieldValue,
  CreateTrackerDefinitionInput,
  UpdateTrackerDefinitionInput,
  CreateCustomFieldInput,
  SetCustomFieldValueInput,
  TrackerFilters,
} from '@/lib/types/custom-trackers';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getTrackerDefinitions(
  companyId: string,
  filters?: TrackerFilters
): Promise<ActionResponse<{ items: CustomTrackerDefinition[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('custom_tracker_definitions')
      .select('*, created_by:profiles!custom_tracker_definitions_created_by_id_fkey(id, first_name, last_name)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as CustomTrackerDefinition[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTrackerDefinition(
  input: CreateTrackerDefinitionInput
): Promise<ActionResponse<CustomTrackerDefinition>> {
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
      .from('custom_tracker_definitions')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description || null,
        slug: input.slug,
        icon: input.icon || null,
        entity_type: input.entity_type || null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true, data: data as CustomTrackerDefinition };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateTrackerDefinition(
  id: string,
  input: UpdateTrackerDefinitionInput
): Promise<ActionResponse<CustomTrackerDefinition>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('custom_tracker_definitions')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true, data: data as CustomTrackerDefinition };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getCustomFields(
  companyId: string,
  trackerDefinitionId?: string
): Promise<ActionResponse<CustomField[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('custom_fields')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (trackerDefinitionId) {
      query = query.eq('tracker_definition_id', trackerDefinitionId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as CustomField[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createCustomField(
  input: CreateCustomFieldInput
): Promise<ActionResponse<CustomField>> {
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
      .from('custom_fields')
      .insert({
        company_id: profile.company_id,
        tracker_definition_id: input.tracker_definition_id,
        field_name: input.field_name,
        field_type: input.field_type,
        field_label: input.field_label,
        options: input.options || null,
        required: input.required || false,
        sort_order: input.sort_order || 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true, data: data as CustomField };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getCustomFieldValues(
  companyId: string,
  trackerDefinitionId: string,
  entityId?: string
): Promise<ActionResponse<CustomFieldValue[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('custom_field_values')
      .select('*')
      .eq('company_id', companyId)
      .eq('tracker_definition_id', trackerDefinitionId);

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as CustomFieldValue[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function setCustomFieldValue(
  input: SetCustomFieldValueInput
): Promise<ActionResponse<CustomFieldValue>> {
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

    const { data: existing } = await supabase
      .from('custom_field_values')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('tracker_definition_id', input.tracker_definition_id)
      .eq('entity_id', input.entity_id)
      .eq('field_id', input.field_id)
      .maybeSingle();

    const valueData = {
      value_text: input.value_text ?? null,
      value_number: input.value_number ?? null,
      value_date: input.value_date ?? null,
      value_boolean: input.value_boolean ?? null,
      value_json: input.value_json ?? null,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('custom_field_values')
        .update(valueData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath('/protected/custom-trackers');
      return { success: true, data: data as CustomFieldValue };
    }

    const { data, error } = await supabase
      .from('custom_field_values')
      .insert({
        company_id: profile.company_id,
        tracker_definition_id: input.tracker_definition_id,
        entity_id: input.entity_id,
        field_id: input.field_id,
        ...valueData,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true, data: data as CustomFieldValue };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTrackerData(
  companyId: string,
  trackerDefinitionId: string,
  page = 1,
  pageSize = 25
): Promise<ActionResponse<{ entities: string[]; values: CustomFieldValue[]; total: number }>> {
  try {
    const supabase = await createClient();

    const { data: allValues, error } = await supabase
      .from('custom_field_values')
      .select('*')
      .eq('company_id', companyId)
      .eq('tracker_definition_id', trackerDefinitionId);

    if (error) return { success: false, error: error.message };

    const entityIds = [...new Set((allValues || []).map(v => v.entity_id))];
    const total = entityIds.length;
    const from = (page - 1) * pageSize;
    const pagedEntities = entityIds.slice(from, from + pageSize);

    const pagedValues = (allValues || []).filter(v => pagedEntities.includes(v.entity_id));

    return {
      success: true,
      data: {
        entities: pagedEntities,
        values: pagedValues as CustomFieldValue[],
        total,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
