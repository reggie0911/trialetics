'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionsTable } from '@/components/permissions/permissions-table';
import type { EffectivePermission } from '@/lib/types/permissions';
import type { UserBasicInfo } from '@/lib/types/permissions';
import { Loader2 } from 'lucide-react';

interface UserPermissionsCardProps {
  users: UserBasicInfo[];
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  permissions: EffectivePermission[];
  onChange: (moduleName: string, field: 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

function getUserDisplayLabel(user: UserBasicInfo): string {
  if (user.email) return user.email;
  if (user.display_name) return user.display_name;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  if (name) return name;
  return user.id;
}

export function UserPermissionsCard({
  users,
  selectedUserId,
  onUserChange,
  permissions,
  onChange,
  onSave,
  onReset,
  isSaving = false,
  disabled = false,
}: UserPermissionsCardProps) {
  const selectedUser = users.find((u) => u.id === selectedUserId);

  const showOverrideIndicator = (moduleName: string, field: string) => {
    const perm = permissions.find((p) => p.module_name === moduleName);
    if (!perm?.is_overridden) return false;
    const rd = perm.role_default;
    const fields = ['is_hidden', 'can_read', 'can_create', 'can_edit', 'can_delete'] as const;
    if (!fields.includes(field as (typeof fields)[number])) return false;
    const key = field as (typeof fields)[number];
    return rd[key] !== perm[key];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[20px] font-semibold">
          User Permission Overrides
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Select a user to customize their permissions. Overrides take precedence over role defaults.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-64">
            <label className="text-[12px] font-medium mb-2 block">
              Select User
            </label>
            <Select
              value={selectedUserId ?? ''}
              onValueChange={(v) => onUserChange(v || null)}
            >
              <SelectTrigger className="w-full text-[12px]">
                <SelectValue
                  placeholder="Choose a user..."
                  getDisplayLabel={(value) => {
                    if (!value) return null;
                    const user = users.find((u) => u.id === value);
                    return user ? getUserDisplayLabel(user) : value;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id}
                    className="text-[12px]"
                  >
                    {getUserDisplayLabel(user)}
                    {user.role === 'admin' && (
                      <span className="text-muted-foreground ml-1">(Admin)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUser && (
            <div className="flex gap-2 items-end">
              <Button
                variant="outline"
                onClick={onReset}
                disabled={isSaving || disabled}
                className="text-[12px]"
              >
                Reset to Role Defaults
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving || disabled}
                className="text-[12px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Overrides'
                )}
              </Button>
            </div>
          )}
        </div>
        {selectedUser ? (
          <PermissionsTable
            permissions={permissions}
            onChange={onChange}
            disabled={disabled}
            showOverrideIndicator={showOverrideIndicator}
          />
        ) : (
          <p className="text-[12px] text-muted-foreground py-8 text-center">
            Select a user to view and edit their permission overrides.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
