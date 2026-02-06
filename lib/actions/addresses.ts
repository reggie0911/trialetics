'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import {
  Address,
  CreateAddressData,
  UpdateAddressData,
} from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================
// GET ADDRESSES BY ENTITY
// =============================================

export async function getAddressesByEntity(
  entityType: 'organization' | 'contact',
  entityId: string
): Promise<ActionResponse<Address[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAddressesByEntity:', error);
    return { success: false, error: 'Failed to fetch addresses' };
  }
}

// =============================================
// CREATE ADDRESS
// =============================================

export async function createAddress(
  data: CreateAddressData
): Promise<ActionResponse<Address>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // If setting as primary, unset other primaries first
    if (data.is_primary) {
      await supabase
        .from('addresses')
        .update({ is_primary: false })
        .eq('entity_type', data.entity_type)
        .eq('entity_id', data.entity_id)
        .eq('is_primary', true);
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        address_type: data.address_type || 'primary',
        street_1: data.street_1 || null,
        street_2: data.street_2 || null,
        city: data.city || null,
        state: data.state || null,
        postal_code: data.postal_code || null,
        country: data.country || 'United States',
        is_primary: data.is_primary || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: address };
  } catch (error) {
    console.error('Error in createAddress:', error);
    return { success: false, error: 'Failed to create address' };
  }
}

// =============================================
// UPDATE ADDRESS
// =============================================

export async function updateAddress(
  data: UpdateAddressData
): Promise<ActionResponse<Address>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { id, ...updateData } = data;

    // If setting as primary, get entity info and unset other primaries
    if (updateData.is_primary) {
      const { data: existingAddress } = await supabase
        .from('addresses')
        .select('entity_type, entity_id')
        .eq('id', id)
        .single();

      if (existingAddress) {
        await supabase
          .from('addresses')
          .update({ is_primary: false })
          .eq('entity_type', existingAddress.entity_type)
          .eq('entity_id', existingAddress.entity_id)
          .eq('is_primary', true)
          .neq('id', id);
      }
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: address };
  } catch (error) {
    console.error('Error in updateAddress:', error);
    return { success: false, error: 'Failed to update address' };
  }
}

// =============================================
// DELETE ADDRESS
// =============================================

export async function deleteAddress(
  addressId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      console.error('Error deleting address:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteAddress:', error);
    return { success: false, error: 'Failed to delete address' };
  }
}
