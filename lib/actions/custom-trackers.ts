'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  CustomTrackerDefinition,
  CustomField,
  CustomFieldValue,
  CreateTrackerDefinitionInput,
  CreateCustomFieldInput,
  SetCustomFieldValueInput,
} from '@/lib/types/custom-trackers';

async function getProfileWithCompany(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getTrackerDefinitions(
  companyId: string
): Promise<{ success: boolean; data?: { items: CustomTrackerDefinition[] }; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('custom_tracker_definitions')
      .select('id, company_id, name, description, slug, icon, entity_type, columns, active, created_by_id, created_at, updated_at, created_by:profiles!custom_tracker_definitions_created_by_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data as unknown as CustomTrackerDefinition[]) ?? [] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createTrackerDefinition(
  input: CreateTrackerDefinitionInput
): Promise<{ success: boolean; data?: CustomTrackerDefinition; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfileWithCompany();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('custom_tracker_definitions')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description ?? null,
        slug: input.slug,
        icon: input.icon ?? null,
        entity_type: input.entity_type ?? null,
        columns: [],
        active: true,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true, data: data as unknown as CustomTrackerDefinition };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getCustomFields(
  companyId: string,
  trackerDefinitionId?: string
): Promise<{ success: boolean; data?: CustomField[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('custom_fields')
      .select('id, company_id, tracker_definition_id, field_name, field_type, field_label, options, required, sort_order, created_at')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (trackerDefinitionId) {
      query = query.eq('tracker_definition_id', trackerDefinitionId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as CustomField[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createCustomField(
  input: CreateCustomFieldInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfileWithCompany();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('custom_fields').insert({
      company_id: profile.company_id,
      tracker_definition_id: input.tracker_definition_id,
      field_name: input.field_name,
      field_type: input.field_type,
      field_label: input.field_label,
      options: input.options ?? null,
      required: input.required ?? false,
      sort_order: input.sort_order ?? 0,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/custom-trackers');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getTrackerData(
  companyId: string,
  trackerDefinitionId: string
): Promise<{ success: boolean; data?: { entities: string[]; values: CustomFieldValue[] }; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('custom_field_values')
      .select('id, company_id, tracker_definition_id, entity_id, field_id, value_text, value_number, value_date, value_boolean, value_json, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('tracker_definition_id', trackerDefinitionId);

    if (error) return { success: false, error: error.message };
    const values = (data as unknown as CustomFieldValue[]) ?? [];
    const entities = [...new Set(values.map((v) => v.entity_id))];
    return { success: true, data: { entities, values } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function setCustomFieldValue(
  input: SetCustomFieldValueInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfileWithCompany();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('custom_field_values')
      .upsert({
        company_id: profile.company_id,
        tracker_definition_id: input.tracker_definition_id,
        entity_id: input.entity_id,
        field_id: input.field_id,
        value_text: input.value_text ?? null,
        value_number: input.value_number ?? null,
        value_date: input.value_date ?? null,
        value_boolean: input.value_boolean ?? null,
        value_json: input.value_json ?? null,
      }, { onConflict: 'tracker_definition_id,entity_id,field_id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
