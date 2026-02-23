'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  RandomizationList,
  RandomizationAssignment,
  SupplyItem,
  SupplyInventory,
  SupplyShipment,
  CreateRandomizationListInput,
  CreateSupplyItemInput,
  CreateShipmentInput,
  SupplyDashboardData,
} from '@/lib/types/randomization-supply';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

const REVALIDATE_PATH = '/protected/randomization-supply';

// ---- Randomization Lists ----

export async function getRandomizationLists(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<RandomizationList[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('randomization_lists')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RandomizationList[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createRandomizationList(
  input: CreateRandomizationListInput
): Promise<ActionResponse<RandomizationList>> {
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
      .from('randomization_lists')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        name: input.name,
        method: input.method || 'simple',
        block_size: input.block_size ?? null,
        treatment_arms: input.treatment_arms || [],
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as RandomizationList };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteRandomizationList(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('randomization_lists').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Randomization Assignments ----

export async function getRandomizationAssignments(
  listId: string
): Promise<ActionResponse<RandomizationAssignment[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('randomization_assignments')
      .select('*, subject:subjects(id, subject_id)')
      .eq('list_id', listId)
      .order('sequence_number', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as RandomizationAssignment[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Supply Items ----

export async function getSupplyItems(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SupplyItem[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('supply_items')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SupplyItem[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSupplyItem(
  input: CreateSupplyItemInput
): Promise<ActionResponse<SupplyItem>> {
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
      .from('supply_items')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        item_code: input.item_code,
        name: input.name,
        description: input.description || null,
        unit: input.unit || 'unit',
        storage_conditions: input.storage_conditions || null,
        shelf_life_months: input.shelf_life_months ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SupplyItem };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Supply Inventory ----

export async function getSupplyInventory(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SupplyInventory[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('supply_inventory')
      .select('*, supply_item:supply_items(*)')
      .eq('company_id', companyId)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SupplyInventory[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Shipments ----

export async function getSupplyShipments(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SupplyShipment[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('supply_shipments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SupplyShipment[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSupplyShipment(
  input: CreateShipmentInput
): Promise<ActionResponse<SupplyShipment>> {
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
      .from('supply_shipments')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        from_location: input.from_location || null,
        to_site_id: input.to_site_id || null,
        items: input.items || [],
        tracking_number: input.tracking_number || null,
        notes: input.notes || null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: data as SupplyShipment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---- Dashboard ----

export async function getSupplyDashboard(
  companyId: string
): Promise<ActionResponse<SupplyDashboardData>> {
  try {
    const supabase = await createClient();

    const [itemsRes, inventoryRes, shipmentsRes] = await Promise.all([
      supabase.from('supply_items').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('supply_inventory').select('*').eq('company_id', companyId),
      supabase.from('supply_shipments').select('status').eq('company_id', companyId),
    ]);

    const inventory = inventoryRes.data || [];
    const shipments = shipmentsRes.data || [];

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = inventory.filter(
      (i: { expiry_date: string | null; status: string }) =>
        i.expiry_date && new Date(i.expiry_date) <= thirtyDaysFromNow && i.status === 'available'
    ).length;

    const availableUnits = inventory.reduce(
      (sum: number, i: { quantity_available: number }) => sum + (i.quantity_available || 0),
      0
    );

    return {
      success: true,
      data: {
        total_items: itemsRes.count || 0,
        total_lots: inventory.length,
        available_units: availableUnits,
        expiring_soon: expiringSoon,
        pending_shipments: shipments.filter((s: { status: string }) => s.status === 'pending').length,
        in_transit_shipments: shipments.filter((s: { status: string }) => s.status === 'in_transit').length,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
