'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface PositionType {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RateList {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  currency_code: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateListItem {
  id: string;
  rate_list_id: string;
  position_type_id: string;
  hourly_rate: number;
  position_type?: PositionType;
}

export async function getPositionTypes(companyId: string): Promise<PositionType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('position_types')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createPositionType(
  companyId: string,
  input: { name: string; code?: string; description?: string; sort_order?: number }
): Promise<{ success: boolean; data?: PositionType; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('position_types')
    .insert({
      company_id: companyId,
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/clinical-trials');
  return { success: true, data: data as PositionType };
}

export async function getRateLists(companyId: string): Promise<RateList[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rate_lists')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function getRateListWithItems(
  rateListId: string
): Promise<{ rateList: RateList; items: RateListItem[] } | null> {
  const supabase = await createClient();
  const { data: rateList, error: rlError } = await supabase
    .from('rate_lists')
    .select('*')
    .eq('id', rateListId)
    .single();
  if (rlError || !rateList) return null;

  const { data: items, error: itemsError } = await supabase
    .from('rate_list_items')
    .select('*, position_types(*)')
    .eq('rate_list_id', rateListId);
  if (itemsError) return { rateList: rateList as RateList, items: [] };

  return {
    rateList: rateList as RateList,
    items: (items || []).map((i) => ({
      id: i.id,
      rate_list_id: i.rate_list_id,
      position_type_id: i.position_type_id,
      hourly_rate: Number(i.hourly_rate),
      position_type: i.position_types as PositionType,
    })),
  };
}

export async function createRateList(
  companyId: string,
  input: { name: string; description?: string; currency_code?: string }
): Promise<{ success: boolean; data?: RateList; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rate_lists')
    .insert({
      company_id: companyId,
      name: input.name,
      description: input.description ?? null,
      currency_code: input.currency_code ?? 'USD',
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/clinical-trials');
  return { success: true, data: data as RateList };
}

export async function upsertRateListItem(
  rateListId: string,
  positionTypeId: string,
  hourlyRate: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('rate_list_items').upsert(
    {
      rate_list_id: rateListId,
      position_type_id: positionTypeId,
      hourly_rate: hourlyRate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'rate_list_id,position_type_id' }
  );
  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/clinical-trials');
  return { success: true };
}
