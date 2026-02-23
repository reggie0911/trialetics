'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  getModulePermissions,
  getUserPermissions,
  grantPermission,
  revokePermission,
} from '@/lib/actions/rbac';
import { getCompanyUsers } from '@/lib/actions/admin';
import type { UserWithModules } from '@/lib/actions/admin';
import type { ModulePermission, UserPermissionOverride, PermissionKey } from '@/lib/types/rbac';
import { PERMISSION_KEYS, PERMISSION_KEY_LABELS } from '@/lib/types/rbac';

interface PermissionsManagerProps {
  companyId: string;
}

export function PermissionsManager({ companyId }: PermissionsManagerProps) {
  const [users, setUsers] = useState<UserWithModules[]>([]);
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [overrides, setOverrides] = useState<Record<string, UserPermissionOverride[]>>({});
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [usersRes, permsRes] = await Promise.all([
      getCompanyUsers(companyId),
      getModulePermissions(companyId),
    ]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
      const overrideMap: Record<string, UserPermissionOverride[]> = {};
      for (const u of usersRes.data) {
        const res = await getUserPermissions(u.id);
        if (res.success && res.data) {
          overrideMap[u.id] = res.data;
        }
      }
      setOverrides(overrideMap);
    }

    if (permsRes.success && permsRes.data) {
      setModulePermissions(permsRes.data);
      const uniqueModules = Array.from(
        new Map(
          permsRes.data
            .filter((p) => p.module)
            .map((p) => [p.module!.id, { id: p.module!.id, name: p.module!.name }])
        ).values()
      );
      setModules(uniqueModules);
      if (uniqueModules.length > 0 && !selectedModuleId) {
        setSelectedModuleId(uniqueModules[0].id);
      }
    }

    setIsLoading(false);
  }, [companyId, selectedModuleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isGranted = (userId: string, moduleId: string, permKey: string): boolean => {
    const userOverrides = overrides[userId] || [];
    const override = userOverrides.find(
      (o) => o.module_id === moduleId && o.permission_key === permKey
    );
    return override ? override.granted : true;
  };

  const togglePermission = async (userId: string, moduleId: string, permKey: PermissionKey) => {
    const currently = isGranted(userId, moduleId, permKey);
    const result = currently
      ? await revokePermission(userId, moduleId, permKey)
      : await grantPermission(userId, moduleId, permKey);

    if (result.success) {
      toast({ title: currently ? 'Permission revoked' : 'Permission granted' });
      loadData();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading permissions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permission Matrix</CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModuleId(m.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedModuleId === m.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              {m.name.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {selectedModuleId && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">User</th>
                  {PERMISSION_KEYS.map((key) => (
                    <th key={key} className="text-center p-2 font-medium">
                      {PERMISSION_KEY_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </td>
                    {PERMISSION_KEYS.map((key) => (
                      <td key={key} className="text-center p-2">
                        <Checkbox
                          checked={isGranted(user.id, selectedModuleId, key)}
                          onCheckedChange={() => togglePermission(user.id, selectedModuleId, key)}
                          disabled={user.role === 'admin'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {modules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No module permissions configured. Permission records are created when modules are seeded.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
