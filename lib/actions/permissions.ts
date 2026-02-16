'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ModulePermission,
  EffectivePermission,
  PermissionOverride,
  UserBasicInfo,
} from '@/lib/types/permissions';
import {
  MODULE_ORDER,
  getModuleLabel,
} from '@/lib/types/permissions';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Ensure the current user is an admin in the given company
 */
async function requireAdmin(companyId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single();
  if (!profile || profile.role !== 'admin' || profile.company_id !== companyId) {
    return { ok: false, error: 'Unauthorized' };
  }
  return { ok: true };
}

/**
 * Get role default permissions for a company
 */
export async function getRolePermissions(
  companyId: string,
  role: 'admin' | 'user'
): Promise<ActionResponse<ModulePermission[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('module_permissions')
      .select('module_name, is_hidden, can_read, can_create, can_edit, can_delete')
      .eq('company_id', companyId)
      .eq('role', role);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      // Seed if empty (e.g. new company)
      const { error: seedError } = await supabase.rpc('seed_company_module_permissions', {
        p_company_id: companyId,
      });
      if (seedError) {
        return { success: false, error: 'Failed to seed permissions' };
      }
      const { data: reseeded } = await supabase
        .from('module_permissions')
        .select('module_name, is_hidden, can_read, can_create, can_edit, can_delete')
        .eq('company_id', companyId)
        .eq('role', role);
      if (!reseeded) {
        return { success: true, data: [] };
      }
      const result: ModulePermission[] = MODULE_ORDER.map((name) => {
        const row = reseeded.find((r) => r.module_name === name);
        return {
          module_name: name,
          module_label: getModuleLabel(name),
          is_hidden: row?.is_hidden ?? false,
          can_read: row?.can_read ?? true,
          can_create: row?.can_create ?? false,
          can_edit: row?.can_edit ?? false,
          can_delete: row?.can_delete ?? false,
        };
      });
      return { success: true, data: result };
    }

    const byName = new Map(data.map((r) => [r.module_name, r]));
    const result: ModulePermission[] = MODULE_ORDER.map((name) => {
      const row = byName.get(name);
      return {
        module_name: name,
        module_label: getModuleLabel(name),
        is_hidden: row?.is_hidden ?? false,
        can_read: row?.can_read ?? true,
        can_create: row?.can_create ?? false,
        can_edit: row?.can_edit ?? false,
        can_delete: row?.can_delete ?? false,
      };
    });
    return { success: true, data: result };
  } catch (err) {
    console.error('getRolePermissions error:', err);
    return { success: false, error: 'Failed to fetch role permissions' };
  }
}

/**
 * Update role default permissions
 */
export async function updateRolePermissions(
  companyId: string,
  role: string,
  permissions: ModulePermission[]
): Promise<ActionResponse<void>> {
  const auth = await requireAdmin(companyId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const supabase = await createClient();
    for (const p of permissions) {
      const { error } = await supabase
        .from('module_permissions')
        .upsert(
          {
            company_id: companyId,
            module_name: p.module_name,
            role,
            is_hidden: p.is_hidden,
            can_read: p.can_read,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,module_name,role' }
        );
      if (error) {
        return { success: false, error: error.message };
      }
    }
    revalidatePath('/protected/permissions');
    return { success: true };
  } catch (err) {
    console.error('updateRolePermissions error:', err);
    return { success: false, error: 'Failed to update role permissions' };
  }
}

/**
 * Get effective permissions for a user (role defaults + overrides)
 */
export async function getUserPermissions(
  userId: string,
  companyId: string
): Promise<ActionResponse<EffectivePermission[]>> {
  try {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single();

    if (!profile) {
      return { success: false, error: 'User not found' };
    }

    const role = profile.role as 'admin' | 'user';
    const roleRes = await getRolePermissions(companyId, role);
    if (!roleRes.success || !roleRes.data) {
      return { success: false, error: roleRes.error };
    }

    const { data: overrides } = await supabase
      .from('user_permission_overrides')
      .select('module_name, is_hidden, can_read, can_create, can_edit, can_delete')
      .eq('user_id', userId);

    const overrideMap = new Map(
      (overrides ?? []).map((o) => [o.module_name, o])
    );

    const result: EffectivePermission[] = roleRes.data.map((p) => {
      const ov = overrideMap.get(p.module_name);
      const isOverridden = !!ov;
      const effective: EffectivePermission = {
        ...p,
        is_overridden: isOverridden,
        role_default: {
          is_hidden: p.is_hidden,
          can_read: p.can_read,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        },
      };
      if (ov) {
        effective.is_hidden = ov.is_hidden ?? p.is_hidden;
        effective.can_read = ov.can_read ?? p.can_read;
        effective.can_create = ov.can_create ?? p.can_create;
        effective.can_edit = ov.can_edit ?? p.can_edit;
        effective.can_delete = ov.can_delete ?? p.can_delete;
      }
      return effective;
    });
    return { success: true, data: result };
  } catch (err) {
    console.error('getUserPermissions error:', err);
    return { success: false, error: 'Failed to fetch user permissions' };
  }
}

/**
 * Update user permission overrides
 */
export async function updateUserPermissionOverrides(
  userId: string,
  companyId: string,
  overrides: PermissionOverride[]
): Promise<ActionResponse<void>> {
  const auth = await requireAdmin(companyId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const supabase = await createClient();
    for (const o of overrides) {
      const hasAnyOverride =
        o.is_hidden !== null ||
        o.can_read !== null ||
        o.can_create !== null ||
        o.can_edit !== null ||
        o.can_delete !== null;

      if (hasAnyOverride) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .upsert(
            {
              user_id: userId,
              module_name: o.module_name,
              is_hidden: o.is_hidden,
              can_read: o.can_read,
              can_create: o.can_create,
              can_edit: o.can_edit,
              can_delete: o.can_delete,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,module_name' }
          );
        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        await supabase
          .from('user_permission_overrides')
          .delete()
          .eq('user_id', userId)
          .eq('module_name', o.module_name);
      }
    }
    revalidatePath('/protected/permissions');
    return { success: true };
  } catch (err) {
    console.error('updateUserPermissionOverrides error:', err);
    return { success: false, error: 'Failed to update user overrides' };
  }
}

/**
 * Clear user permission overrides (all or for a specific module)
 */
export async function clearUserOverrides(
  userId: string,
  companyId: string,
  moduleName?: string
): Promise<ActionResponse<void>> {
  const auth = await requireAdmin(companyId);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from('user_permission_overrides')
      .delete()
      .eq('user_id', userId);
    if (moduleName) {
      query = query.eq('module_name', moduleName);
    }
    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/protected/permissions');
    return { success: true };
  } catch (err) {
    console.error('clearUserOverrides error:', err);
    return { success: false, error: 'Failed to clear overrides' };
  }
}

/**
 * Get company users for the permissions user selector
 */
export async function getCompanyUsersForPermissions(
  companyId: string
): Promise<ActionResponse<UserBasicInfo[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, display_name, role')
      .eq('company_id', companyId)
      .order('first_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const users: UserBasicInfo[] = (data ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? null,
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      display_name: p.display_name ?? null,
      role: p.role ?? 'user',
    }));
    return { success: true, data: users };
  } catch (err) {
    console.error('getCompanyUsersForPermissions error:', err);
    return { success: false, error: 'Failed to fetch users' };
  }
}
