'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings2 } from 'lucide-react';
import { SDV_POLICY_LABELS, SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';

interface SitePsdvTableProps {
  sites: ClinicalSiteWithRelations[];
  isLoading: boolean;
  onEditPsdv: (site: ClinicalSiteWithRelations) => void;
  onRefresh: () => void;
}

export function SitePsdvTable({
  sites,
  isLoading,
  onEditPsdv,
}: SitePsdvTableProps) {
  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>;
  }

  if (sites.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No sites found. Create sites in Clinical Trials Management first.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Site #</TableHead>
            <TableHead className="text-xs">Protocol</TableHead>
            <TableHead className="text-xs">Organization</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">SDV Policy</TableHead>
            <TableHead className="text-xs">Total Requiring SDV</TableHead>
            <TableHead className="text-xs">Initial Subjects</TableHead>
            <TableHead className="text-xs">Auto-Select Rate (%)</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow key={site.id}>
              <TableCell className="text-xs font-medium">
                {site.site_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.protocol?.protocol_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.organization?.name || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {SITE_STATUS_LABELS[site.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {site.sdv_policy ? (
                  <Badge variant="outline" className="text-xs">
                    {SDV_POLICY_LABELS[site.sdv_policy as keyof typeof SDV_POLICY_LABELS]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                {site.total_subjects_requiring_sdv ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.psdv_initial_subjects_count ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.psdv_subject_auto_select_rate != null ? (
                  `${site.psdv_subject_auto_select_rate}%`
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
                    <DropdownMenuItem onClick={() => onEditPsdv(site)}>
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
