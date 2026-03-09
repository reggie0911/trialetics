'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, GraduationCap } from 'lucide-react';
import type { ClinicalRegionWithRelations } from '@/lib/types/clinical-trials';
import { deleteClinicalRegion } from '@/lib/actions/clinical-regions';
import { useToast } from '@/hooks/use-toast';
import { RegionTrainingSheet } from '@/components/clinical-training/region-training-sheet';

interface RegionsDataTableProps {
  regions: ClinicalRegionWithRelations[];
  isLoading: boolean;
  onEdit: (region: ClinicalRegionWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
}

/** Returns the country or region name for display in the Country Name column */
function getCountryNameDisplayLabel(region: ClinicalRegionWithRelations): string {
  // region_name stores either a country name or a geographic region (e.g. Europe)
  return region.region_name || '';
}

export function RegionsDataTable({
  regions,
  isLoading,
  onEdit,
  onRefresh,
}: RegionsDataTableProps) {
  const { toast } = useToast();
  const [trainingSheetRegion, setTrainingSheetRegion] = useState<ClinicalRegionWithRelations | null>(null);

  const handleDelete = async (regionId: string) => {
    if (!confirm('Are you sure you want to delete this country? This will also delete all associated sites.')) return;

    const result = await deleteClinicalRegion(regionId);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Country deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete country',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (regions.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No countries found. Click "Add Country" to create one.
      </div>
    );
  }

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Country Name</TableHead>
            <TableHead className="text-xs">Project</TableHead>
            <TableHead className="text-xs">Sites</TableHead>
            <TableHead className="text-xs">Planned Sites</TableHead>
            <TableHead className="text-xs">Planned Subjects</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              <TableCell className="text-xs font-medium">
                {getCountryNameDisplayLabel(region)}
              </TableCell>
              <TableCell className="text-xs">
                {region.protocol?.protocol_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">{region.sites_count || 0}</TableCell>
              <TableCell className="text-xs">
                {region.planned_sites_count || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {region.planned_subjects_count || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTrainingSheetRegion(region)}>
                      <GraduationCap className="mr-2 h-3 w-3" />
                      Training
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(region)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(region.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    {trainingSheetRegion && (
      <RegionTrainingSheet
        open={!!trainingSheetRegion}
        onOpenChange={(open) => !open && setTrainingSheetRegion(null)}
        regionId={trainingSheetRegion.id}
        regionName={trainingSheetRegion.region_name}
      />
    )}
    </>
  );
}
