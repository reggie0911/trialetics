export const PERMISSION_KEYS = ['view', 'create', 'edit', 'delete', 'export', 'approve'] as const;
export type PermissionKey = typeof PERMISSION_KEYS[number];

export const PERMISSION_KEY_LABELS: Record<PermissionKey, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
};

export const ACCESS_AUDIT_ACTIONS = [
  'permission_granted',
  'permission_revoked',
  'module_access_granted',
  'module_access_revoked',
] as const;
export type AccessAuditAction = typeof ACCESS_AUDIT_ACTIONS[number];

export const ACCESS_AUDIT_ACTION_LABELS: Record<AccessAuditAction, string> = {
  permission_granted: 'Permission Granted',
  permission_revoked: 'Permission Revoked',
  module_access_granted: 'Module Access Granted',
  module_access_revoked: 'Module Access Revoked',
};

export interface ModulePermission {
  id: string;
  company_id: string;
  module_id: string;
  permission_key: PermissionKey;
  label: string;
  description: string | null;
  created_at: string;
  module?: { id: string; name: string; description: string | null } | null;
}

export interface UserPermissionOverride {
  id: string;
  company_id: string;
  user_id: string;
  module_id: string;
  permission_key: string;
  granted: boolean;
  granted_by_id: string | null;
  created_at: string;
}

export interface AccessAuditEntry {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  target_user_id: string | null;
  module_id: string | null;
  details: Record<string, unknown> | null;
  performed_by_id: string | null;
  created_at: string;
  user?: { id: string; first_name: string | null; last_name: string | null } | null;
  target_user?: { id: string; first_name: string | null; last_name: string | null } | null;
  performed_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  module?: { id: string; name: string } | null;
}

export interface UserPermissionMatrix {
  userId: string;
  userName: string;
  userEmail: string;
  permissions: Record<string, Record<string, boolean>>;
}
