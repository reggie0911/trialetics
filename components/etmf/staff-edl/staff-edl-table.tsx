'use client';

import { useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toggleStaffEdl } from '@/lib/actions/etmf';
import type { EtmfStaffEdlMatrixRow, EtmfRoleColumn } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface StaffEdlTableProps {
  matrix: EtmfStaffEdlMatrixRow[];
  roles: EtmfRoleColumn[];
  siteId: string;
  isPending: boolean;
  onRefresh: () => void;
}

export function StaffEdlTable({ matrix, roles, siteId, isPending, onRefresh }: StaffEdlTableProps) {
  const [isToggling, startTransition] = useTransition();

  const handleToggle = (tmfRefId: string, roleName: string, currentValue: boolean) => {
    startTransition(async () => {
      const { success, error } = await toggleStaffEdl({
        site_id: siteId,
        tmf_ref_id: tmfRefId,
        role_name: roleName,
        required: !currentValue,
      });

      if (success) {
        onRefresh();
      } else {
        toast.error(error || 'Failed to update');
      }
    });
  };

  if (isPending) {
    return (
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Document Category</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>Version # / Date</TableHead>
              {[1, 2, 3, 4].map((i) => (
                <TableHead key={i} className="text-center">
                  <Skeleton className="h-4 w-20 mx-auto" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Document Category</TableHead>
            <TableHead>Document Name</TableHead>
            <TableHead>Version # / Date</TableHead>
            {roles.map((role) => (
              <TableHead key={role.role_name} className="text-center min-w-[100px]">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium">{role.display_name}:</span>
                  <span className="text-xs text-muted-foreground">{role.count} / {matrix.length}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.map((row, idx) => (
            <TableRow key={row.tmf_ref_id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {row.artifact_name}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {row.recommended_sub_artifact || '-'}
              </TableCell>
              <TableCell>{row.version_date || '-'}</TableCell>
              {roles.map((role) => {
                const isRequired = row.role_toggles[role.role_name] ?? false;
                return (
                  <TableCell key={role.role_name} className="text-center">
                    <Switch
                      checked={isRequired}
                      onCheckedChange={() => handleToggle(row.tmf_ref_id, role.role_name, isRequired)}
                      disabled={isToggling}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {matrix.length === 0 && (
            <TableRow>
              <TableCell colSpan={4 + roles.length} className="text-center py-8 text-muted-foreground">
                No site-level documents found in the TMF reference model.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
