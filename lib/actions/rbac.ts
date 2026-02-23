'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ModulePermission,
  UserPermissionOverride,
  AccessAuditEntry,
  PermissionKey,
} from '@/lib/types/rbac';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getModulePermissions(
  companyId: string
): Promise<ActionResponse<ModulePermission[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('module_permissions')
      .select(`*, module:modules(id, name, description)`)
      .eq('company_id', companyId)
      .order('module_id')
      .order('permission_key');

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ModulePermission[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getUserPermissions(
  userId: string
): Promise<ActionResponse<UserPermissionOverride[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_permission_overrides')
      .select('*')
      .eq('user_id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as UserPermissionOverride[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function checkPermission(
  userId: string,
  moduleId: string,
  permissionKey: PermissionKey
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      return { success: true, data: true };
    }

    const { data: override } = await supabase
      .from('user_permission_overrides')
      .select('granted')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .eq('permission_key', permissionKey)
      .maybeSingle();

    if (override) {
      return { success: true, data: override.granted };
    }

    const { data: moduleAccess } = await supabase
      .from('user_modules')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle();

    return { success: true, data: !!moduleAccess };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function grantPermission(
  targetUserId: string,
  moduleId: string,
  permissionKey: PermissionKey
): Promise<ActionResponse<UserPermissionOverride>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id || profile.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    const { data, error } = await supabase
      .from('user_permission_overrides')
      .upsert({
        company_id: profile.company_id,
        user_id: targetUserId,
        module_id: moduleId,
        permission_key: permissionKey,
        granted: true,
        granted_by_id: profile.id,
      }, { onConflict: 'company_id,user_id,module_id,permission_key' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase.from('access_audit_log').insert({
      company_id: profile.company_id,
      user_id: profile.id,
      action: 'permission_granted',
      target_user_id: targetUserId,
      module_id: moduleId,
      details: { permission_key: permissionKey },
      performed_by_id: profile.id,
    });

    revalidatePath('/protected/admin');
    return { success: true, data: data as UserPermissionOverride };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function revokePermission(
  targetUserId: string,
  moduleId: string,
  permissionKey: PermissionKey
): Promise<ActionResponse<UserPermissionOverride>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id || profile.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    const { data, error } = await supabase
      .from('user_permission_overrides')
      .upsert({
        company_id: profile.company_id,
        user_id: targetUserId,
        module_id: moduleId,
        permission_key: permissionKey,
        granted: false,
        granted_by_id: profile.id,
      }, { onConflict: 'company_id,user_id,module_id,permission_key' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase.from('access_audit_log').insert({
      company_id: profile.company_id,
      user_id: profile.id,
      action: 'permission_revoked',
      target_user_id: targetUserId,
      module_id: moduleId,
      details: { permission_key: permissionKey },
      performed_by_id: profile.id,
    });

    revalidatePath('/protected/admin');
    return { success: true, data: data as UserPermissionOverride };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getAccessAuditLog(
  companyId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResponse<{ entries: AccessAuditEntry[]; total: number }>> {
  try {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('access_audit_log')
      .select(
        `*, user:profiles!access_audit_log_user_id_fkey(id, first_name, last_name), target_user:profiles!access_audit_log_target_user_id_fkey(id, first_name, last_name), performed_by:profiles!access_audit_log_performed_by_id_fkey(id, first_name, last_name), module:modules(id, name)`,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: { entries: (data || []) as AccessAuditEntry[], total: count || 0 },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
