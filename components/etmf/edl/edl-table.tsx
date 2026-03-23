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
import { toggleEdl } from '@/lib/actions/etmf';
import type { EtmfExpectedDocument } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface EdlTableProps {
  edl: EtmfExpectedDocument[];
  studyId: string | null;
  isPending: boolean;
  onRefresh: () => void;
}

export function EdlTable({ edl, studyId, isPending, onRefresh }: EdlTableProps) {
  const [isToggling, startTransition] = useTransition();

  const handleToggle = (
    tmfRefId: string,
    field: 'edl_yes' | 'site_level_yes' | 'country_level_yes',
    currentValue: boolean
  ) => {
    if (!studyId) return;

    startTransition(async () => {
      const { success, error } = await toggleEdl({
        study_id: studyId,
        tmf_ref_id: tmfRefId,
        field,
        value: !currentValue,
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
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Reference TMF Template ID</TableHead>
              <TableHead>Zone Name</TableHead>
              <TableHead>Section Name</TableHead>
              <TableHead>Artifact Name</TableHead>
              <TableHead>Recommended Subartifacts</TableHead>
              <TableHead className="text-center">EDL Yes Count</TableHead>
              <TableHead className="text-center">Site Level Yes Count</TableHead>
              <TableHead className="text-center">Country Level Yes Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Reference TMF Template ID</TableHead>
            <TableHead>Zone Name</TableHead>
            <TableHead>Section Name</TableHead>
            <TableHead>Artifact Name</TableHead>
            <TableHead>Recommended Subartifacts</TableHead>
            <TableHead className="text-center">EDL Yes Count</TableHead>
            <TableHead className="text-center">Site Level Yes Count</TableHead>
            <TableHead className="text-center">Country Level Yes Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {edl.map((item, idx) => (
            <TableRow key={item.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="font-mono text-xs">
                TMF-{item.tmf_ref_id.slice(0, 12)}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {item.tmf_reference?.zone_name || '-'}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {item.tmf_reference?.section_name || '-'}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {item.tmf_reference?.artifact_name || '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {item.tmf_reference?.recommended_sub_artifact || '-'}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.edl_yes}
                  onCheckedChange={() => handleToggle(item.tmf_ref_id, 'edl_yes', item.edl_yes)}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-primary"
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.site_level_yes}
                  onCheckedChange={() => handleToggle(item.tmf_ref_id, 'site_level_yes', item.site_level_yes)}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-primary"
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.country_level_yes}
                  onCheckedChange={() => handleToggle(item.tmf_ref_id, 'country_level_yes', item.country_level_yes)}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-primary"
                />
              </TableCell>
            </TableRow>
          ))}
          {edl.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No EDL entries found. Click &quot;Initialize EDL&quot; to set up.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
