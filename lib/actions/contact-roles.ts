'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { CtmsRole, ContactRoleAssignment } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Fetch all active CTMS roles from the reference table.
 * Roles are ordered by category and sort_order.
 */
export async function getCtmsRoles(): Promise<ActionResponse<CtmsRole[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('ctms_roles')
      .select('id, slug, name, category, sort_order, is_active')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) {
      console.error('Error fetching CTMS roles:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as CtmsRole[] };
  } catch (err) {
    console.error('Error in getCtmsRoles:', err);
    return { success: false, error: 'Failed to fetch roles' };
  }
}

/**
 * Get all role assignments for a contact.
 */
export async function getContactRoleAssignments(
  contactId: string
): Promise<ActionResponse<ContactRoleAssignment[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('contact_role_assignments')
      .select('id, contact_id, role_id, is_primary, created_at')
      .eq('contact_id', contactId);

    if (error) {
      console.error('Error fetching contact role assignments:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as ContactRoleAssignment[] };
  } catch (err) {
    console.error('Error in getContactRoleAssignments:', err);
    return { success: false, error: 'Failed to fetch role assignments' };
  }
}

/**
 * Replace all role assignments for a contact.
 * Deletes existing assignments and inserts the new set.
 */
export async function setContactRoleAssignments(
  contactId: string,
  roleIds: string[]
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from('contact_role_assignments')
      .delete()
      .eq('contact_id', contactId);

    if (deleteError) {
      console.error('Error deleting contact role assignments:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Insert new assignments (if any)
    if (roleIds.length > 0) {
      const rows = roleIds.map((roleId, index) => ({
        contact_id: contactId,
        role_id: roleId,
        is_primary: index === 0, // First role as primary
      }));

      const { error: insertError } = await supabase
        .from('contact_role_assignments')
        .insert(rows);

      if (insertError) {
        console.error('Error inserting contact role assignments:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath('/protected/contacts-organizations');
    return { success: true };
  } catch (err) {
    console.error('Error in setContactRoleAssignments:', err);
    return { success: false, error: 'Failed to update role assignments' };
  }
}
