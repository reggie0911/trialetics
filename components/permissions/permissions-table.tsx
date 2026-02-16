'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ModulePermission } from '@/lib/types/permissions';
import { cn } from '@/lib/utils';

type PermissionField = 'is_hidden' | 'can_read' | 'can_create' | 'can_edit' | 'can_delete';

interface PermissionsTableProps {
  permissions: ModulePermission[];
  onChange: (moduleName: string, field: PermissionField, value: boolean) => void;
  disabled?: boolean;
  showOverrideIndicator?: (moduleName: string, field: string) => boolean;
}

const PERMISSION_COLUMNS: Array<{
  key: PermissionField;
  label: string;
}> = [
  { key: 'is_hidden', label: 'Hidden' },
  { key: 'can_read', label: 'Read' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

export function PermissionsTable({
  permissions,
  onChange,
  disabled = false,
  showOverrideIndicator,
}: PermissionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 bg-muted/80 text-[12px] font-medium">
              Module Name
            </TableHead>
            {PERMISSION_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className="bg-muted/80 text-[12px] font-medium text-center min-w-[70px]"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((perm, idx) => {
            const isHidden = perm.is_hidden;
            return (
              <TableRow
                key={perm.module_name}
                className={cn(
                  'border-b',
                  idx % 2 === 1 && 'bg-muted/30',
                  isHidden && 'opacity-75'
                )}
              >
                <TableCell
                  className={cn(
                    'text-[12px] sticky left-0 bg-background',
                    isHidden && 'text-muted-foreground'
                  )}
                >
                  {perm.module_label}
                </TableCell>
                {PERMISSION_COLUMNS.map((col) => {
                  const value = perm[col.key];
                  if (typeof value !== 'boolean') return null;
                  const isOverride = showOverrideIndicator?.(perm.module_name, col.key);
                  const isDisabled =
                    disabled ||
                    (col.key !== 'is_hidden' && isHidden);
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        'text-center',
                        isOverride && 'bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) =>
                          onChange(perm.module_name, col.key, !!checked)
                        }
                        disabled={isDisabled}
                        className="text-[12px]"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
