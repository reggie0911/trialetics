'use server';

import { createClient } from '@/lib/server';
import type { PermissionKey } from '@/lib/types/rbac';

export async function checkPermission(
  userId: string,
  moduleId: string,
  permissionKey: PermissionKey
): Promise<{ success: boolean; data?: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: override } = await supabase
      .from('user_permission_overrides')
      .select('granted')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .eq('permission_key', permissionKey)
      .single();

    if (override) {
      return { success: true, data: override.granted };
    }

    // Default: allow if no override defined
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
