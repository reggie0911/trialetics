'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RolePermissionsCard } from '@/components/permissions/role-permissions-card';
import { UserPermissionsCard } from '@/components/permissions/user-permissions-card';
import {
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissionOverrides,
  clearUserOverrides,
  getCompanyUsersForPermissions,
} from '@/lib/actions/permissions';
import type {
  ModulePermission,
  EffectivePermission,
  PermissionOverride,
  UserBasicInfo,
} from '@/lib/types/permissions';
import { toast } from 'sonner';

interface PermissionsPageClientProps {
  companyId: string;
}

export function PermissionsPageClient({ companyId }: PermissionsPageClientProps) {
  const [adminPermissions, setAdminPermissions] = useState<ModulePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<ModulePermission[]>([]);
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);
  const [savingRole, setSavingRole] = useState<'admin' | 'user' | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRolePermissions = useCallback(async () => {
    const [adminRes, userRes] = await Promise.all([
      getRolePermissions(companyId, 'admin'),
      getRolePermissions(companyId, 'user'),
    ]);
    if (adminRes.success && adminRes.data) {
      setAdminPermissions(adminRes.data);
    }
    if (userRes.success && userRes.data) {
      setUserPermissions(userRes.data);
    }
  }, [companyId]);

  const loadUsers = useCallback(async () => {
    const res = await getCompanyUsersForPermissions(companyId);
    if (res.success && res.data) {
      setUsers(res.data);
    }
  }, [companyId]);

  const loadUserPermissions = useCallback(
    async (userId: string) => {
      const res = await getUserPermissions(userId, companyId);
      if (res.success && res.data) {
        setEffectivePermissions(res.data);
      }
    },
    [companyId]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadRolePermissions(), loadUsers()]);
      setLoading(false);
    };
    init();
  }, [loadRolePermissions, loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId);
    } else {
      setEffectivePermissions([]);
    }
  }, [selectedUserId, loadUserPermissions]);

  const handleAdminChange = (
    moduleName: string,
    field: 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setAdminPermissions((prev) =>
      prev.map((p) =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  const handleUserRoleChange = (
    moduleName: string,
    field: 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setUserPermissions((prev) =>
      prev.map((p) =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  const handleEffectiveChange = (
    moduleName: string,
    field: 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setEffectivePermissions((prev) =>
      prev.map((p) =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSaveAdmin = async () => {
    setSavingRole('admin');
    const res = await updateRolePermissions(companyId, 'admin', adminPermissions);
    setSavingRole(null);
    if (res.success) {
      toast.success('Admin permissions saved');
    } else {
      toast.error(res.error ?? 'Failed to save');
    }
  };

  const handleSaveUserRole = async () => {
    setSavingRole('user');
    const res = await updateRolePermissions(companyId, 'user', userPermissions);
    setSavingRole(null);
    if (res.success) {
      toast.success('User role permissions saved');
    } else {
      toast.error(res.error ?? 'Failed to save');
    }
  };

  const handleSaveUserOverrides = async () => {
    if (!selectedUserId) return;
    setSavingUser(true);
    const overrides: PermissionOverride[] = effectivePermissions.map((p) => {
      const rd = p.role_default;
      return {
        module_name: p.module_name,
        is_hidden: p.is_hidden !== rd.is_hidden ? p.is_hidden : null,
        can_read: p.can_read !== rd.can_read ? p.can_read : null,
        can_create: p.can_create !== rd.can_create ? p.can_create : null,
        can_edit: p.can_edit !== rd.can_edit ? p.can_edit : null,
        can_delete: p.can_delete !== rd.can_delete ? p.can_delete : null,
      };
    });
    const res = await updateUserPermissionOverrides(
      selectedUserId,
      companyId,
      overrides
    );
    setSavingUser(false);
    if (res.success) {
      toast.success('User overrides saved');
      await loadUserPermissions(selectedUserId);
    } else {
      toast.error(res.error ?? 'Failed to save');
    }
  };

  const handleResetUserOverrides = async () => {
    if (!selectedUserId) return;
    setSavingUser(true);
    const res = await clearUserOverrides(selectedUserId, companyId);
    setSavingUser(false);
    if (res.success) {
      toast.success('Overrides cleared');
      await loadUserPermissions(selectedUserId);
    } else {
      toast.error(res.error ?? 'Failed to reset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[12px] text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          Module Permissions
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Manage Hidden, Read, Create, Edit, and Delete permissions for all modules
        </p>
      </div>

      <Tabs defaultValue="role-defaults" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="role-defaults">Role Defaults</TabsTrigger>
          <TabsTrigger value="user-overrides">User Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="role-defaults" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RolePermissionsCard
              title="Admin Role Permissions"
              permissions={adminPermissions}
              onChange={handleAdminChange}
              onSave={handleSaveAdmin}
              isSaving={savingRole === 'admin'}
            />
            <RolePermissionsCard
              title="User Role Permissions"
              permissions={userPermissions}
              onChange={handleUserRoleChange}
              onSave={handleSaveUserRole}
              isSaving={savingRole === 'user'}
            />
          </div>
        </TabsContent>

        <TabsContent value="user-overrides">
          <UserPermissionsCard
            users={users}
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            permissions={effectivePermissions}
            onChange={handleEffectiveChange}
            onSave={handleSaveUserOverrides}
            onReset={handleResetUserOverrides}
            isSaving={savingUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
