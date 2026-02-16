'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionsTable } from '@/components/permissions/permissions-table';
import type { ModulePermission } from '@/lib/types/permissions';
import { Loader2 } from 'lucide-react';

interface RolePermissionsCardProps {
  title: string;
  permissions: ModulePermission[];
  onChange: (moduleName: string, field: 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) => void;
  onSave: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

export function RolePermissionsCard({
  title,
  permissions,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
}: RolePermissionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[20px] font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionsTable
          permissions={permissions}
          onChange={onChange}
          disabled={disabled}
        />
        <div className="flex justify-end">
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
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
