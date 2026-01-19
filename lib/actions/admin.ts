'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Types for our responses
export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// User with their module access
export interface UserWithModules {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: string;
  created_at: string | null;
  modules: Array<{
    id: string;
    name: string;
  }>;
}

// Module with user count
export interface ModuleWithUserCount {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
  user_count: number;
}

// =====================================================
// Get Company Users
// =====================================================

/**
 * Get all users in a company with their module access
 */
export async function getCompanyUsers(
  companyId: string
): Promise<ActionResponse<UserWithModules[]>> {
  try {
    const supabase = await createClient();

    // Fetch all profiles for the company
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, display_name, role, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, error: 'Failed to fetch users' };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch user_modules for all users in the company
    const profileIds = profiles.map(p => p.id);
    const { data: userModules, error: modulesError } = await supabase
      .from('user_modules')
      .select('user_id, module_id, modules(id, name)')
      .in('user_id', profileIds);

    if (modulesError) {
      console.error('Error fetching user modules:', modulesError);
      // Continue without module data rather than failing
    }

    // Create a map of user_id to their modules
    const userModulesMap = new Map<string, Array<{ id: string; name: string }>>();
    if (userModules) {
      for (const um of userModules) {
        const modules = userModulesMap.get(um.user_id) || [];
        if (um.modules) {
          const mod = um.modules as unknown as { id: string; name: string };
          modules.push({ id: mod.id, name: mod.name });
        }
        userModulesMap.set(um.user_id, modules);
      }
    }

    // Combine profiles with their modules
    const usersWithModules: UserWithModules[] = profiles.map(profile => ({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      display_name: profile.display_name,
      role: profile.role,
      created_at: profile.created_at,
      modules: userModulesMap.get(profile.id) || [],
    }));

    return { success: true, data: usersWithModules };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching users' };
  }
}

// =====================================================
// Get Active Modules
// =====================================================

/**
 * Get all modules with user count for a company
 */
export async function getActiveModules(
  companyId: string
): Promise<ActionResponse<ModuleWithUserCount[]>> {
  try {
    const supabase = await createClient();

    // Fetch all modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, name, description, active')
      .order('name', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return { success: false, error: 'Failed to fetch modules' };
    }

    if (!modules || modules.length === 0) {
      return { success: true, data: [] };
    }

    // Get all profile IDs in the company
    const { data: companyProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId);

    if (profilesError) {
      console.error('Error fetching company profiles:', profilesError);
    }

    const companyProfileIds = companyProfiles?.map(p => p.id) || [];

    // Count users per module (within the company)
    const { data: userModules, error: countError } = await supabase
      .from('user_modules')
      .select('module_id, user_id')
      .in('user_id', companyProfileIds.length > 0 ? companyProfileIds : ['none']);

    if (countError) {
      console.error('Error counting user modules:', countError);
    }

    // Create a map of module_id to user count
    const moduleUserCount = new Map<string, number>();
    if (userModules) {
      for (const um of userModules) {
        const count = moduleUserCount.get(um.module_id) || 0;
        moduleUserCount.set(um.module_id, count + 1);
      }
    }

    // Combine modules with user count
    const modulesWithCount: ModuleWithUserCount[] = modules.map(mod => ({
      id: mod.id,
      name: mod.name,
      description: mod.description,
      active: mod.active,
      user_count: moduleUserCount.get(mod.id) || 0,
    }));

    return { success: true, data: modulesWithCount };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error fetching modules' };
  }
}

// =====================================================
// Invite User
// =====================================================

/**
 * Invite a new user via email
 * Uses Supabase Admin API to send invitation
 */
