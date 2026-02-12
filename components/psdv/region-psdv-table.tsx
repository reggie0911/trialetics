'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings2 } from 'lucide-react';
import type { ClinicalRegionWithRelations } from '@/lib/types/clinical-trials';

interface RegionPsdvTableProps {
  regions: ClinicalRegionWithRelations[];
  isLoading: boolean;
  onEditPsdv: (region: ClinicalRegionWithRelations) => void;
  onRefresh: () => void;
}

export function RegionPsdvTable({
  regions,
  isLoading,
  onEditPsdv,
}: RegionPsdvTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (regions.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No regions found. Create regions in Clinical Trials Management first.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Region Name</TableHead>
            <TableHead className="text-xs">Protocol</TableHead>
            <TableHead className="text-xs">Sites</TableHead>
            <TableHead className="text-xs">Number of Initial Subjects</TableHead>
            <TableHead className="text-xs">Subject Auto-Select Rate (%)</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              <TableCell className="text-xs font-medium">{region.region_name}</TableCell>
              <TableCell className="text-xs">
                {region.protocol?.protocol_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">{region.sites_count || 0}</TableCell>
              <TableCell className="text-xs">
                {region.psdv_initial_subjects_count ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {region.psdv_subject_auto_select_rate != null ? (
                  `${region.psdv_subject_auto_select_rate}%`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditPsdv(region)}>
                      <Settings2 className="mr-2 h-3 w-3" />
                      Edit PSDV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