export async function inviteUser(
  email: string,
  firstName: string | null,
  lastName: string | null,
  role: 'admin' | 'user',
  moduleIds: string[],
  companyId: string,
  inviterId: string
): Promise<ActionResponse<{ userId: string }>> {
  try {
    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase admin credentials');
      return { success: false, error: 'Server configuration error' };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user with this email already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);

    if (userExists) {
      return { success: false, error: 'A user with this email already exists' };
    }

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
        company_id: companyId,
        role: role,
      },
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return { success: false, error: inviteError.message || 'Failed to send invitation' };
    }

    if (!inviteData?.user) {
      return { success: false, error: 'Failed to create user invitation' };
    }

    const newUserId = inviteData.user.id;

    // Create profile for the invited user
    const supabase = await createClient();
    
    // Get inviter's email for audit
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', inviterId)
      .single();

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: newUserId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        company_id: companyId,
        role: role,
        created_by_id: inviterId,
        creator_email: inviterProfile?.email,
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail completely - user was invited, profile will be created on first login
    }

    // Grant module access if profile was created and modules selected
    if (profileData && moduleIds.length > 0) {
      const moduleInserts = moduleIds.map(moduleId => ({
        user_id: profileData.id,
        module_id: moduleId,
        created_by_id: inviterId,
        creator_email: inviterProfile?.email,
      }));

      const { error: modulesError } = await adminClient
        .from('user_modules')
        .insert(moduleInserts);

      if (modulesError) {
        console.error('Error granting module access:', modulesError);
        // Don't fail - user was invited, modules can be added later
      }
    }

    revalidatePath('/protected/admin');

    return { success: true, data: { userId: newUserId } };
  } catch (error) {
    console.error('Unexpected error inviting user:', error);
    return { success: false, error: 'Unexpected error sending invitation' };
  }
}

// =====================================================
// Update User Role
// =====================================================

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'user',
  companyId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Verify the user belongs to the same company
    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'User not found' };
    }

    if (targetProfile.company_id !== companyId) {
      return { success: false, error: 'Cannot update users from other companies' };
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return { success: false, error: 'Failed to update user role' };
    }

    revalidatePath('/protected/admin');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating role' };
  }
}

// =====================================================
// Remove User from Company
// =====================================================

/**
 * Remove a user from the company (sets company_id to NULL)
 * Note: Does not delete the auth user, just removes from company
 */
export async function removeUserFromCompany(
  userId: string,
  companyId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Verify the user belongs to the same company
    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'User not found' };
    }

    if (targetProfile.company_id !== companyId) {
      return { success: false, error: 'Cannot remove users from other companies' };
    }

    // Remove all user_modules entries
    const { error: modulesError } = await supabase
      .from('user_modules')
      .delete()
      .eq('user_id', userId);

    if (modulesError) {
      console.error('Error removing user modules:', modulesError);
      // Continue anyway
    }

    // Set company_id to NULL (removes from company without deleting profile)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: null, role: 'user' })
      .eq('id', userId);

    if (updateError) {
      console.error('Error removing user from company:', updateError);
      return { success: false, error: 'Failed to remove user from company' };
    }

    revalidatePath('/protected/admin');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error removing user' };
  }
}

// =====================================================
// Update User Module Access
// =====================================================

/**
 * Grant or revoke module access for a user
 */
export async function updateUserModules(
  userId: string,
  moduleIds: string[],
  companyId: string,
  updaterId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Verify the user belongs to the same company
    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: 'User not found' };
    }

    if (targetProfile.company_id !== companyId) {
      return { success: false, error: 'Cannot update users from other companies' };
    }

    // Get updater's email for audit
    const { data: updaterProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', updaterId)
      .single();

    // Delete existing module assignments
    const { error: deleteError } = await supabase
      .from('user_modules')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing modules:', deleteError);
      return { success: false, error: 'Failed to update module access' };
    }

    // Insert new module assignments
    if (moduleIds.length > 0) {
      const moduleInserts = moduleIds.map(moduleId => ({
        user_id: userId,
        module_id: moduleId,
        created_by_id: updaterId,
        creator_email: updaterProfile?.email,
      }));

      const { error: insertError } = await supabase
        .from('user_modules')
        .insert(moduleInserts);

      if (insertError) {
        console.error('Error inserting modules:', insertError);
        return { success: false, error: 'Failed to grant module access' };
      }
    }

    revalidatePath('/protected/admin');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error updating modules' };
  }
}
